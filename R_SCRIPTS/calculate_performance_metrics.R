################################################################################
# Script to generate performance metrics of table 2 & 3 of manuscript "UAV AND 
# SATELLITE-BASED SENSING TO MAP ECOLOGICAL STATES AT THE LANDSCAPE SCALE".
# Guillermo Ponce 06/12/2023
################################################################################

# Load libraries and functions -------------------------------------------------
v_libs <- c(
  'data.table','gt'
)
v_installed_libs <- v_libs %in% rownames(
  installed.packages()
)
if(any(v_installed_libs == F)) {
  install.packages(
    v_libs[!v_installed_libs]
  )
}
invisible(lapply(
  v_libs,
  library, 
  character.only = T
))


# Functions section -------------------------------------------------------

# Calculate metrics Accuracy, Specificity, Sensitivity
Get_metrics <- function (dt,v_period, v_sensor) {
  # Accuracy, Specificity, Sensitivity
  # Accuracy: (TP + TN) / (TP + FP + TN + FN)
  # Sensitivity: TP / (TP + FN)
  # Specificity: TN / (TN + FP)
  data <- dt[area >= 0.5 & (E_State == 'LSG' | E_State == 'LSE')]
  TN <- nrow(data[E_State == 'LSG' & pct_eroded < 50 & period == v_period & sensor == v_sensor])
  FN <- nrow(data[E_State == 'LSG' & pct_eroded >= 50 & period == v_period & sensor == v_sensor])
  FP <- nrow(data[E_State == 'LSE' & pct_eroded < 50 & period == v_period & sensor == v_sensor])
  TP <- nrow(data[E_State == 'LSE' & pct_eroded >= 50 & period == v_period & sensor == v_sensor])
  cat('*** Classification Performance Metrics ***','\n')
  cat('Accuracy:', (TP + TN) / (TP + FP + TN + FN), '\n')
  cat('Sensitivity:',TP / (TP + FN), '\n')
  cat('Specificity:',TN / (TN + FP), '\n')
  return (list((TP + TN) / (TP + FP + TN + FN), (TP / (TP + FN)), (TN / (TN + FP))))
}

# DRONE-BASED PERFORMANCE METRICS -----------------------------------------
# For data files see GEE script:
# https://github.com/gponce-ars/esmap/tree/main/GEE_SCRIPTS/data_table_for_barplot.js 

# Create table to store the Drone-based performance metrics
dt_all_drone <- data.table(Resolution=character(), Period=character(), 
                           Acc_LPI=numeric(), Acc_MF=numeric(), Acc_BG=numeric(), 
                           Sen_LPI=numeric(), Sen_MF=numeric(), Sen_BG=numeric(), 
                           Spe_LPI=numeric(), Spe_MF=numeric(), Spe_BG=numeric())

## Load LPI table for Drone-based ----------------------------------------------
dt_lpi<-fread('esm_gee_shp/lpi_bg_drone_based_for_viz_BarPlot.csv')

