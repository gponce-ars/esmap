/*
Name: model_builder.js
GEE_link: https://code.earthengine.google.com/e487228ee5c3a40a5cea9bf1c706c26d?noload=true
Goal: To Build models to scale up three variables across Sandy Loam Upland and Deep: 
  Description: The training points calculated based on each sensor resolution grid is used for
               building a model to predict metrics (LPI | MF | BG). Thresholds are the values used to split the eroded
               and non-eroded pixels. These thresholds are based on the mean of the distribution.
               Once a predicted metric is generated and the threshold applied the eroded and non-eroded pixels are identified 
               and those eroded are used in a spatial connectivity process to generate polygons of 1 ha or larger. 
  Variables:
  - Largest Patch Index (LPI) 
  - Percentage bareground (BG)
  - Mean fetch (MF)
  Outputs:
  - Predicted metric across SLUD for both periods 
  - Eroded areas (1ha or larger) 
  Author: Guillermo Ponce (geponce at arizona.edu)
  Date: 02/12/2023
*/

// LOAD DATASETS ------------------------------------------------------------------------------------------------------------------

// Landsat 
var v_landsat8_col = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

// Sentinel2
var v_sentinel2_col = ee.ImageCollection("COPERNICUS/S2_SR")

// PlanetScope (Data access under request)
var v_planetscope_col = ee.ImageCollection("projects/eminent-tesla-172116/assets/PLANET_SCOPE_SRER")

var v_projG;
var v_attr_name_g;
var v_maxAttr;

// Load training points -----------------------------------------------------------------------------------------------------------
// Source: ECOLOGICAL_STATES/MS_SCRIPTS/calculate_lpi_mf_bg.js
var v_pts_landsat_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_may_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')
var v_pts_landsat_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_sep_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')

var v_pts_sent2_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_may_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')
var v_pts_sent2_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_sep_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')

var v_pts_pscope_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_may_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')
var v_pts_pscope_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_sep_lpi_mf_bg_v2')
                            // .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                            .filter('area_ha >= 0.5')


// Load SLUD ----------------------------------------------------------------------------------------------------------------------
var v_slud = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_sandy_loam')
             .filter('RANGESITES != 18')  // This is needed because the database available has this feature misclassified
             .union()
// Load surveyed polygons 
var v_srer_polys = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_polygons_drone_2019')
                     .filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                    // .filter('POLY_AREA >= 0.5')
// FUNCTIONS DEFINITION ------------------------------------------------------------------------------------------------------------

// Plot histogram out of feature collection
function Plot_Histogram_Fc(v_fc,v_attribute,v_title){
  var histogram = ui.Chart.feature.histogram({
  features: v_fc,
  property: v_attribute
  }).setOptions({
                  title: v_title 
  });
  //print(histogram);
}
// Apply scale factors to surface reflectances and surface temperature bands
function Apply_Scale_Factors(v_img){
  // Bit 0 - Fill
  // Bit 1 - Dilated Cloud
  // Bit 2 - Cirrus
  // Bit 3 - Cloud
  // Bit 4 - Cloud Shadow
  var v_qaMask = v_img.select('QA_PIXEL').bitwiseAnd(parseInt('11111', 2)).eq(0);
  var v_saturationMask = v_img.select('QA_RADSAT').eq(0);
  
  var v_opticalBands = v_img.select('SR_B.').multiply(0.0000275).add(-0.2);
  var v_thermalBands = v_img.select('ST_B.*').multiply(0.00341802).add(149.0);
  return v_img.addBands(v_opticalBands, null, true)
              .addBands(v_thermalBands, null, true)
              .updateMask(v_qaMask)
              .updateMask(v_saturationMask);
}
// Calculate indices for Landsat 8 sensor
function Add_Indices_Landsat(v_img) {
  // Plscope B1 - Red,  B2 - Green, B3 - Blue, B4 - NIR  
  v_img = v_img.addBands(v_img.normalizedDifference(['nir', 'red']).select([0],['NDVI']));

  // ### Adding EVI as a band
  v_img =  v_img.addBands(v_img.expression(
    '(2.5) * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': v_img.select('nir'),//.divide(10000),
      'RED': v_img.select('red'),//.divide(10000),
      'BLUE': v_img.select('blue'),//.divide(10000)
  }).select([0], ['EVI']));

  //2.5 * ((Band 4 – Band 3) / (Band 4 + 6 * Band 3 – 7.5 * Band 1 + 1)).
  // ### Adding EVI2 
    
  v_img =  v_img.addBands(v_img.expression(
    '(2.4) *  ((NIR - RED ) / (RED + 1))', {
      'NIR': v_img.select('nir'),//.divide(10000), 
      'RED': v_img.select('red'),//.divide(10000)
  }).select([0], ['EVI2']));
 
  // ### Add Plant Senescence Reflectance Index
  v_img = v_img.addBands(v_img.expression(
    '(RED - BLUE) / (NIR)', {
      'RED': v_img.select('red'),
      'BLUE': v_img.select('blue'),
      'NIR': v_img.select('nir')
    }).select([0], ['PSRI']));
