const TILE_ZOOM = 15; //1.22 km x 1.22 km

/*Tile Zoom (z)	Tile width (km)   
0	40,075 km	40,075 km	 
1	20,037 km	20,037 km	
2	10,018 km	10,018 km	 
3	5,009 km	5,009 km	   
4	2,504 km	2,504 km	    
5	1,252 km	1,252 km	   
6	626 km	    626 km	     
7	313 km	    313 km	      
8	156 km	    156 km	      
9	78 km	    78 km	    
10	39 km	    39 km	     
11	19.5 km	    19.5 km	     
12	9.8 km	    9.8 km	       
13	4.9 km	    4.9 km	       
14	2.45 km	    2.45 km	       
15	1.22 km	    1.22 km	       
16	610 m	    610 m	     
17	305 m	    305 m	     
18	153 m	    153 m	      
19	76 m	    76 m	     
20	38 m	    38 m	    
*/
let fetchedTiles = new Set();
let loadedPointIds = new Set();

var map = L.map('map').setView([52.4823, -1.8911], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


const heat = L.heatLayer([], {
    radius: 16,
    blur: 10,
    maxZoom: 17
}).addTo(map);

const markers = L.markerClusterGroup({
    zoomToBoundsOnClick: false,
    spiderfyOnMaxZoom: true,    
    maxClusterRadius: 40,                            // 80 default
    //disableClusteringAtZoom: 16
});

const UILayer = L.control({position: "bottomleft"})

UILayer.onAdd = function(map) {
    const div = L.DomUtil.create("div", "map-overlay bottom-left-overlay");
    div.innerHTML = 
    `<p class="noti-text">Zoom in to load point</p>
    <a href='#' id="noti-exit-btn" class='button'>X</a>`

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.querySelector("#noti-exit-btn").addEventListener("click", (e) => {
        e.preventDefault();
        div.style.display = "none";
    })

    return div;
};
UILayer.addTo(map);

const topRightUI = L.control({position: "topright"});

topRightUI.onAdd=function(map) {
    const div = L.DomUtil.create("div", "map-overlay top-right-overlay");
    div.innerHTML = 
    `<a href='#' id='refresh-intensity' class='button'>Refresh Intensity</a>`;
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);

    div.querySelector("#refresh-intensity").addEventListener("click", (e) => {
        e.preventDefault();
        updateIntensity();
    });
    return div;
}
topRightUI.addTo(map);

// only show markers when zoomed in close
const showMarkersPastZoom = 16;
map.on("zoomend", () => {
    if (map.getZoom() >= showMarkersPastZoom) {
            if (!map.hasLayer(markers)) map.addLayer(markers);
    } else {
        if (map.hasLayer(markers)) map.removeLayer(markers);

    }
})

fetch("/api/crime")
.then(res => res.json())
.then(data => {
    // create heatmap layer based on the points provided by the database
    
    const Points = data.map(row => [
        row.latitude, 
        row.longitude, 
        row.intensity_base
    ]);
    Points.forEach(point => {
        heat.addLatLng(point);
    });

    // create clusters of markers if points are close together and includes popups
    

    data.forEach(row => {
        const marker = L.marker([row.latitude, row.longitude]);

        marker.bindPopup(`
            <b>${row.crime_type}</b><br>
            Location: ${row.location || 'N/A'}<br>
            Intensity: ${row.intensity_base}
        `);

        markers.addLayer(marker);
    });
    
    

    map.addLayer(markers);
})
.catch(err => console.error("Error fetching crime data:", err));

map.on("zoomend", (e) => {
    if(map.getZoom() < 13) {
        document.getElementById("noti-exit-btn").parentElement.style.display = "flex";
        return
    }
    else {
        document.getElementById("noti-exit-btn").parentElement.style.display = "none";
    }
})

