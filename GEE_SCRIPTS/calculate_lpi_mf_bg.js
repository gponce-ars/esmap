/*
Name: calculate_lpi_mf_bg.js
GEE_link: https://code.earthengine.google.com/93d823c72981b084012e740f17338224?noload=true
Goals: 
  - To get the grids from each satellite platform that overlap the classified 5cm drone-image for each period,
  - Calculate the Largest Patch Index (LPI) at each grid-cell,
  - Calculate Mean Fetch (MF),
  - Calculate Bareground percentage(PCT_BG).
Inputs: 
  - Ecological States ground surveyed polygons (https://bit.ly/srer_es_polygons)
  - Drone-flights footprints
  - Area of interest, SRER-Sandy Loam Upland and Deep(SLUD) polygons
  - Drone-derived 5cm classification image (1-Grass, 2-Tree/Shrub, 3-Bareground, 4-Shadows)
  - Satellite-based grids (polygons) for each sensor: Landsat-8 (30m), Sentinel-2 (10m), PlanetScope (3m)
Description:
  This script calculates the metrics of LPI,MF, PCT_BG within the ground-surveyed polygons. Each of these polygons has 
  an attribute with the corresponding ecological state. The metrics calculated are exported as point-based dataset 
  with the attributes for the ecological site identification and the three metrics.
Outputs
  - Satellited-based grids overlapping with the flights' footprints in the SLUD
  - A point-based dataset for each period(May & September, 2019) and sensor with the attributes for ecological site, LPI,MF, and PCT_BG.
Author: Guillermo Ponce (geponce at arizona.edu)
Date: 01/29/2023
*/

// Load datasets

// Classified 5cm image from drone data

var v_classified_may = ee.Image('users/gponce/usda_ars/assets/images/aes/srer/suas/2019/full_ortho_classified_may_2019_5cm')
var v_classified_sep = ee.Image('users/gponce/usda_ars/assets/images/aes/srer/suas/2019/full_ortho_classified_sep_2019_5cm')

// Grids from sensors for the entire SLUD, these grids are the boundaries of the pixels at each sensor coordinate system
var v_landsat_grids = ee.FeatureCollection('users/gponce/usda_ars/shapefiles/ECOL_STATES/landsat_grid_srer_slud')
var v_sent2_grids = ee.FeatureCollection('users/gponce/usda_ars/shapefiles/ECOL_STATES/sent2_grid_srer_slud')
var v_pscope_grids = ee.FeatureCollection('users/gponce/usda_ars/shapefiles/ECOL_STATES/pscope_grid_srer_slud')

// Flight footprints polygons, to avoid/cut off the wiggly edges of the images
var v_foot_prints = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/flights_footprints_2019')

// Feature collection with the polygons surveyed and mapped by Dan Robinett in 2019.
var v_srer_polys = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_polygons_drone_2019')
                     .map(function (ft){
                       return ft.set('area_ha', ft.area().divide(10000)); // Set area in hectares
                     })

// Sandy Loam Upland and Deep
var slud = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_sandy_loam').filter('RANGESITES != 18').union()
Map.addLayer(slud)
// 1. Generate the grids from each satellite platform ----------------------------------------------------------------