// # Adding Modified Chlorophyll Absorption in Reflectance Index  (MCARI)
// # MCARI values are not affected by illumination conditions, the background 
// # reflectance from soil and other non-photosynthetic materials observed.
    // v_img =  v_img.addBands(v_img.expression(
    // '((REDGE - RED ) - (0.2 * (REDGE - GREEN))) * (REDGE / RED)', {
    //   'NIR': v_img.select('nir'),//.divide(10000),
    //   'REDGE': v_img.select('rededge'),//.divide(10000),
    //   'GREEN' : v_img.select('green'),//.divide(10000),
    //   'RED' : v_img.select('red')//.divide(10000)
    // }).select([0], ['MCARI']));
    
    return v_img;
}

function Add_Indices_Sent2(v_img) {
  // Plscope B1 - Red,  B2 - Green, B3 - Blue, B4 - NIR  
  v_img = v_img.addBands(v_img.normalizedDifference(['nir', 'red']).select([0],['NDVI']));

// ### Adding EVI as a band
    v_img =  v_img.addBands(v_img.expression(
    '(2.5) * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': v_img.select('nir').divide(10000),
      'RED': v_img.select('red').divide(10000),
      'BLUE': v_img.select('blue').divide(10000)
    }).select([0], ['EVI'])); 
//2.5 * ((Band 4 – Band 3) / (Band 4 + 6 * Band 3 – 7.5 * Band 1 + 1)).
// ### Adding EVI2 
    
    v_img =  v_img.addBands(v_img.expression(
    '(2.4) *  ((NIR - RED ) / (RED + 1))', {
      'NIR': v_img.select('nir').divide(10000), 
      'RED': v_img.select('red').divide(10000)
    }).select([0], ['EVI2']));
 
