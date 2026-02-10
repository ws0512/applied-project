# pip install pandas openpyxl folium

import pandas as pd
import folium
from folium.plugins import HeatMap, MarkerCluster

# ---- load your spreadsheet ----
#xlsx_path = '/Users/sk/Downloads/brum only spreadsheet.xlsx'# if running elsewhere, put the full path
xlsx_path = 'C:/Users/g4l4x/Desktop/applied project/CrimeSpreadsheet.xlsx'# if running elsewhere, put the full path
df = pd.read_excel(xlsx_path)

# ---- clean lat/lon ----
df = df.dropna(subset=["Latitude", "Longitude"]).copy()
df["Latitude"] = pd.to_numeric(df["Latitude"], errors="coerce")
df["Longitude"] = pd.to_numeric(df["Longitude"], errors="coerce")
df = df.dropna(subset=["Latitude", "Longitude"])

# ---- group "same place" points together (prevents 50 markers on the exact same pixel) ----
# If you want EACH record as its own marker, set rounding smaller (e.g. 6) or remove grouping.
df["lat_r"] = df["Latitude"].round(5)
df["lon_r"] = df["Longitude"].round(5)

# ---- center map ----
center_lat = float(df["Latitude"].mean())
center_lon = float(df["Longitude"].mean())
m = folium.Map(location=[center_lat, center_lon], zoom_start=12, tiles="CartoDB positron")

# ---- heatmap ----
HeatMap(
    df[["Latitude", "Longitude"]].values.tolist(),
    radius=18,
    blur=14,
    min_opacity=0.25,
    name="Heatmap"
).add_to(m)

# ---- clickable markers (clustered until zoom) ----
cluster = MarkerCluster(
    name="Clickable points",
    options={
        "showCoverageOnHover": False,
        "disableClusteringAtZoom": 17  # once you zoom in far enough, you click individual points
    }
).add_to(m)

# Choose which columns you want to show in the popup (only those that exist will be used)
cols_wanted = ["Month", "Crime type", "Location", "Outcome type", "Last outcome category"]
cols_show = [c for c in cols_wanted if c in df.columns]

# If none of those columns exist, show everything except the helper columns
if len(cols_show) == 0:
    cols_show = [c for c in df.columns if c not in ["Latitude", "Longitude", "lat_r", "lon_r"]]

grouped = df.groupby(["lat_r", "lon_r"])

for (lat, lon), g in grouped:
    g2 = g.copy()

    # Keep the popup readable (still shows "actual info", but avoids 500-row popups)
    # If you truly want ALL rows always, remove the head(60) bit.
    max_rows = 60
    more = len(g2) - max_rows
    g2 = g2[cols_show].head(max_rows)

    # build an HTML table for the popup
    table_html = g2.to_html(index=False, escape=True)

    header = f"<div style='font-weight:bold; font-size:14px; margin-bottom:6px;'>Records at this point: {len(g)}</div>"
    note = ""
    if more > 0:
        note = f"<div style='color:#666; font-size:12px; margin-top:6px;'>Showing first {max_rows} rows (+{more} more).</div>"

    popup_html = f"""
    <div style="font-family:Arial; width:520px;">
      {header}
      <div style="max-height:320px; overflow:auto; border:1px solid #ddd; padding:6px;">
        {table_html}
      </div>
      {note}
      <div style="color:#666; font-size:11px; margin-top:6px;">
        Tip: zoom in to separate points (clusters break apart at zoom 17).
      </div>
    </div>
    """

    folium.Marker(
        location=[float(lat), float(lon)],
        popup=folium.Popup(popup_html, max_width=650),
        tooltip=f"{len(g)} record(s) here"
    ).add_to(cluster)

folium.LayerControl(collapsed=False).add_to(m)

out_file = "brum_crime_map_clickable.html"
m.save(out_file)
print("Saved:", out_file)
print("Open the HTML file in your browser.")
