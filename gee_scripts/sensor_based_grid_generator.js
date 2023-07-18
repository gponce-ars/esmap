
// Name: sensor_based_grid_generator.js
// Goal: To create grids from Satellite resolution and export it into Shapefile and/or FeatureViews
// Inputs: 
//    Sensors: Landsat 8-SR, Sentinel-2-SR, PlanetScope
//    Vector:  Sandy Loam Upland and Deep at SRER 
// Outputs: 
//    - Shapefiles with grids and centroids for each resolutions
//    - FeatureViews from grids and centroids 
// Author: Guillermo Ponce (geponce@arizona.edu)
// Date: 01/18/2023
// ------------------------------------------------------------------------------------------------

// Functions ----- 

// Prepare new version of Landsat SR product Collection 2
// Applies scaling factors.
function applyScaleFactors(image) {
  var opticalBands = image.select('SR_B.').multiply(0.0000275).add(-0.2);
  var thermalBands = image.select('ST_B.*').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}


// Study area
var slud = ee.FeatureCollection('users/gponce/usda_ars/assets/vector/srer_sandy_loam')

// Load satellite image from which grid will be extracted


// Landsat ---------------------------------------------------------------------------------------- 
var landsat_col = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2")

// PlanetScope  -----------------------------------------------------------------------------------
var pscope_col = ee.ImageCollection('projects/eminent-tesla-172116/assets/PLANET_SCOPE_SRER')

// Sentinel-2 -------------------------------------------------------------------------------------
var sent2_col = ee.ImageCollection("COPERNICUS/S2_SR")

var v_extent = pscope_col.filterDate('2019-05-01', '2019-05-31').geometry().bounds();


// Landsat Grid -----------------------------------------------------------------------------------
// {
// Dates for Landsat 
var f_date = '2019-05-01', l_date = '2019-05-31';  // May - Landsat

// Get Landsat images
var landsat8 = landsat_col.filterMetadata( 'WRS_PATH','equals', 36)
                       .filterMetadata('WRS_ROW','equals', 38)
                       .filterMetadata('CLOUD_COVER','less_than', 5)
                       .filterDate(f_date,  l_date)
                       .filterBounds(v_extent)
                       .map(applyScaleFactors);
                       
var projLandsat = landsat8.first().projection()

// Get Single Landsat image
var landsat8_img = landsat8.first()
                               .clip(v_extent)
                               .setDefaultProjection({crs:projLandsat.crs(), scale: projLandsat.nominalScale()})


var landsat_grid = slud.geometry().coveringGrid(proj, proj.nominalScale())

var landsat_centroids = landsat_grid.map(function (ft) {
  return ft.centroid(1)
})


Map.addLayer(landsat8_img.select([1]),{min:0, max:0.2},'ImgLandsat')
Map.addLayer(landsat_centroids, {}, 'Centroids_Landsat')
Map.addLayer(landsat_grid,{},'Grid_Landsat')

                 
// Export Grid as FeatureView for further visualizations
Export.table.toFeatureView({
  collection: landsat_grid,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_landsat_grid_srer_slud',
  description: 'ftv_landsat_grid_srer_slud',
  maxFeaturesPerTile: 1500
  // thinningStrategy: 'HIGHER_DENSITY',
  // thinningRanking: ['LENGTHKM DESC'],
  // zOrderRanking: ['LENGTHKM DESC']
});

Export.table.toFeatureView({
  collection: landsat_centroids,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_landsat_grid_centroids_srer_slud',
  description: 'ftv_landsat_grid_centroids_srer_slud',
  maxFeaturesPerTile: 1500
  // thinningStrategy: 'HIGHER_DENSITY',
  // thinningRanking: ['LENGTHKM DESC'],
  // zOrderRanking: ['LENGTHKM DESC']
});

        
// Export Grid as Shapefile
Export.table.toDrive({collection:landsat_grid, 
                      description:'landsat_grid_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'landsat_grid_srer_slud', 
                      fileFormat:'SHP'})
Export.table.toDrive({collection:landsat_centroids, 
                      description:'landsat_grid_centroids_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'landsat_grid_centroids_srer_slud', 
                      fileFormat:'SHP'})     
//}

// Sentinel-2 Grid --------------------------------------------------------------------------------
// {
// Dates for Sentinel-2
var f_date = '2019-05-26', l_date = '2019-05-31';           // May


// Get proj information
var projSent2 = sent2_col.filterDate(f_date, l_date)
                           .filterBounds(v_extent).first().select('B2').projection()
  
  
var sent2_img = sent2_col.filterDate(f_date, l_date)
                           .filterBounds(v_extent)
                           .mosaic()
                           .clip(v_extent)
                           .setDefaultProjection({crs:projSent2.crs(), scale: projSent2.nominalScale()})
                           
var sent2_grid = slud.geometry().coveringGrid(projSent2, projSent2.nominalScale())

var sent2_centroids = sent2_grid.map(function (ft) {
  return ft.centroid(1)
})

// Export Grid as FeatureView for further visualizations
Export.table.toFeatureView({
  collection: sent2_grid,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_sentinel2_grid_srer_slud',
  description: 'ftv_sentinel2_grid_srer_slud',
  maxFeaturesPerTile: 1500
});

Export.table.toFeatureView({
  collection: sent2_centroids,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_sentinel2_grid_centroids_srer_slud',
  description: 'ftv_sentinel2_grid_centroids_srer_slud',
  maxFeaturesPerTile: 1500

});

        
// Export Grid as Shapefile
Export.table.toDrive({collection:sent2_grid, 
                      description:'sent2_grid_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'sent2_grid_srer_slud', 
                      fileFormat:'SHP'})
Export.table.toDrive({collection:sent2_centroids, 
                      description:'sent2_grid_centroids_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'sent2_grid_centroids_srer_slud', 
                      fileFormat:'SHP'})     


//}                       

// PlanetScope Grid -------------------------------------------------------------------------------

// {
var period = 'may'

// Set Date
var f_date = '2019-05-01', l_date = '2019-05-31';           // May


// Use extent from PlanetScope
var projPScope = pscope_col.filterDate('2019-05-01', '2019-05-31').first().projection()



var pscope_2019 = pscope_col.filterDate(f_date, l_date)
                         .filterBounds(v_extent)
                         .mosaic()
                         .clip(v_extent)
                         .setDefaultProjection({crs:projPScope.crs(), scale: projPScope.nominalScale()})


var pscope_grid = slud.geometry().coveringGrid(projPScope, projPScope.nominalScale())

var pscope_centroids = pscope_grid.map(function (ft) {
  return ft.centroid(1)
})

// Export Grid as FeatureView for further visualizations
Export.table.toFeatureView({
  collection: pscope_grid,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_pscope_grid_srer_slud',
  description: 'ftv_pscope_grid_srer_slud',
  maxFeaturesPerTile: 1500

});

Export.table.toFeatureView({
  collection: pscope_centroids,
  assetId: 'users/gponce/usda_ars/assets/ft_views/ftv_pscope_grid_centroids_srer_slud',
  description: 'ftv_pscope_grid_centroids_srer_slud',
  maxFeaturesPerTile: 1500

});

        
// Export Grid as Shapefile
Export.table.toDrive({collection:pscope_grid, 
                      description:'pscope_grid_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'pscope_grid_srer_slud', 
                      fileFormat:'SHP'})
Export.table.toDrive({collection:pscope_centroids, 
                      description:'pscope_grid_centroids_srer_slud', 
                      folder:'esm_gee_outputs', 
                      fileNamePrefix:'pscope_grid_centroids_srer_slud', 
                      fileFormat:'SHP'})     

   
                         
//}