// # Adding Modified Chlorophyll Absorption in Reflectance Index  (MCARI)
// # MCARI values are not affected by illumination conditions, the background 
// # reflectance from soil and other non-photosynthetic materials observed.
    // img =  img.addBands(img.expression(
    // '((REDGE - RED ) - (0.2 * (REDGE - GREEN))) * (REDGE / RED)', {
    //   'NIR': img.select('nir'),//.divide(10000),
    //   'REDGE': img.select('rededge'),//.divide(10000),
    //   'GREEN' : img.select('green'),//.divide(10000),
    //   'RED' : img.select('red')//.divide(10000)
    // }).select([0], ['MCARI']));
    
    return v_img;
}
// Add Indices for Pscope
function Add_Indices_Pscope(v_img) {
  // Plscope B1 - Red,  B2 - Green, B3 - Blue, B4 - NIR  
  v_img = v_img.addBands(v_img.normalizedDifference(['nir', 'red']).select([0],['NDVI']));

// ### Adding EVI as a band
    v_img =  v_img.addBands(v_img.expression(
    '(2.5) * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', {
      'NIR': v_img.select('nir').divide(10000),
      'RED': v_img.select('red').divide(10000),
      'BLUE': v_img.select('blue').divide(10000)
    }).select([0], ['EVI'])); 
//2.5 * ((Band 4 – Band 3) / (Band 4 + 6 * Band 3 – 7.5 * Band 1 + 1)).
// ### Adding EVI2 
    
    v_img =  v_img.addBands(v_img.expression(
    '(2.4) *  ((NIR - RED ) / (RED + 1))', {
      'NIR': v_img.select('nir').divide(10000), 
      'RED': v_img.select('red').divide(10000)
    }).select([0], ['EVI2']));
 
// # Adding Modified Chlorophyll Absorption in Reflectance Index  (MCARI)
// # MCARI values are not affected by illumination conditions, the background 
// # reflectance from soil and other non-photosynthetic materials observed.
    // img =  img.addBands(img.expression(
    // '((REDGE - RED ) - (0.2 * (REDGE - GREEN))) * (REDGE / RED)', {
    //   'NIR': img.select('nir'),//.divide(10000),
    //   'REDGE': img.select('rededge'),//.divide(10000),
    //   'GREEN' : img.select('green'),//.divide(10000),
    //   'RED' : img.select('red')//.divide(10000)
    // }).select([0], ['MCARI']));
    
    return v_img;
}
// Normalize image
function Normalize_Images(v_image,v_scale){
  var v_bandNames = v_image.bandNames();
  // Compute min and max of the image
  var v_minDict = v_image.reduceRegion({
    reducer: ee.Reducer.min(),
    geometry: v_slud.geometry().bounds(),
    scale: v_proj.nominalScale(),
    maxPixels: 1e13,
    bestEffort: true,
    tileScale: 6
  });
  var v_maxDict = v_image.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: v_slud.geometry().bounds(),
    scale: v_proj.nominalScale(),
    maxPixels: 1e13,
    bestEffort: true,
    tileScale: 6
  });
  var v_mins = ee.Image.constant(v_minDict.values(v_bandNames));
  var v_maxs = ee.Image.constant(v_maxDict.values(v_bandNames));

  var v_normalized = v_image.subtract(v_mins).divide(v_maxs.subtract(v_mins))
  return v_normalized
}
// Normalize the modeled image
function Get_Image_Normalized(v_img) {
    var v_maxValue = v_img.reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: v_slud.geometry(),
      scale: v_img.projection().nominalScale(),
      maxPixels: 1e13,
      bestEffort: true,
      tileScale: 4
    }).get('classification');
  return v_img.divide(ee.Image(ee.Number(v_maxValue))).multiply(100)
}

// Get Scatterplot 
function Plot_Scatterplot_Fc(v_fc, v_xdata, v_ydata, v_main_title, v_xaxis_title, v_yaxis_title) {
  var v_chart = ui.Chart.feature.byFeature({
    features: v_fc,
    xProperty: v_xdata,
    yProperties: [v_ydata]
  }).setChartType('ScatterChart')
                .setOptions({
                            'chartArea':{
                                        'left':100,
                                        'top': 30,
                                        'size': 14,
                                        'width': '80%',
                                        'height': '350',
                                        'bottom': 80
                            },
                            'pointSize': 6,
                            'title': v_main_title,
                              'hAxis': {'title':  v_xaxis_title,
                                        'textStyle': {
                                                    'fontSize': 18,
                                                    'fontStyle': "Arial",
                                                    'marginTop': '50',
                                                    'color': '#808080'
                                                    },
                                        'titleTextStyle': {
                                                        'color': "#000",
                                                        'fontName': "sans-serif",
                                                        'fontSize': 18,
                                                        'marginTop': '70',
                                                        'bold': true,
                                                        'italic': false
                                                        }
                                        },
                              'vAxis': {'title': v_yaxis_title,
                                        'textStyle': {
                                                    'fontSize': 16,
                                                    'fontStyle': "Arial",
                                                    'marginTop': '50',
                                                    'color': '#808080'
                                                      },
                                        'titleTextStyle': {
                                                        'color': "#000",
                                                        'fontName': "sans-serif",
                                                        'fontSize': 18,
                                                        'marginTop': '70',
                                                        'bold': true,
                                                        'italic': false
                                                          }
                                        },
                              'trendlines': { 
                                             '0': {
                                                'type': 'linear',
                                                'showR2': true,
                                                'visibleInLegend': true
                                                 }         
                                            }
                });
  print(v_chart);              
}

