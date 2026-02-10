const TILE_ZOOM = 15; //1.22 km x 1.22 km
let fetchedTiles = new Set();

var map = L.map('map').setView([52.4823, -1.8911], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


fetch("/api/crime")
.then(res => res.json())
.then(data => {
    // create heatmap layer based on the points provided by the database
    const Points = data.map(row => [
        row.latitude, 
        row.longitude, 
        row.intensity_base
    ]);
    const heat = L.heatLayer(Points, {
        radius: 25,
        blur: 15,
        maxZoom: 17
    }).addTo(map);



    // create clusters of markers if points are close together and includes popups
    const markers = L.markerClusterGroup({
        zoomToBoundsOnClick: false,
        spiderfyOnMaxZoom: true,    
        maxClusterRadius: 40,                            // 80 default
        //disableClusteringAtZoom: 16
    });

    data.forEach(row => {
        const marker = L.marker([row.latitude, row.longitude]);

        marker.bindPopup(`
            <b>${row.crime_type}</b><br>
            Location: ${row.location || 'N/A'}<br>
            Intensity: ${row.intensity_base}
        `);

        markers.addLayer(marker);
    });
    // only show markers when zoomed in close
    const showMarkersPastZoom = 16;
    map.on("zoomend", () => {
        if (map.getZoom() >= showMarkersPastZoom) {
                if (!map.hasLayer(markers)) map.addLayer(markers);
        } else {
            if (map.hasLayer(markers)) map.removeLayer(markers);
        }
    })

    map.addLayer(markers);
})
.catch(err => console.error("Error fetching crime data:", err));



map.on("moveend", (e) => {
    //console.log(map.Points);
    /*
    console.log("\n",e);

    var bounds = map.getBounds();

    var NW = bounds.getNorthWest();
    var centre = map.getCenter();
    console.log(NW);
    console.log("Centre: ",centre);
    console.log("\n-------------");
    
    var centrePoint= map.latLngToContainerPoint(map.getCenter())
    var NorthWestPoint= map.latLngToContainerPoint(map.getBounds().getNorthWest());

    var dif = NorthWestPoint.subtract(centrePoint);
    
    var nNW = dif.multiplyBy(1.5);
    console.log("nNW: ",nNW)
    console.log("nNW LATLNG: ",map.containerPointToLatLng(nNW).lat+" "+map.containerPointToLatLng(nNW).lng)
    

    var nSE = dif.multiplyBy(-1);
    console.log("nSE LATLNG: ",map.containerPointToLatLng(nSE).lat+" "+map.containerPointToLatLng(nSE).lng)
    */
    console.log(map.getZoom())
    
    if(map.getZoom() < 13) {
        //dont load in points
        //TODO: add logic to show notification "zoom in to load points on the map"
        return
    }

    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();

    const tileNW = LatLngToTile(nw.lat, nw.lng);
    const tileSE = LatLngToTile(se.lat, se.lng);

    for(let x = tileNW.x; x <= tileSE.x; x++) {
        for(let y = tileNW.y; y <= tileSE.y; y++) {
            const tileKey = "${TILE_ZOOM}/${x}/${y}";
            if(fetchedTiles.has(tileKey)) continue;
            
            console.log(tileKey);
            fetchedTiles.add(tileKey);
            fetchTileData()

        }
    }



})
function LatLngToTile(Lat,Lng) {
    //lattitude and longitude convert to a tile grid
    const latrad = Lat*Math.PI / 180;
    const n = 2**TILE_ZOOM;

    return {
        x: Math.floor((Lng + 180) / 360 * n),
        y: Math.floor(
            (1-Math.log(Math.tan(latrad) + 1 / Math.cos(latrad)) / Math.PI)
            / 2 * n
        )
    }
}

function fetchTileData(x, y) {
    fetch("/api/crime?")

}