map.on("moveend", (e) => {
    //console.log(map.getZoom())
    //console.log("moveend run getting ranged points on  the map")
    
    if(map.getZoom() < 14) {
        return
    };

    //console.log("setting variables")
    const bounds = map.getBounds();
    const nw = bounds.getNorthWest();
    const se = bounds.getSouthEast();
    //console.log(nw)
    //console.log(se)

    const tileNW = LatLngToTile(nw.lat, nw.lng, TILE_ZOOM);
    const tileSE = LatLngToTile(se.lat, se.lng, TILE_ZOOM);
    //console.log(tileNW)
    //console.log(tileSE)

    let minLat,maxLat, minLng,maxLng = null;
    let uniqueTiles = false;
    for(let x = tileNW.x; x <= tileSE.x; x++) {
        for(let y = tileNW.y; y <= tileSE.y; y++) {
            const tileKey = `${TILE_ZOOM}/${x}/${y}`;
            //console.log(tileKey);

            if(fetchedTiles.has(tileKey)) continue;
            uniqueTiles = true;
            fetchedTiles.add(tileKey);
            const b = tileToBounds(x, y, TILE_ZOOM);

            if(minLat == null || minLat > b.minLat) minLat = b.minLat;
            if(maxLat == null || maxLat < b.maxLat) maxLat = b.maxLat;
            if(minLng == null || minLng > b.minLng) minLng = b.minLng;
            if(maxLng == null || maxLng < b.maxLng) maxLng = b.maxLng;
        }
    }
    if (uniqueTiles) {
        fetchTileData(minLat,maxLat,minLng,maxLng);
        //TODO: update intensity for these new tiles
        updateIntensity(minLat,maxLat,minLng,maxLng);
    }

    //console.log(heat._latlngs)

})





function LatLngToTile(Lat,Lng, zoom) {
    //lattitude and longitude convert to a tile grid
    const latrad = Lat*Math.PI / 180;
    const n = 2**zoom;

    return {
        x: Math.floor((Lng + 180) / 360 * n),
        y: Math.floor(
            (1-Math.log(Math.tan(latrad) + 1 / Math.cos(latrad)) / Math.PI)
            / 2 * n
        )
    }
}

function tileToBounds(x, y, z) {
    const n = 2 ** z;

    const lng1 = x / n * 360 - 180;
    const lng2 = (x + 1) / n * 360 - 180;

    const lat1 = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI;
    const lat2 = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / n))) * 180 / Math.PI;

    return {
        minLat: lat2,
        maxLat: lat1,
        minLng: lng1,
        maxLng: lng2
    };

}

function fetchTileData(minLat, maxLat, minLng, maxLng) {
    fetch(`/api/crime?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`)
    .then(res => res.json())
    .then(data => {
        console.log(data);
        addPointsToMap(data);
    })
    .catch(console.error);
}



function addPointsToMap(points) {
    if (!Array.isArray(points)) {
        console.error("addPointsToMap expected array, got:", typeof points);
        return;
    }

    points.forEach(p => {
        // guards
        if (
            p == null ||
            typeof p.latitude !== "number" ||
            typeof p.longitude !== "number"
        ) {
            return;
        }

        if (p.id != null) {
            if (loadedPointIds.has(p.id)) return;
            loadedPointIds.add(p.id);
        }

        const marker = L.marker([p.latitude, p.longitude]);

        if (p.crime_type || p.location) {
            marker.bindPopup(`
                <b>${p.crime_type ?? "Unknown"}</b><br>
                Location: ${p.location ?? "N/A"}<br>
                Intensity: ${p.intensity_base ?? "N/A"}
            `);
        }

        markers.addLayer(marker);
        let count = 0
        heat._latlngs.forEach((e) => {
            if(p.longitude+0.0005 > e[1] && p.longitude-0.0005 < e[1] && p.latitude+0.0005 > e[0] && p.latitude-0.0005 < e[0]) {
                count++;
            }
        })
        heat.addLatLng([
            p.latitude,
            p.longitude,
            ((2*Math.pow((p.intensity_base ?? 0.1),2))+0.2)*(1/((1)*count + 1)) // use p.intensity_base unless it is null then use 0.1 
        ]);
    });
}

function updateIntensity(minLat, maxLat, minLng, maxLng) {
    heat._latlngs.forEach((point) => {

        if(point[0] < minLat || point [0] > maxLat) return      // return is continue for a forEach() loop
        if(point[1] < minLng || point [1] > maxLng) return

        let I_total = Number(point[2]);
        let I_max = Number(point[2]);
        let count = 1;
        heat._latlngs.forEach((point2) => {
            if(point2[1] < point[1]+0.0005 && point2[1] > point[1]-0.0005 && point2[0] < point[0]+0.0005 && point2[0] > point[0]-0.0005) {
               I_total += Number(point2[2]);
               if(Number(point2[2]) > I_max) I_max = Number(point2[2]);
               count++;
            }
        })
        point[2]=String(
            Math.max(0, 
                Math.min(
                    (Number(point[2])* (Math.log(1+I_total)/Math.log(1+I_max))),
                    1
                )
            )
        )
        //console.log("\tI_total:", I_total,"\tI_max:", I_max,"\tcount:",  count, "\tpoint:", point);
    })
    heat.redraw()
}