// Export a layer as asset
function Export_Layer(v_img, v_name,v_extent,v_proj,v_crsTrans) {
  Export.image.toAsset({image:v_img, 
                        description:v_name, 
                        assetId:'users/gponce/usda_ars/assets/ms_eco_states/'+ v_name, 
                        region:v_extent, 
                        crs: v_proj.crs().getInfo(),
                        crsTransform: v_crsTrans, 
                        maxPixels:1e13
  })
  
}

// Normalize an attribute
function Normalize_Attribute(v_fc) {
  var v_attr = ee.Number(v_fc.get(v_attr_name_g));
  var v_normalized_attr = v_attr.divide(v_maxAttr); // maxAttr is the maximum value of the attribute
  return v_fc.set('norm_'+v_attr_name_g, v_normalized_attr);
};

// Get 1ha eroded areas
function Get_Eroded_Areas(v_image, v_extent,v_area_th, v_proj, v_crsTrans){

  var vectors = v_image.reduceToVectors({
            geometry: v_extent,
            crs: v_proj.crs(),
            // scale: v_proj.nominalScale(),
            crsTransform: v_crsTrans,
            geometryType: 'polygon',
            eightConnected: true,
            labelProperty: 'zone',
            bestEffort: true,
            tileScale: 6,
            maxPixels: 1e13,
            reducer: ee.Reducer.countEvery(),
            geometryInNativeProjection: true
  });
  var v_eroded_area = vectors.map(function (ft){
                    return ft.set('area',ft.area(1)) 
  })
 
  var v_eroded_gte_1ha = v_eroded_area.filter('area >= ' + v_area_th)
                                    .reduceToImage(['zone'], 
                                                   ee.Reducer.mean()).rename('classification')
                                    .setDefaultProjection(v_proj.crs(), v_crsTrans);

  return v_eroded_gte_1ha
}