{ 

  // * Intersect the flight footprints and the satellite grids 
  
  // This is one option to perform a spatial join
  var v_spatial_filter = ee.Filter.intersects({
    leftField: '.geo',
    rightField: '.geo',
    maxError: 1
  });
  
  // Define a save all join.
  var v_saveAllJoin = ee.Join.saveAll({
    matchesKey: 'polys',
  });
  
  
  // Perform spatial join of grids and polygons and keep only those grids that overlap at least 50% of footprint area.
  var v_sensor_grids = v_landsat_grids              // Landsat grid
  // var v_sensor_grids = v_sent2_grids             // Sentinel2 
  // var v_sensor_grids = v_pscope_grids            // PlanetScope
  
  var v_desc = 'landsat_grids_joined'
  // var v_desc = 'sent2_grids_joined'
  // var v_desc = 'pscope_grids_joined'
 
  // Setup asset names/id's to export the joined data. 
  var v_asset_id = 'users/gponce/usda_ars/assets/ms_eco_states/landsat_grids_in_polygons'
  // var v_asset_id = 'users/gponce/usda_ars/assets/ms_eco_states/sent2_grids_in_polygons'
  // var v_asset_id = 'users/gponce/usda_ars/assets/ms_eco_states/pscope_grids_in_polygons'
  
  // Apply the join.
  var v_intersect1 = v_saveAllJoin.apply(v_sensor_grids, v_foot_prints, v_spatial_filter)
                             
  // Spatial join and filtering out grids with less than 50% area of overlap.
  var v_fprint_filtered = v_sensor_grids.filterBounds(v_srer_polys);
  var v_intersect = v_intersect1.map(function(feature){
    var v_poly = feature.geometry();
    var v_intersection = v_poly.intersection(v_foot_prints.geometry(), ee.ErrorMargin(1))
                               .intersection(v_srer_polys.geometry(),ee.ErrorMargin(1));
    var v_totalArea = v_poly.area();
    var v_overlapped = v_intersection.area().divide(v_totalArea);
    return feature.set({'overlapped': v_overlapped});
  }).map(function (ft) {  
          return ft.set('polys',null)
  });    
  v_intersect = v_intersect.filter(ee.Filter.gte("overlapped", 0.5));
  
  // Adding a unique sequenced id to featureCollection
  var v_indexes = ee.List(v_intersect.aggregate_array('system:index'))
  var v_ids = ee.List.sequence(1, v_intersect.size())
  var v_idByIndex = ee.Dictionary.fromLists(v_indexes, v_ids)
  var v_datasetWithId = v_intersect.map(function (feature) {
    return feature.set('id', ee.Number(v_idByIndex.get(feature.get('system:index'))).toInt())
  })
  
  // Export the final grids
  Export.table.toAsset({collection:v_datasetWithId, 
                        description:v_desc, 
                        assetId:v_asset_id})
  
                  
  Map.addLayer(v_intersect,{}, 'Points Landsat Sep', false)
  
  Map.addLayer(v_foot_prints,{},'Polygons footprints')

  Map.addLayer(v_landsat_grids,{},'grids_asset')
  Map.addLayer(v_classified_may,
               {min: 1, max: 4, palette: ['81FA4C', '245A0D', '996633', '100400']},
               'May_classification',false); 
  Map.addLayer(v_classified_sep,
               {min: 1, max: 4, palette: ['81FA4C', '245A0D', '996633', '100400']},
               'Sep_classification',false); 
  


}

// 2. Calculate Largest Patch Index (LPI) ----------------------------------------------------------------------------

