/*
Name: data_table_for_barplots.js
GEE_link: https://code.earthengine.google.com/1da4b7cde7d013469bd9ff426c46343d?noload=true
Goal: To generate a table-ready to create the bar plot in R for the percentage of eroded pixels in 
      surveyed polygons. This is based on percentage of pixels falling above the mean value of the 
      metric (LPI, MF, BG) for each sensor (Landsat | Sentinel2 | Pscope) and period (May | Sep.)
      
Inputs:
  - Computed metrics for each set of points based on the three different sensor resolutions at each period (May & Sep.)

Outputs:
  - A table-ready to create bar plots in R. 
Author: Guillermo Ponce (geponce at arizona.edu)
Date: 04/12/2023
*/  

// Load surveyed polygons
var v_srer_polys = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_polygons_drone_2019')
                     //.filter(ee.Filter.stringContains('Plant_Comm','Eroded'))
                     
// Load dataset for each metric, sensor and period

// LPI ----------------------------------------------------------------------------------------------------------------
// Landsat

var pts_lpi_landsat_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_may_lpi_mf_bg_v2')
var pts_lpi_landsat_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_landsat_sep_lpi_mf_bg_v2')


// The following two variables are only activated to perform the join of variables initially.
// var pts_vars_landsat_may = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_May_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_May_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_May_pct_bg'))
                                             
// var pts_vars_landsat_sep = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_Sep_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_Sep_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_landsat_Sep_pct_bg'))

// Export.table.toAsset(pts_vars_landsat_may, 'pts_grd_mod_landsat_may_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_landsat_May_lpi_mf_pct')
// Export.table.toAsset(pts_vars_landsat_sep, 'pts_grd_mod_landsat_sep_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_landsat_Sep_lpi_mf_pct')

var pts_vars_landsat_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_landsat_May_lpi_mf_pct')
var pts_vars_landsat_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_landsat_Sep_lpi_mf_pct')

// Sentinel2
var pts_lpi_sent2_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_may_lpi_mf_bg_v2')
var pts_lpi_sent2_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_sent2_sep_lpi_mf_bg_v2')

// The following two variables are only activated to perform the join of variables initially.
// var pts_vars_sent2_may = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_May_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_May_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_May_pct_bg'))

// var pts_vars_sent2_sep = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_Sep_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_Sep_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_sentinel2_Sep_pct_bg'))

// Export.table.toAsset(pts_vars_sent2_may, 'pts_grd_mod_sentinel2_may_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_sentinel2_May_lpi_mf_pct')
// Export.table.toAsset(pts_vars_sent2_sep, 'pts_grd_mod_sentinel2_sep_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_sentinel2_Sep_lpi_mf_pct')

var pts_vars_sent2_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_sentinel2_May_lpi_mf_pct')
var pts_vars_sent2_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_sentinel2_Sep_lpi_mf_pct')

// PScope
var pts_lpi_pscope_may = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_may_lpi_mf_bg_v2')
var pts_lpi_pscope_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_pscope_sep_lpi_mf_bg_v2')

// The following two variables are only activated to perform the join of variables initially.
// var pts_vars_pscope_may = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_May_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_May_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_May_pct_bg'))

// var pts_vars_pscope_sep = Join_Ground_Model(ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_Sep_lpi_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_Sep_mf_bg'),
//                                             ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_ground_and_model_pscope_Sep_pct_bg'))


// Export.table.toAsset(pts_vars_pscope_may, 'pts_grd_mod_pscope_may_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_pscope_May_lpi_mf_pct')
// Export.table.toAsset(pts_vars_pscope_sep, 'pts_grd_mod_pscope_sep_lpi_mf_pct', 'users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_pscope_Sep_lpi_mf_pct')
var pts_vars_pscope_may =  ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_pscope_May_lpi_mf_pct')
var pts_vars_pscope_sep = ee.FeatureCollection('users/gponce/usda_ars/assets/ms_eco_states/pts_grd_mod_pscope_Sep_lpi_mf_pct')

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