// Perform model building, prediction, accuracy (RMSE), vizualizations of distribution and scatterplot, pixel connectivity to get eroded areas of 1 ha. or larger.
function Get_Prediction(v_sensor, v_col, v_extent, v_period, v_f_date, v_l_date, v_metric, v_training_data, v_ntrees, v_crsTrans) {
  
  print('..... Building Model for period '+ v_period +' .....')
  var v_bands, v_bands_predictors,v_bands_names, v_proj;
  if (v_sensor == 'landsat') {
    print(' >>> Using Landsat sensor <<<');
    v_bands =['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5','SR_B6','SR_B7', 'ST_B10'] 
    v_bands_names = ['blue','green','red','nir','swir1','swir2','temp'];
    v_bands_predictors = ['blue','green','red','nir','swir1','swir2','temp','NDVI','EVI','EVI2'];
                        
     // Filter images within the dates and tiles (landsat) provided.                       
    v_col = v_col.filterMetadata( 'WRS_PATH','equals', 36)
                       .filterMetadata('WRS_ROW','equals', 38)
                       .filterMetadata('CLOUD_COVER','less_than', 5)
                       .filterDate(v_f_date, v_l_date)
                       .map(Apply_Scale_Factors);
                       
    v_proj = v_col.first().projection();
    v_col = v_col.first();
    v_projG = v_proj;
    
    Map.addLayer(v_col.select([3]),{min:0, max:0.3, palette:['brown','yellow','green']},'LSat')
    
  } else if (v_sensor == 'sentinel2') {
    print(' >>> Using Sentinel2 sensor <<<');
    v_bands =['B2', 'B3', 'B4', 'B8','B11','B12'] 
    v_bands_names = ['blue', 'green', 'red', 'nir', 'swir1','swir2'];
    v_bands_predictors = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'NDVI','EVI','EVI2'];
    v_proj = v_col.filterDate(v_f_date, v_l_date)
                           .filterBounds(v_extent)
                           .first().select('B2').projection()
    v_projG = v_proj; 
    // Filter images within the dates provided   
    v_col = v_col.filterDate(v_f_date, v_l_date)
                           .filterBounds(v_extent)
                           .mosaic()
                           .clip(v_extent)
                           .setDefaultProjection({crs:v_proj.crs(), crsTransform: v_crsTrans})
   
  } else {
    print(' >>> Using PlanetScope sensor <<<');
    v_bands = ['B1', 'B2', 'B3', 'B4']
    v_bands_names = ['blue', 'green', 'red', 'nir'];
    v_bands_predictors = ['blue', 'green', 'red', 'nir','NDVI','EVI','EVI2'];
    v_proj = v_col.filterDate(v_f_date, v_l_date)
                  .first().projection() // All bands have the same CRS information
    v_projG = v_proj;
    // Filter images within the dates provided   
    v_col = v_col.filterDate(v_f_date, v_l_date)
                           .filterBounds(v_extent)
                           .mosaic()
                           .clip(v_extent)
                           .setDefaultProjection({crs:v_proj.crs(), crsTransform: v_crsTrans})
  }

  // Out of the collection select the first image from the time period and clip it to AOI
  var v_single_img = v_col.clip(v_extent.geometry().bounds())
                          .select(v_bands, v_bands_names) // Rename bands
                          //select(v_bands_predictors)
                         
  // Generate vegetation indices as additional bands
  if (v_sensor == 'landsat') {
    v_single_img = Add_Indices_Landsat(v_single_img).setDefaultProjection(v_proj.crs(),v_crsTrans)
  }                                             // ee.Image(v_single_img.select(v_bands_predictors))
  
  if (v_sensor == 'sentinel2') {
    v_single_img =  Add_Indices_Sent2(v_single_img).setDefaultProjection(v_proj.crs(),v_crsTrans)
  }    
  if (v_sensor == 'pscope') {
    v_single_img =  Add_Indices_Pscope(v_single_img).setDefaultProjection(v_proj.crs(),v_crsTrans)
  }
  
  // Setup training points table
  var v_training_pts = v_single_img.sampleRegions({collection:v_training_data,
                                                      properties: ['id','S_Desc','Pasture','Plant_Comm','Transect', 'lpi_bg','mf_bg','pct_bg','period','area_ha'],
                                                      scale:v_proj.nominalScale(),
                                                      projection:v_proj,
                                                      geometries:true
                    });
                    
  // Split into train and test dataset
  var v_train = v_training_pts.randomColumn('random', 1234).filter(ee.Filter.lt('random', 0.70))
  var v_test = v_training_pts.randomColumn('random', 1234).filter(ee.Filter.gte('random', 0.70))
  
  // BUILD RandomForest MODEL -----------------------------------------------------------------------------------------------------------------

  // Create a list of `seeds` to use with each modeling iteration
  var v_list_seeds = ee.List([123,456,789,101,333])
  // Create a list of models by mapping over list of seeds
  var v_res_model = v_list_seeds.map(function (l){
                                    var v_model = ee.Classifier.smileRandomForest({
                                                          numberOfTrees:v_ntrees,
                                                          //bagFraction: 0.8,
                                                          minLeafPopulation:5,
                                                          seed: l,
                                                          }).setOutputMode('REGRESSION')
                                                          .train({
                                                            features:v_train,
                                                              classProperty: v_metric, 
                                                              inputProperties: v_bands_predictors
                                                          });
                                    // var v_model = ee.Classifier.smileGradientTreeBoost({numberOfTrees:v_ntrees, samplingRate:0.7, shrinkage: 0.05,seed:l})
                                    // .setOutputMode('REGRESSION')
                                    //                       .train({
                                    //                         features:v_train,
                                    //                           classProperty: v_metric, 
                                    //                           inputProperties: v_bands_predictors
                                    //                       });
                                  return v_model                            
  })
  
  // Loop through each model and classify the image to get the median of all the models
  var v_predicted_img = ee.ImageCollection.fromImages(v_res_model.map(function (v_model) {
        return v_single_img.classify(v_model)  // Return the classified image
      })
      ).mean() 
       .setDefaultProjection(v_proj.crs(),v_crsTrans)
  
  // Calculate RMSE using the observed
  var v_observations = v_single_img.sampleRegions({collection:v_test,
                                                        properties: [v_metric],
                                                        scale:v_proj.nominalScale(),
                                                        projection:v_proj,
                                                        geometries:true
  })
  var v_predictions = ee.Image(v_predicted_img).sampleRegions({collection:v_test,
                                                        properties: [v_metric],
                                                        scale:v_proj.nominalScale(),
                                                        projection:v_proj,
                                                        geometries:true
  })
      
  var v_all_pts = Get_Image_Normalized(v_predicted_img).select(['classification'],['nrm_'+v_metric+'_md'])
                  .addBands(v_predicted_img.select(['classification'],[v_metric+'_md']))
                                 .sampleRegions({collection:v_training_data,
                                                        properties: ['id','S_Desc','Pasture','Plant_Comm','Transect', v_metric,'period','area_ha'],
                                                        scale:v_proj.nominalScale(),
                                                        projection:v_proj,
                                                        geometries:true
                                  });
  v_attr_name_g = v_metric;
  v_maxAttr = v_all_pts.aggregate_max(v_metric)
  var  v_normalized_FC = v_all_pts.map(Normalize_Attribute);   

  v_observations = ee.Array(v_observations.aggregate_array(v_metric));
  v_predictions = ee.Array(v_predictions.aggregate_array('classification'));
  

  
  // Export as a shapefile to compare metric-based model vs ground values

  // Export.table.toDrive({collection: v_normalized_FC, description:'pts_ground_and_model_'+v_sensor+'_'+v_period+'_'+v_metric, 
  //                       folder:'esm_gee_shp', 
  //                       fileNamePrefix:'pts_ground_and_model_'+v_sensor+'_'+v_period+'_'+v_metric, 
  //                       fileFormat:'SHP'})
  
  // This export to asset is to use it for wrangling a data table to create a BarPlot using
  Export.table.toAsset(v_normalized_FC, 'pts_ground_and_model_'+v_sensor+'_'+v_period+'_'+v_metric, 'users/gponce/usda_ars/assets/ms_eco_states/' + 'pts_ground_and_model_'+v_sensor+'_'+v_period+'_'+v_metric)
  
  var v_rmse = v_observations.subtract(v_predictions).pow(2).reduce('mean', [0]).sqrt();

  // print('RMSE for modeling of '+ v_metric + ' with sensor '+ v_sensor + ' in ' + v_period, v_rmse);
  Export.table.toDrive(ee.FeatureCollection([ee.Feature(null,{'RMSE':v_rmse})]), v_sensor+'_'+ v_period + '_RMSE_' + v_metric + '_Eroded_area_for_SLUD')
 
  // Sample the predicted image at all the training points
  var v_fc_mod1 = v_predicted_img.sampleRegions(v_training_data, [v_metric], v_proj.nominalScale(), v_proj, 1, true)
  
  // Plot scatterplot between two attributes in a featureCollection from the training locations
  // Plot_Scatterplot_Fc(v_fc_mod1, v_metric, 'classification', 'Observed vs Predicted', 'Drone-based ['+v_metric+']', 'Predicted ['+v_metric+']')
  
  // Sample 5000 random points across AOI
  var v_fc_mod2 = v_predicted_img.sample(v_extent, v_proj.nominalScale(), v_proj, null, 5000, 123, true, 2, true)
  Plot_Histogram_Fc(v_fc_mod2,'classification','Histogram of modeled '+ v_metric + ' from 5000 random locations')
  
  // Get threshold for metric based on training points
  var v_thresh_trn = v_training_data.reduceColumns(ee.Reducer.mean(), [v_metric])

  print('Threshold for period ' + v_period  + ' of ground ' + v_metric + ' using training points ', v_thresh_trn)
  
  // Get threshold for modeled metric based on training points
  v_thresh_trn = v_fc_mod1.reduceColumns(ee.Reducer.mean(), [v_metric])
  print('Threshold for period ' + v_period  + ' of modeled ' + v_metric + ' using training points ', v_thresh_trn)
  
  // Get predicted image normalized
  var v_pred_img_norm = Get_Image_Normalized(v_predicted_img)
  // Sample normalized image at the training locations
  var v_fc_mod3 = v_pred_img_norm.sampleRegions(v_training_data, [v_metric], v_proj.nominalScale(), v_proj, 1, true)
  // Plot distribution
  Plot_Histogram_Fc(v_fc_mod3,'classification','Histogram of normalized modeled '+ v_metric +' at training points location');
  // Sample normalized image at 5K random points at AOI
  v_fc_mod3 = v_pred_img_norm.sample(v_slud, v_proj.nominalScale(), v_proj, null, 5000, 123, true, 2, true)
  // Plot distribution
  Plot_Histogram_Fc(v_fc_mod3,'classification','Histogram of normalized modeled '+ v_metric + ' at 5k random points location');
  // Get threshold out of the modeled metric 
  var v_thresh_mod = v_fc_mod3.reduceColumns(ee.Reducer.mean(), ['classification'])
  //print('Threshold of modeled results across 5k random points of the Normalized predicted '+v_metric, v_thresh_mod)
  
  // Get eroded area using connectivity of pixels crossing the threshold 
  var v_pred_eroded_gte1ha = Get_Eroded_Areas(v_pred_img_norm.gt(ee.Number(v_thresh_mod.get('mean'))).selfMask(),
                                            v_slud, 10000, v_proj,v_crsTrans)
  // Calculate the area eroded                                             
  var v_area = v_pred_eroded_gte1ha.multiply(ee.Image.pixelArea())

  var v_stat = v_area.reduceRegion({reducer: ee.Reducer.sum(),
                                             geometry: v_slud.geometry(), 
                                             scale: v_proj.nominalScale().getInfo(), 
                                             tileScale: 6,
                                             bestEffort: true,
                                             maxPixels: 1e13});
  
  // Export metrics, in case doesn't display in the console.                                           
  Export.table.toDrive(ee.FeatureCollection([ee.Feature(null,v_stat)]), v_sensor+'_'+ v_period + '_modeled_' + v_metric + '_Eroded_area_for_SLUD')
 
  var v_pct_period = ee.Number(v_stat.get('classification')).divide(v_slud.geometry().area()).multiply(100).round().format('%02d')
  print ('======> '+v_sensor+' '+ v_period + ' modeled ' + v_metric + 'Eroded area for SLUD <======= ')
  print('SLUD Area =>', v_slud.geometry().area().divide(10000))
  //print('Eroded area based on '+ v_metric +' metric for period '+ v_period + ' 2019 and sensor ' + v_sensor +' (in ha):', ee.Number(v_stat.get('classification')).divide(10000).round().format('%02d'))
  //print('Percentage of total area of Sandy Loam Upland, Deep (%)', v_pct_period)
  Map.addLayer(v_slud,{color:'yellow'},'SLUD',false,0.5)    
  Map.addLayer(v_srer_polys,{color:'magenta'},'Eroded Polys', false)
  return v_pred_eroded_gte1ha;  
}