{

  // Load data
  var v_landsat_joined_grids = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/landsat_grids_in_polygons')
  var v_sent2_joined_grids = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/sent2_grids_in_polygons')
  var v_pscope_joined_grids = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pscope_grids_in_polygons');

  // Get the plant community ('Ecological State') on each grid as an attribute.
  
  // Perform join of grids and polygons surveyed to set the ecological state information
  var v_landsat_joined_grids = v_saveAllJoin.apply(v_landsat_joined_grids, v_srer_polys, v_spatial_filter)
                                        .map(function (ft){  // Set attributes to each grid out of the polygons surveyed
                                                var ft1 = ee.Feature(ee.List(ft.get('polys')).get(0))
                                             return ft.set({'Plant_Comm': ft1.get('Plant_Comm'),
                                                             'Pasture': ft1.get('Pasture'),
                                                             'Transect': ft1.get('Transect'),
                                                             'Utility' : ft1.get('Utility'),
                                                             'S_Desc' : ft1.get('S_Desc'),
                                                             'Exclosure' : ft1.get('Exclosure'),
                                                             'area_ha': ft1.get('area_ha'),
                                                             'polys':null,
                                                             'overlapped':null
                                              }) 
                                        })
  var v_sent2_joined_grids = v_saveAllJoin.apply(v_sent2_joined_grids, v_srer_polys, v_spatial_filter)
                                        .map(function (ft){  // Set attributes to each grid out of the polygons surveyed
                                                var ft1 = ee.Feature(ee.List(ft.get('polys')).get(0))
                                              return ft.set({'Plant_Comm': ft1.get('Plant_Comm'),
                                                             'Pasture': ft1.get('Pasture'),
                                                             'Transect': ft1.get('Transect'),
                                                             'Utility' : ft1.get('Utility'),
                                                             'S_Desc' : ft1.get('S_Desc'),
                                                             'Exclosure' : ft1.get('Exclosure'),
                                                             'area_ha': ft1.get('area_ha'),
                                                             'polys':null,
                                                             'overlapped':null
                                              }) 
                                        })  
  var v_pscope_joined_grids = v_saveAllJoin.apply(v_pscope_joined_grids, v_srer_polys, v_spatial_filter)
                                        .map(function (ft){  // Set attributes to each grid out of the polygons surveyed
                                                var ft1 = ee.Feature(ee.List(ft.get('polys')).get(0))
                                            return ft.set({'Plant_Comm': ft1.get('Plant_Comm'),
                                                             'Pasture': ft1.get('Pasture'),
                                                             'Transect': ft1.get('Transect'),
                                                             'Utility' : ft1.get('Utility'),
                                                             'S_Desc' : ft1.get('S_Desc'),
                                                             'Exclosure' : ft1.get('Exclosure'),
                                                             'area_ha': ft1.get('area_ha'),
                                                             'polys':null,
                                                             'overlapped':null
                                              }) 
                                        })                                    
  
                
  var v_img_5cm_class;
  function Get_Connected(v_binary,ft) {
    // Connected components labeling
    var v_connected = v_binary.connectedComponents({
      connectedness: ee.Kernel.plus(1),
      // connectedness: ee.Kernel.diamond(1),
      maxSize: 1024
    });
    // Get the size of each connected component
    var v_sizes = v_connected.reduceConnectedComponents({
      reducer: ee.Reducer.count(),
      maxSize: 1024
    }).setDefaultProjection(v_binary.projection());
    
    // Get the largest connected component
    var v_large = v_sizes.reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: ft.geometry(),
      scale: 0.05,
    //  bestEffort: true
    })
  
    var v_largest = v_sizes.gte(ee.Number(v_large.get('classification'))).selfMask();
    
    // Get the area of the largest connected component
    var v_area = v_largest.multiply(ee.Image.pixelArea()).reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: ft.geometry(),
      scale: 0.05,
      bestEffort: true
    })
    
    // Calculate the Largest Patch Index (LPI)
    var v_lpi = ee.Number(v_area.get('classification')).divide(ee.Number(ft.area(0.05)));
    
    return v_lpi.multiply(100);//
  }
  function Get_LPI (ft) {
    
    var v_binary = v_img_5cm_class.clip(ft).eq(3).selfMask()
    // Count number of pixels within a grid of the class 'bareground' before attempting connectedness methods.
    var cnt = v_binary.reduceRegion({
      reducer:ee.Reducer.count(),
      geometry: ft.geometry(),
      scale: 0.05,
      maxPixels:1e13
    })
    // This is for checking the cases where bareground class is not present within the grid.
    var res = ee.Algorithms.If(ee.Number(cnt.get('classification')).gt(0), Get_Connected(v_binary,ft), 0)     
 
    return  ft.set('lpi_bg', res) //)
             
  } 
  
  // For each grid, calculate the LPI 
  
  // Landsat
  v_img_5cm_class = v_classified_may
  var v_lpi_landsat_may = v_landsat_joined_grids.map(Get_LPI)
  
  v_img_5cm_class = v_classified_sep
  var v_lpi_landsat_sep = v_landsat_joined_grids.map(Get_LPI)
  
  
  
  // Sentinel2
  v_img_5cm_class = v_classified_may
  var v_lpi_sent2_may = v_sent2_joined_grids.map(Get_LPI)
  
   
  v_img_5cm_class = v_classified_sep
  var v_lpi_sent2_sep = v_sent2_joined_grids.map(Get_LPI)
  
  
  // PScope
  v_img_5cm_class = v_classified_may
  var v_lpi_pscope_may = v_pscope_joined_grids.map(Get_LPI)
  
  v_img_5cm_class = v_classified_sep
  var v_lpi_pscope_sep = v_pscope_joined_grids.map(Get_LPI)

} 

 
// 3. Calculate Mean Fetch  ------------------------------------------------------------------------------------------