// ---- FUNCTIONS -----------------------------------------------------------------------------------------------------
// Join the attributes for LPI, MF, BG for modeled and ground based values
function Join_Ground_Model (ft1,ft2,ft3) {
  // Join Ft1 and Ft2 based on the "Feature Index"
  var ft1_ft2 = ee.Join.inner().apply(ft1, ft2, ee.Filter.intersects({
    leftField: ".geo",
    rightField: ".geo"
  }));
  
  // Select the desired columns from Ft2
  var ft1_ft2_selected = ft1_ft2.map(function(feature) {
    var properties = feature.toDictionary();
    var f1 = ee.Feature(properties.get('primary'));
    var f2 = ee.Feature(properties.get('secondary'));
    var selectedProperties = properties;
    var selectedProperties = {'id':f1.get('id'),
                              'Pasture':f1.get('Pasture'),
                              'Transect':f1.get('Transect'),
                              'Plant_Comm':f1.get('Plant_Comm'),
                              'S_Desc':f1.get('S_Desc'),
                              'area_ha':f1.get('area_ha'),
                              'period':f1.get('period'),
                              'lpi_bg':f1.get('lpi_bg'),
                              'lpi_bg_md':f1.get('lpi_bg_md'),
                              'mf_bg':f2.get('mf_bg'),
                              'mf_bg_md':f2.get('mf_bg_md')}
    return ee.Feature(ee.Feature(f1).geometry(), selectedProperties);
  });
  // Join Ft1_ft2_selected and Ft3 based on the "Feature Index"
  var ft_all = ee.Join.inner().apply(ft1_ft2_selected, ft3, ee.Filter.intersects({
    leftField: ".geo",
    rightField: ".geo"
  }));
  // Select the desired columns from Ft4
  var ft_all_selected = ft_all.map(function(feature) {
    var properties = feature.toDictionary();
    var f1 = ee.Feature(properties.get('primary'));
    var f2 = ee.Feature(properties.get('secondary'));
    var selectedProperties = properties;
    var selectedProperties = {'id':f1.get('id'),
                              'Pasture':f1.get('Pasture'),
                              'Transect':f1.get('Transect'),
                              'Plant_Comm':f1.get('Plant_Comm'),
                              'S_Desc':f1.get('S_Desc'),
                              'area_ha':f1.get('area_ha'),
                              'period':f1.get('period'),
                              'lpi_bg':f1.get('lpi_bg'),
                              'lpi_bg_md':f1.get('lpi_bg_md'),
                              'mf_bg':f1.get('mf_bg'),
                              'mf_bg_md':f1.get('mf_bg_md'),
                              'pct_bg': f2.get('pct_bg'),
                              'pct_bg_md':f2.get('pct_bg_md')
    }
    return ee.Feature(ee.Feature(f1).geometry(), selectedProperties);
  });
  
return (ft_all_selected)
}

// Define the area covered by eroded pixels
function Set_Coverage_Extent(v_fc){
  
  var fc_area = v_fc.geometry().area().divide(10000)
  var v_estate = v_fc.get('E_State')
  var v_pattern = "\\b\\w";
  var v_pc = ee.String(v_fc.get('Plant_Comm')).match(v_pattern, "g").join('').toUpperCase()
  var v_estate = ee.Algorithms.If(v_pc.equals('LSNNG'),'LSG',
                                  ee.Algorithms.If(v_pc.equals('LSNG'), 'LSG',
                                  ee.Algorithms.If(v_pc.equals('LSE'),'LSE',
                                  ee.Algorithms.If(v_pc.equals('NNG'),'NNG','LS'))))
  var v_filtered = pts_to_process.filterBounds(v_fc.geometry())                                  
  var v_count = v_filtered.size()
  var v_count_gtm = v_filtered.filter(ee.Filter.gte(v_metric_g,v_mean_g)).size()
  var pct_eroded = ee.Algorithms.If(v_count_gtm.gt(0), ee.Number(v_count_gtm.divide(v_count).multiply(100).round()),ee.Number(0));               
  var v_id = ee.String(v_fc.get('Pasture')).cat(ee.String('|')).cat(v_fc.get('Transect')).cat(ee.String('|')).cat(v_pc)

  return v_fc.set({'id': v_id,
                   'E_State': v_estate,
                   'area': fc_area,
                   'pct_eroded': pct_eroded,
                   'total_eroded': v_count_gtm,
                   'totalPix':v_count,
                   'sensor':v_sensor_g,
                   'period':v_period_g
  });
  
}

// Export data table 
function Export_Table(v_table, v_name) {

  Export.table.toDrive({collection:v_table, 
                      description:v_name, 
                      folder:'esm_gee_shp', 
                      fileNamePrefix:v_name, 
                      fileFormat:'CSV', 
                      selectors:['id','E_State','period','sensor','area','pct_eroded','total_eroded','totalPix']
                     })

}