// Set this variable to compute the metric-related outputs:
var v_metric_tomodel = 'pct_bg'; //'lpi_bg'; //'mf_bg'; //'pct_bg';


// *** Call Landsat8 modeling --------------------------------------------------------------------------------------------------------

var v_pred_may_landsat = Get_Prediction('landsat', v_landsat8_col, v_slud, 'May', '2019-05-01', '2019-05-31', v_metric_tomodel, v_pts_landsat_may, 200, [30,0,349785,0,-30,3628815])
Export_Layer(v_pred_may_landsat,'r_landsat_may_gt1ha_'+v_metric_tomodel,v_slud, v_projG, [30,0,349785,0,-30,3628815])

var v_pred_sep_landsat = Get_Prediction('landsat', v_landsat8_col, v_slud, 'Sep', '2019-08-15', '2019-09-15', v_metric_tomodel, v_pts_landsat_sep, 200, [30,0,349785,0,-30,3628815])
Export_Layer(v_pred_sep_landsat,'r_landsat_sep_gt1ha_'+v_metric_tomodel,v_slud, v_projG, [30,0,349785,0,-30,3628815])


Map.addLayer(v_pred_may_landsat,{palette:['red']},'Landsat_May_Predicted_Eroded_Area-SLUD', false) 
Map.addLayer(v_pred_sep_landsat,{palette:['blue']},'Landsat_Sep_Predicted_Eroded_Area-SLUD',false) 