{

  function Get_Mean_Nearest_Bground_Pixel(v_image, v_points) {
    var v_distance = v_image.fastDistanceTransform().sqrt().multiply(ee.Image.pixelArea().sqrt()).rename("distance");
    v_points = v_distance.reduceRegions(v_points, ee.Reducer.first().setOutputs(["distance"]))
    return ee.Number(v_points.reduceColumns(ee.Reducer.mean(),['distance']).get('mean'))
  }
  var N_PTS = 1000 // Number of random points to use
  // Set the mean fetch value for each grid using the 'N_PTS' (# of random points) to calculate the mean distance to the closest non-bareground
  function Set_Mean_Fetch(ft) {
      var v_rnd = ee.FeatureCollection.randomPoints(ft.geometry(), N_PTS, 1111, 0.05)
      var v_nearestMeanValues = Get_Mean_Nearest_Bground_Pixel(v_img_5cm_class, v_rnd);
               
    return ft.set({'mf_bg': v_nearestMeanValues})
  }
  // Landsat
  v_img_5cm_class = v_classified_may.neq(3).selfMask()
  v_lpi_landsat_may = v_lpi_landsat_may.map(Set_Mean_Fetch)
  
  v_img_5cm_class = v_classified_sep.neq(3).selfMask()
  v_lpi_landsat_sep = v_lpi_landsat_sep.map(Set_Mean_Fetch)
  
  
  // Sentinel2
  v_img_5cm_class = v_classified_may.neq(3).selfMask()
  v_lpi_sent2_may = v_lpi_sent2_may.map(Set_Mean_Fetch)
  
  v_img_5cm_class = v_classified_sep.neq(3).selfMask()
  v_lpi_sent2_sep = v_lpi_sent2_sep.map(Set_Mean_Fetch)
  
  
  // Pscope
  v_img_5cm_class = v_classified_may.neq(3).selfMask()
  v_lpi_pscope_may = v_lpi_pscope_may.map(Set_Mean_Fetch)
  
  v_img_5cm_class = v_classified_sep.neq(3).selfMask()
  v_lpi_pscope_sep = v_lpi_pscope_sep.map(Set_Mean_Fetch)

} 

// 4. Calculate Bareground area  -------------------------------------------------------------------------------------

{
  

  function Get_Bareground_Area (ft) {
      // Convert the image to a binary mask, where class pixels are 1 and others are 0
      var v_binary_mask = v_img_5cm_class.gt(0);
      // Multiply the binary mask with the area of each pixel in square meters
      var v_area_image = v_binary_mask.multiply(ee.Image.pixelArea());
      var v_area_ft = ft.area()
      // Reduce the image to calculate the total area covered by the specific class
      var v_area = v_area_image.reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: ft.geometry(),
        scale: 0.05,
        maxPixels: 1e13
       }).get('classification');
      var v_pct_area = ee.Number(v_area).divide(v_area_ft).multiply(100);//.round().toInt();
    return ft.set({'pct_bg': v_pct_area})
  }
  
  // Landsat
  v_img_5cm_class = v_classified_may.eq(3)
  
  v_lpi_landsat_may = v_lpi_landsat_may.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_landsat_may,{},'Joined_w_lpi_mf_bg_may_Landsat',false)
  
  v_img_5cm_class = v_classified_sep.eq(3)
  v_lpi_landsat_sep = v_lpi_landsat_sep.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_landsat_sep,{},'Joined_w_lpi_mf_bg_sep_Landsat',false)
  
  // Sentinel2
  v_img_5cm_class = v_classified_may.eq(3)
  v_lpi_sent2_may = v_lpi_sent2_may.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_sent2_may,{},'Joined_w_lpi_mf_bg_may_Sent2',false)
  
  v_img_5cm_class = v_classified_sep.eq(3)
  v_lpi_sent2_sep = v_lpi_sent2_sep.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_sent2_sep,{},'Joined_w_lpi_mf_bg_sep_Sent2',false)
  
  // Pscope
  v_img_5cm_class = v_classified_may.eq(3)
  v_lpi_pscope_may = v_lpi_pscope_may.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_pscope_may,{},'Joined_w_lpi_mf_bg_may_Pscope',false)
  
  v_img_5cm_class = v_classified_sep.eq(3)
  v_lpi_pscope_sep = v_lpi_pscope_sep.map(Get_Bareground_Area)
  Map.addLayer(v_lpi_pscope_sep,{},'Joined_w_lpi_mf_bg_sep_Pscope',false)

}