// Arrange data to get the collapsed (i.e. metric values indicating eroded in both periods)
function Get_Collapsed(v_sensor,v_pts) {
  
  // Filter the two groups.
  var v_groupA = v_pts.filter('sensor == "'+v_sensor+'" and period == "May" and pct_eroded >= 50');
  var v_groupB = v_pts.filter('sensor == "'+v_sensor+'" and period == "Sep" and pct_eroded >= 50');

  // Create a filter that matches features in both groups with value > 50.
  var filter = ee.Filter.and(
    ee.Filter.equals('sensor', v_sensor),
    ee.Filter.inList('id', v_groupA.aggregate_array('id')),
    ee.Filter.inList('id', v_groupB.aggregate_array('id'))
  );
  
  // Apply the filter to the feature collection.
  var v_filteredFeatures = v_pts.filter(filter);
  
  
  // Define the group reducer.
  var groupReducer = ee.Reducer.max().repeat(5).group({
    groupField: 5,
    groupName: 'id'
  });
  
  // Reduce the columns by group, getting the maximum value of 'pct_eroded' for each 'id'.
  var v_maxVals = v_filteredFeatures.reduceColumns({
    reducer: groupReducer,
    selectors: ['E_State','pct_eroded','total_eroded','totalPix','area','id']
  });
  
  var fc = ee.FeatureCollection(
    ee.List(v_maxVals.get('groups'))
      .map(function(record) {
        var id = ee.String(ee.Dictionary(ee.List(record)).get('id'))
        var max = ee.List(ee.Dictionary(ee.List(record)).get('max'));
        return ee.Feature(null, {'id': id, 'E_State': max.get(0), 'pct_eroded': max.get(1), 'total_eroded': max.get(2), 'totalPix': max.get(3), 'area':max.get(4)});
      })
  );
  
  var v_tmp = v_pts.filter('sensor == "'+v_sensor+'"').select(['id','E_State','pct_eroded','total_eroded','totalPix', 'area'])
  
  var v_spatial_filter = ee.Filter.equals({
      leftField: 'id',
      rightField: 'id'
    });
  // Define a save all join.
  var v_saveAllJoin = ee.Join.saveAll({
      matchesKey: 'pts',
      outer:true
  });
  v_sensor_g = v_sensor
  var v_res = v_saveAllJoin.apply(v_tmp,fc,v_spatial_filter)
                         .map(function (ft){
                           var is_eroded = ee.Algorithms.If(ee.List(ft.get('pts')).size().gt(0),true,false)
                           return ft.set({'is_eroded':is_eroded,
                                          'id':ft.get('id'),
                                          'E_State':ft.get('E_State'),
                                          'sensor':v_sensor_g,
                                          'period':'collapsed',
                                          'area': ft.get('area'),
                                          'pct_eroded':ft.get('pct_eroded'),
                                          'total_eroded':ft.get('total_eroded'),
                                          'totalPix':ft.get('totalPix'),
                                          'pts':null
                                          })
                         }).distinct(['E_State','id'])
  
  return v_res;
}        

// LPI
var v_all_pts;
// Modeled:  //'lpi_bg_md'; //'mf_bg_md'; //'pct_bg_md';
// Ground: //'lpi_bg'; //'mf_bg'; //'pct_bg' 
var v_metric_g = 'pct_bg_md'; 

// *** Get metric values per polygon for each sensor-period-metric.
// Landsat May
var pts_to_process = pts_vars_landsat_may; //pts_lpi_landsat_may;
var v_sensor_g = 'Landsat';
var v_period_g = 'May';
var v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)

var v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_result;

// Landsat Sep
var pts_to_process = pts_vars_landsat_sep; //pts_lpi_landsat_sep;
var v_sensor_g = 'Landsat'
var v_period_g = 'Sep';
var v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)

var v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_all_pts.merge(v_result)

// Sent2 May
pts_to_process = pts_vars_sent2_may; //pts_lpi_sent2_may;
v_sensor_g = 'Sent2';
v_period_g = 'May';
v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)
v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_all_pts.merge(v_result)

// Sent2 Sep
pts_to_process = pts_vars_sent2_sep; //pts_lpi_sent2_sep;
v_sensor_g = 'Sent2';
v_period_g = 'Sep';
v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)
v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_all_pts.merge(v_result)

// PScope May
pts_to_process = pts_vars_pscope_may; //pts_lpi_pscope_may;
v_sensor_g = 'PScope';
v_period_g = 'May';
v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)

var v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_all_pts.merge(v_result)

// PScope Sep
var pts_to_process = pts_vars_pscope_sep; // pts_lpi_pscope_sep;
var v_sensor_g = 'PScope';
var v_period_g = 'Sep';
var v_mean_g = pts_to_process.filter('area_ha >= 0.5')
                           .aggregate_mean(v_metric_g)
var v_result = v_srer_polys.map(Set_Coverage_Extent).distinct('id')
v_all_pts = v_all_pts.merge(v_result).select(['id','E_State','area','pct_eroded','period','sensor','totalPix','total_eroded'])

Map.addLayer(v_srer_polys,{color:'yellow'},'Polys', true, 0.5)
Map.addLayer(pts_lpi_landsat_may, {}, 'PTS')

// Get Collapsed
var v_results = v_all_pts.merge(Get_Collapsed('Landsat', v_all_pts))
                       .merge(Get_Collapsed('Sent2', v_all_pts))
                       .merge(Get_Collapsed('PScope', v_all_pts));

// Export final table

// For Drone based
// Export_Table(v_results, v_metric_g+'_drone_based_for_viz_BarPlot');
// For Model based
Export_Table(v_results, v_metric_g+'_model_based_for_viz_BarPlot');


            