Map.addLayer(v_pred_may_landsat.add(v_pred_sep_landsat).gt(1).selfMask(),{palette:['green']},'Landsat_Collapsed_Predicted_Eroded_Area-SLUD',false) 

// *** Call Sentinel2 modeling --------------------------------------------------------------------------------------------------------

// var v_pred_may_sent2 = Get_Prediction('sentinel2', v_sentinel2_col, v_slud, 'May', '2019-05-26', '2019-05-31', v_metric_tomodel, v_pts_sent2_may, 100, [10,0,399960,0,-10,3600000])
// Export_Layer(v_pred_may_sent2,'r_sent2_may_gt1ha_'+v_metric_tomodel,v_slud,v_projG, [10,0,399960,0,-10,3600000])

// var v_pred_sep_sent2 = Get_Prediction('sentinel2', v_sentinel2_col, v_slud, 'Sep', '2019-08-22', '2019-08-24', v_metric_tomodel, v_pts_sent2_sep, 100, [10,0,399960,0,-10,3600000])
// Export_Layer(v_pred_sep_sent2,'r_sent2_sep_gt1ha_'+v_metric_tomodel,v_slud,v_projG, [10,0,399960,0,-10,3600000])

// Map.addLayer(v_pred_may_sent2,{palette:['red']},'Sent2_May_Predicted_Eroded_Area-SLUD', false) 
// Map.addLayer(v_pred_sep_sent2,{palette:['red']},'Sent2_Sep_Predicted_Eroded_Area-SLUD', false) 


// *** Call PlanetScope modeling --------------------------------------------------------------------------------------------------------

// var v_pred_may_pscope = Get_Prediction('pscope', v_planetscope_col, v_slud, 'May', '2019-05-01', '2019-05-31', v_metric_tomodel, v_pts_pscope_may, 50, [3,0,504546,0,-3,3529962])
// Export_Layer(v_pred_may_pscope,'r_pscope_may_gt1ha_'+v_metric_tomodel,v_slud,v_projG, [3,0,504546,0,-3,3529962] )

// Map.addLayer(v_pred_may_pscope,{palette:['red']},'Pscope_May_Predicted_Eroded_Area-SLUD', false) 

// var v_pred_sep_pscope = Get_Prediction('pscope', v_planetscope_col, v_slud, 'Sep', '2019-08-01', '2019-08-31', v_metric_tomodel, v_pts_pscope_sep, 50, [3,0,504546,0,-3,3529962])
// Export_Layer(v_pred_sep_pscope,'r_pscope_sep_gt1ha_'+v_metric_tomodel,v_slud,v_projG, [3,0,504546,0,-3,3529962] )

// Map.addLayer(v_pred_sep_pscope,{palette:['red']},'Pscope_Sep_Predicted_Eroded_Area-SLUD', false) 