// Export the final featureCollection as points for training model ---------------------------------------------------

{

  function Get_Points(ft) {
    var v_pt = ft.centroid();
    v_pt = v_pt.copyProperties(ft);
    return v_pt.set('period', v_period);
  }
   
    
  
  var v_period = 'May'
  v_lpi_landsat_may = v_lpi_landsat_may.map(Get_Points)
  v_period = 'Sep'
  v_lpi_landsat_sep = v_lpi_landsat_sep.map(Get_Points)
  
  v_period = 'May'
  v_lpi_sent2_may = v_lpi_sent2_may.map(Get_Points)
  v_period = 'Sep'
  v_lpi_sent2_sep = v_lpi_sent2_sep.map(Get_Points)
 
  
  v_period = 'May'
  v_lpi_pscope_may = v_lpi_pscope_may.map(Get_Points)
  v_period = 'Sep'
  v_lpi_pscope_sep = v_lpi_pscope_sep.map(Get_Points)
  

  Map.addLayer(v_lpi_pscope_may,{},'Final Exp')
  
  Export.table.toAsset(v_lpi_landsat_may, 'pts_landsat_may_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_may_lpi_mf_bg_v2')
  Export.table.toAsset(v_lpi_landsat_sep, 'pts_landsat_sep_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_sep_lpi_mf_bg_v2')
  Export.table.toAsset(v_lpi_sent2_may, 'pts_sent2_may_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_may_lpi_mf_bg_v2')
  Export.table.toAsset(v_lpi_sent2_sep, 'pts_sent2_sep_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_sep_lpi_mf_bg_v2')
  Export.table.toAsset(v_lpi_pscope_may, 'pts_pscope_may_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_may_lpi_mf_bg_v2')
  Export.table.toAsset(v_lpi_pscope_sep, 'pts_pscope_sep_lpi_mf_bg', 'users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_sep_lpi_mf_bg_v2')



}



// End-of-script -----------------------------------------------------------------------------------------------------


// Get the 5-cm drone classification image for the period c
var clipped = v_classified_may.clip(geometry);

// Convert the image to a binary image
var binary = clipped.eq(3).selfMask()

var ct = binary.reduceRegion({
  reducer: ee.Reducer.sum(),
  scale:0.05,
  maxPixels: 1e13,
  geometry:geometry
})
//var res = ee.Algorithms.If(ee.Number(ct.get('classification')).gt(0), Get_Connected(binary,geometry), 'Nulls')     


// Connected components labeling
var connected = binary.connectedComponents({
  connectedness: ee.Kernel.plus(1),
  // connectedness: ee.Kernel.diamond(2),
  maxSize: 1024
});
//print('Connected', connected)
// Get the size of each connected component
var sizes = connected.reduceConnectedComponents({
  reducer: ee.Reducer.count(),
  maxSize: 1024
}).reproject(clipped.projection());

// Get the largest connected component
var large = sizes.reduceRegion({
  reducer: ee.Reducer.max(),
  geometry: geometry,
  scale: 0.05,
  bestEffort: true
})

var largest = sizes.gte(ee.Number(large.get('classification'))).selfMask();

Map.addLayer(connected, {},'Connected')
Map.addLayer(largest, {},'Largest')
Map.addLayer(sizes, {},'Sizes')

// Get the area of the largest connected component
var area = largest.multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: 0.05,
  bestEffort: true
});
print('Total area of connected patch',area)
// Get the total area of the binary image
var total = clipped.multiply(ee.Image.pixelArea()).reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: geometry,
  scale: 0.05,
  //bestEffort: true
});

// Calculate the Largest Patch Index (LPI)
var lpi = ee.Number(area.get('classification')).divide(ee.Number(geometry.area(1)));


Map.addLayer(v_srer_polys,{},'SRER surveyed Polys')
Map.centerObject(geometry)