# Landsat May LPI
res <- Get_metrics(dt_lpi, 'May', 'Landsat')
dt_all_drone <- rbind(dt_all_drone, list('Landsat', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Landsat Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'Landsat')
dt_all_drone <- rbind(dt_all_drone, list('Landsat', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Landsat Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'Landsat')
dt_all_drone <- rbind(dt_all_drone, list('Landsat', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


# Sentinel2 May LPI
res <- Get_metrics(dt_lpi, 'May', 'Sent2')
dt_all_drone <- rbind(dt_all_drone, list('Sent2', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))
# Sentinel2 Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'Sent2')
dt_all_drone <- rbind(dt_all_drone, list('Sent2', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Sentinel2 Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'Sent2')
dt_all_drone <- rbind(dt_all_drone, list('Sent2', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


# Pscope May LPI
res <- Get_metrics(dt_lpi, 'May', 'PScope')
dt_all_drone <- rbind(dt_all_drone, list('PScope', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))
# Pscope Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'PScope')
dt_all_drone <- rbind(dt_all_drone, list('PScope', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Pscope Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'PScope')
dt_all_drone <- rbind(dt_all_drone, list('PScope', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


## Load MF table for drone-based -----------------------------------------------
dt_mf <- fread('esm_gee_shp/mf_bg_drone_based_for_viz_BarPlot.csv')

# Landsat May
res <- Get_metrics(dt_mf, 'May', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Sep
res <- Get_metrics(dt_mf, 'Sep', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]


# Sentinel2 May
res <- Get_metrics(dt_mf, 'May', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Sep
res <- Get_metrics(dt_mf, 'Sep', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope May
res <- Get_metrics(dt_mf, 'May', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Sep
res <- Get_metrics(dt_mf, 'Sep', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

## Load PCT-BG table for drone-based --------------------------------------------
dt_pct <- fread('esm_gee_shp/pct_bg_drone_based_for_viz_BarPlot.csv')

# Landsat May
res <- Get_metrics(dt_pct, 'May', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Sep
res <- Get_metrics(dt_pct, 'Sep', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'Landsat')
dt_all_drone[Resolution == 'Landsat' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]


# Sentinel2 May
res <- Get_metrics(dt_pct, 'May', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Sep
res <- Get_metrics(dt_pct, 'Sep', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'Sent2')
dt_all_drone[Resolution == 'Sent2' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope May
res <- Get_metrics(dt_pct, 'May', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Sep
res <- Get_metrics(dt_pct, 'Sep', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'PScope')
dt_all_drone[Resolution == 'PScope' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]



# MODEL-BASED PERFORMANCE METRICS -----------------------------------------
# Create table to store the Droone-based performance metrics 
dt_all_model <- data.table(Resolution=character(), Period=character(), 
                           Acc_LPI=numeric(), Acc_MF=numeric(), Acc_BG=numeric(), 
                           Sen_LPI=numeric(), Sen_MF=numeric(), Sen_BG=numeric(), 
                           Spe_LPI=numeric(), Spe_MF=numeric(), Spe_BG=numeric())

## Load LPI table Drone-based  -----------------------------------------------
dt_lpi<-fread('esm_gee_shp/lpi_bg_md_model_based_for_viz_BarPlot.csv')

# Landsat May LPI
res <- Get_metrics(dt_lpi, 'May', 'Landsat')
dt_all_model <- rbind(dt_all_model, list('Landsat', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Landsat Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'Landsat')
dt_all_model <- rbind(dt_all_model, list('Landsat', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Landsat Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'Landsat')
dt_all_model <- rbind(dt_all_model, list('Landsat', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


# Sentinel2 May LPI
res <- Get_metrics(dt_lpi, 'May', 'Sent2')
dt_all_model <- rbind(dt_all_model, list('Sent2', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))
# Sentinel2 Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'Sent2')
dt_all_model <- rbind(dt_all_model, list('Sent2', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Sentinel2 Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'Sent2')
dt_all_model <- rbind(dt_all_model, list('Sent2', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


# Pscope May LPI
res <- Get_metrics(dt_lpi, 'May', 'PScope')
dt_all_model <- rbind(dt_all_model, list('PScope', 'May', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))
# Pscope Sep LPI
res <- Get_metrics(dt_lpi, 'Sep', 'PScope')
dt_all_model <- rbind(dt_all_model, list('PScope', 'Sep', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))

# Pscope Collapsed LPI
res <- Get_metrics(dt_lpi, 'collapsed', 'PScope')
dt_all_model <- rbind(dt_all_model, list('PScope', 'Collapsed', res[[1]],NA,NA,res[[2]],NA,NA,res[[3]],NA,NA))


## Load MF table for drone-based -----------------------------------------------
dt_mf <- fread('esm_gee_shp/mf_bg_md_model_based_for_viz_BarPlot.csv')

# Landsat May
res <- Get_metrics(dt_mf, 'May', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Sep
res <- Get_metrics(dt_mf, 'Sep', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]


# Sentinel2 May
res <- Get_metrics(dt_mf, 'May', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Sep
res <- Get_metrics(dt_mf, 'Sep', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope May
res <- Get_metrics(dt_mf, 'May', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'May', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Sep
res <- Get_metrics(dt_mf, 'Sep', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'Sep', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Collapsed 
res <- Get_metrics(dt_mf, 'collapsed', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'Collapsed', c('Acc_MF','Sen_MF','Spe_MF'):= list(res[[1]],res[[2]],res[[3]])]

## Load PCT-BG table for drone-based --------------------------------------------
dt_pct <- fread('esm_gee_shp/pct_bg_md_model_based_for_viz_BarPlot.csv')

# Landsat May
res <- Get_metrics(dt_pct, 'May', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Sep
res <- Get_metrics(dt_pct, 'Sep', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Landsat Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'Landsat')
dt_all_model[Resolution == 'Landsat' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]


# Sentinel2 May
res <- Get_metrics(dt_pct, 'May', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Sep
res <- Get_metrics(dt_pct, 'Sep', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# Sentinel2 Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'Sent2')
dt_all_model[Resolution == 'Sent2' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope May
res <- Get_metrics(dt_pct, 'May', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'May', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Sep
res <- Get_metrics(dt_pct, 'Sep', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'Sep', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]

# PScope Collapsed 
res <- Get_metrics(dt_pct, 'collapsed', 'PScope')
dt_all_model[Resolution == 'PScope' & Period == 'Collapsed', c('Acc_BG','Sen_BG','Spe_BG'):= list(res[[1]],res[[2]],res[[3]])]


# Generate tables ---------------------------------------------------------

## Drone-based -------------------------------------------------------------
dt_table_drone <- dt_all_drone |>   
  gt() |>
  opt_stylize(style = 1) |> 
  fmt_number(columns = c(3:11), decimals = 2) |>
  cols_label(Acc_LPI = 'LPI',
             Acc_MF = 'MF',
             Acc_BG = 'BG',
             Sen_LPI = 'LPI',
             Sen_MF = 'MF',
             Sen_BG = 'BG',
             Spe_LPI = 'LPI',
             Spe_MF = 'MF',
             Spe_BG = 'BG') |>
  cols_align(
    align = "center",
    columns = c(3:11)) |>
  tab_spanner(
    id = 'Acc',
    label = "Accuracy",
    columns = c(3:5)
  ) |> 
  tab_spanner(
    id ='Sen',
    label = "Sensitivity",
    columns = c(6:8)
  ) |>
  tab_spanner(
    id = 'Spe',
    label = "Specificity",
    columns = c(9:11)
  ) |>
  tab_style(
    style = cell_text(color = "black", weight = "bold"),
    locations = list(
      cells_column_spanners(c('Acc','Sen','Spe')),
      cells_column_labels(everything())
    )
  ) |>
  tab_options(
    table.font.names = "Times New Roman",
    column_labels.border.top.color = "white",
    column_labels.border.top.width = px(3),
    column_labels.border.bottom.color = "black",
    column_labels.border.bottom.width = px(2),
    column_labels.vlines.color = "transparent",
    table_body.hlines.color = "gray",
    table_body.border.bottom.color = 'gray',
    table.border.bottom.color = "transparent",
    table.font.size ="10px"
  )  |>
  tab_header(
    title = md("**Table 2.** Summary statistics for drone-based ecological states mapping")
  )
dt_table_drone
gtsave(dt_table_drone,'outputs/ms/tables/table2.png')


## Model-based -------------------------------------------------------------
dt_table_model <- dt_all_model |>   
  gt() |>
  opt_stylize(style = 1) |> 
  fmt_number(columns = c(3:11), decimals = 2) |>
  cols_label(Acc_LPI = 'LPI',
             Acc_MF = 'MF',
             Acc_BG = 'BG',
             Sen_LPI = 'LPI',
             Sen_MF = 'MF',
             Sen_BG = 'BG',
             Spe_LPI = 'LPI',
             Spe_MF = 'MF',
             Spe_BG = 'BG') |>
  cols_align(
    align = "center",
    columns = c(3:11)) |>
  tab_spanner(
    id = 'Acc',
    label = "Accuracy",
    columns = c(3:5)
  ) |> 
  tab_spanner(
    id ='Sen',
    label = "Sensitivity",
    columns = c(6:8)
  ) |>
  tab_spanner(
    id = 'Spe',
    label = "Specificity",
    columns = c(9:11)
  ) |>
  tab_style(
    style = cell_text(color = "black", weight = "bold"),
    locations = list(
      cells_column_spanners(c('Acc','Sen','Spe')),
      cells_column_labels(everything())
    )
  ) |>
  tab_options(
    table.font.names = "Times New Roman",
    column_labels.border.top.color = "white",
    column_labels.border.top.width = px(3),
    column_labels.border.bottom.color = "black",
    column_labels.border.bottom.width = px(2),
    column_labels.vlines.color = "transparent",
    table_body.hlines.color = "gray",
    table_body.border.bottom.color = 'gray',
    table.border.bottom.color = "transparent",
    table.font.size ="10px"
  )  |>
  tab_header(
    title = md("**Table 3.** Summary statistics for model-based ecological states mapping")
  )

dt_table_model
gtsave(dt_table_model,'outputs/ms/tables/table3.png')


