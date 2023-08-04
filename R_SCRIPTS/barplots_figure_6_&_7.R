################################################################################
# Script to generate barplots for figures 6 & 7 of manuscript "UAV AND 
# SATELLITE-BASED SENSING TO MAP ECOLOGICAL STATES AT THE LANDSCAPE SCALE"
# Guillermo Ponce 07/25/2023
################################################################################

# Load libraries and functions -------------------------------------------------
v_libs <- c(
  'data.table','ggplot2'
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

# Generate a bar plot with all the facets for each sensor and period
Get_barPlot_viz <- function (dt, v_title) {
  dt[period == 'collapsed', period:='Collapsed']
  xaxis_color <- Get_xaxis_colors(dt[E_State != 'NNG' & round(area, 5) >= 0.5])
  dt[,sensor:=factor(sensor, levels=c('Landsat','Sent2','PScope'))]
  dt[,period:=factor(period, levels=c('May','Sep','Collapsed'))]
  v_viz <- ggplot(dt[E_State != 'NNG' & round(area, 5) >= 0.5], 
                  aes(x = reorder(round(area, 5),area), y = pct_eroded, 
                      fill=E_State)) + 
    geom_bar(stat = "identity") + 
    geom_hline(yintercept=50, linetype="dashed", color = "blue", size=1) +
    labs(
      x='Polygons (ha.)',
      y= 'Eroded pixels (%)',
      title= v_title,
      subtitle = 'For periods May,September and Collapsed in 2019'
    ) +
    theme(axis.text.x = element_text(angle = 90)) +
    ylim(0, 100) +
    theme(plot.title = element_text(size=20, face='bold')) +
    theme(axis.text.x = element_text(hjust = 1, size=7,#color='grey40',
                                     angle = 90,vjust = 0.5, 
                                     colour = xaxis_color)) +
    theme(axis.text.y = element_text(hjust = 1, size=8,color='grey40')) +
    theme(axis.title.y = element_text(size = 16, face='bold')) +
    theme(axis.title.x = element_text(size = 16, face='bold')) +
    theme(legend.text = element_text(size = 16)) +
    theme(legend.title = element_text(size = 16, face='bold')) +
    theme(plot.caption = element_text(size=18)) + 
    theme(plot.subtitle = element_text(size=16)) +
    theme(text = element_text(family = "Times New Roman")) +
    facet_grid(sensor ~ period)
  
  return (v_viz)
}

# Get the list of colors for E. States
Get_xaxis_colors <- function(dt) {
  
  # Get color for each E. State, this is to color x-axis labels
  dt[,color1:= ifelse(E_State == "LSE", "#F8766D", "#00BFC4")]
  # Since there are differences in polygons covered by sensor and period and we need to color x-axis labels, we need to do this mungling to arrange labels
  lsmay<-dt[order(area)][sensor == 'Landsat' & period == 'May']
  lssep<-dt[order(area)][sensor == 'Landsat' & period == 'Sep']
  stmay<-dt[order(area)][sensor == 'Sent2' & period == 'May']
  stsep<-dt[order(area)][sensor == 'Sent2' & period == 'Sep']
  
  psmay<-dt[order(area)][sensor == 'PScope' & period == 'May']
  pssep<-dt[order(area)][sensor == 'PScope' & period == 'Sep']
  
  setkey(lsmay,'id')
  setkey(lssep, 'id')
  setkey(stmay, 'id')
  setkey(stsep, 'id')
  
  setkey(psmay, 'id')
  setkey(pssep, 'id')
  
  # Check if there's full intersection, if not, fill out the table with less records
  if (nrow(psmay) >= nrow(pssep)) {
    add_to <- list(psmay, 
                   pssep[!psmay],
                   lsmay[!psmay],
                   lssep[!psmay],
                   stmay[!psmay],
                   stsep[!psmay]
    )
  } else {
    add_to <- list(pssep, 
                   psmay[!pssep],
                   lsmay[!pssep],
                   lssep[!pssep],
                   stmay[!pssep],
                   stsep[!pssep]
    )
  }
  #add_to <- ifelse(nrow(psmay) > nrow(pssep), 
  
  #l<-unique(rbindlist(add_to)[,c(2,6,9,12,19,20,24,25,26)])
  #"id","E_State","period","sensor","area","pct_eroded" ,"total_eroded"
  # "totalPix","color1"      
  l<-unique(rbindlist(add_to)[,c(1:9)])
  
  # Use this variable in element_text to color labels from x-axis
  return (l[order(area)]$color1)
  
}

# Figure 6 and 7 Barplot -------------------------------------------------------
# For data files see GEE script:
# https://github.com/gponce-ars/esmap/tree/main/GEE_SCRIPTS/data_table_for_barplot.js 

# Drone-based BarPlots ---------------------------------------------------------

# Drone-based LPI
dt_lpi<-fread('esm_gee_shp/lpi_bg_drone_based_for_viz_BarPlot.csv')
v_title <- 'Drone-based Largest Patch Index (LPI)'
v_viz1<-Get_barPlot_viz(dt_lpi, v_title)
v_viz1
ggsave(plot=v_viz1,
       filename="outputs/ms/plots/Figure_6a.png", 
       width = 11, 
       height = 8.5, dpi = 500)

# Drone-based MF
dt_lpi<-fread('esm_gee_shp/mf_bg_drone_based_for_viz_BarPlot.csv')
v_title <- 'Drone-based Mean Fetch (MF)'
v_viz3<-Get_barPlot_viz(dt_lpi, v_title)
v_viz3
ggsave(plot=v_viz3,filename="outputs/ms/plots/Figure_6b.png", width = 11, 
       height = 8.5, dpi = 500)

# Drone-based PCT-BG
dt_lpi<-fread('esm_gee_shp/pct_bg_drone_based_for_viz_BarPlot.csv')
v_title <- 'Drone-based Percent Bareground (BG)'
v_viz5<-Get_barPlot_viz(dt_lpi, v_title)
v_viz5
ggsave(plot=v_viz5,filename="outputs/ms/plots/Figure_6c.png", width = 11, 
       height = 8.5, dpi = 500)

# Model-based BarPlots ----------------------------------------------------

# Model-based LPI
dt_lpi<-fread('esm_gee_shp/lpi_bg_md_model_based_for_viz_BarPlot.csv')
v_title <- 'Model-based Largest Patch Index (LPI)'
v_viz2<-Get_barPlot_viz(dt_lpi, v_title)
v_viz2
ggsave(plot=v_viz2,filename="outputs/ms/plots/Figure_7a.png", width = 11, 
       height = 8.5, dpi = 500)

# Model-based MF
dt_lpi<-fread('esm_gee_shp/mf_bg_md_model_based_for_viz_BarPlot.csv')
v_title <- 'Model-based Mean Fetch (MF)'
v_viz4<-Get_barPlot_viz(dt_lpi, v_title)
v_viz4
ggsave(plot=v_viz4,filename="outputs/ms/plots/Figure_7b.png", width = 11, 
       height = 8.5, dpi = 500)
# Model-based PCT-BG
dt_lpi<-fread('esm_gee_shp/pct_bg_md_model_based_for_viz_BarPlot.csv')
v_title <- 'Model-based Percent Bareground (BG)'
v_viz6<-Get_barPlot_viz(dt_lpi, v_title)
v_viz6
ggsave(plot=v_viz6, filename="outputs/ms/plots/Figure_7c.png", width = 11, 
       height = 8.5, dpi = 500)
