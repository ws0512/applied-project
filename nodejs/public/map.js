const TILE_ZOOM = 15; //1.22 km x 1.22 km
const GRID_SIZE = 10; // 10x10 cells per tile


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
let tileStore = new Map();
let processedTileIDs = new Set();
let loadedPointIds = new Set();
let routeLocations = new Array();

let MAX_POSSIBLE_INTENSITY = 0.98;
let I_URatio = 0.5;
let I_UMax = 0.333;
let I_USum = 75;
let I_UQuantity = 100;

var map = L.map('map').setView([52.4823, -1.8911], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);


const heat = L.heatLayer([], {
    radius: 18, //16
    blur: 12,
    maxZoom: 14
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
    <a href='#' id="noti-exit-btn" class='button' style="margin-bottom: 8px">X</a>`

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
    //console.log(map.getZoom());
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

    let minLat = null; 
    let maxLat = null;
    let minLng = null;
    let maxLng = null;
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
    }
    
    //console.log(heat._latlngs)
    
})

map.on("click", (e) => {
    console.log(e);
    var myIcon = L.icon({
        iconUrl: 'marker.png',
        iconSize: [64, 64],
        iconAnchor: [32, 64],
        popupAnchor: [0, -64],
        shadowUrl: 'shadow.png',
        shadowSize: [32, 32],
        shadowAnchor: [4, 4]
    });
    routeLocations.push({lat: e.latlng.lat, lon: e.latlng.lng});
    L.marker(e.latlng, {icon: myIcon}).addTo(map);
})

document.getElementById("calc-route-button").addEventListener("click", (e) => {
    console.log(`requesting a route for locations ${routeLocations}`);
    requestRoute(routeLocations);
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

function createTile(x, y) {
    const bounds = tileToBounds(x, y, TILE_ZOOM);
    return {
        x,
        y,
        bounds,
        cells: Array.from({ length: GRID_SIZE * GRID_SIZE }, () => ({
            points: [],
            count: 0,
            intensitySum: 0,
            intensityMax: 0
        }))
    };
}

function pointToCellIndex(lat, lng, bounds) {
    const cx = Math.floor(
        ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * GRID_SIZE
    );

    const cy = Math.floor(
        ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * GRID_SIZE
    );

    // clamp to grid
    const x = Math.max(0, Math.min(GRID_SIZE - 1, cx));
    const y = Math.max(0, Math.min(GRID_SIZE - 1, cy));

    return y * GRID_SIZE + x;
}

function addPointsToTileCells(points) {
    points.forEach(p => {
        // ignore if not the point is not valid
        if (
            typeof p.latitude !== "number" ||
            typeof p.longitude !== "number"
        ) return; 
        // determine tile
        const tileXY = LatLngToTile(p.latitude, p.longitude, TILE_ZOOM);
        const tileKey = `${TILE_ZOOM}/${tileXY.x}/${tileXY.y}`;

        // create tile if needed
        if (!tileStore.has(tileKey)) {
            tileStore.set(tileKey, createTile(tileXY.x, tileXY.y));
        }

        const tile = tileStore.get(tileKey);

        // determine cell
        const idx = pointToCellIndex(
            p.latitude,
            p.longitude,
            tile.bounds
        );

        const cell = tile.cells[idx];

        // add point + stats
        const I = p.intensity_base ?? 0.1;

        cell.points.push(p);
        cell.count++;
        cell.intensitySum += Number(I); // the .intensity_base of a point is technically a string as thats what leaflet heatmap wants as the 3rd value of an array so converting to a number to add a number instead of appending a string.
        cell.intensityMax = Math.max(cell.intensityMax, I);

    });
}


function fetchTileData(minLat, maxLat, minLng, maxLng) {
    fetch(`/api/crime?minLat=${minLat}&maxLat=${maxLat}&minLng=${minLng}&maxLng=${maxLng}`)
    .then(res => res.json())
    .then(data => {
        console.log(`points: ${data.length} in the area: minLat:${minLat} maxLat:${maxLat} minLng:${minLng} maxLng:${maxLng}`);
        //addPointsToMap(data);
        addPointsToTileCells(data);
        //updateIntensity(minLat,maxLat,minLng,maxLng);
        //console.log(tileStore);
        
        tileStore.forEach((tile, key) => {
            if(processedTileIDs.has(key)) return // skip already added tiles
            //console.log(key);
            //console.log(processedTileIDs);
            tile.cells.forEach(cell => {
                if(cell.points.length == 0) return //skip empty cells
                let latSum = 0;
                let lngSum = 0;
                cell.points.forEach(p => {
                    latSum += p.latitude;
                    lngSum += p.longitude;

                    // might as well add these points to the markers while itterating through them here
                    const marker = L.marker([p.latitude, p.longitude]);
                    if (p.crime_type || p.location) {
                        marker.bindPopup(`
                            <b>${p.crime_type ?? "Unknown"}</b><br>
                            Location: ${p.location ?? "N/A"}<br>
                            Intensity: ${p.intensity_base ?? "N/A"}<br>
                            added by: ${p.added_by ?? "N/A"}
                        `);
                    }

                    markers.addLayer(marker);

                })
                //console.log(latSum/cell.points.length+"\t"+lngSum/cell.points.length+"\t"+calculateIntensityOfACell(cell))
                heat.addLatLng([latSum/cell.points.length, lngSum/cell.points.length ,calculateIntensityOfACell(cell)])
            })
            //console.log(key);
            processedTileIDs.add(key);
        });



    })
    .catch(console.error);
}


//@deprecated
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
            ((20*Math.pow((p.intensity_base ?? 0.1),8))+0.2)*(1/((1)*count + 1)) // use p.intensity_base unless it is null then use 0.1 
        ]);
    });
}


function calculateIntensityOfACell(cell) {
    const I_quantity = Math.min(Math.log(1 + cell.count) / Math.log(1 + I_UQuantity), 1);
    const I_sum_component = Math.min(Math.log(1 + cell.intensitySum) / Math.log(1 + I_USum), 1);
    
    const I_combined = I_URatio * I_quantity + (1-I_URatio) * I_sum_component; // adjust 0.5/0.5 for weighting
    const I_final = (1 - I_UMax) * I_combined + I_UMax * (cell.intensityMax / MAX_POSSIBLE_INTENSITY);
    //console.log(`${I_final}\nN: ${cell.count} ${cell.points.length} \tI_Quantity: ${I_quantity} ${cell.count} \tI_sum_component: ${I_sum_component} ${cell.intensitySum} \tI_max ${cell.intensityMax}`)
    return Math.max(0, Math.min(I_final, 1)); // clamp to [0,1]
}

//@Deprecated
function updateIntensity(minLat, maxLat, minLng, maxLng) {
    let counteffected = 0;
    console.log(`bounds minLat ${minLat} maxLat ${maxLat} minLng ${minLng} maxLng ${maxLng}`)
    console.log(`${heat._latlngs[0]}\t${heat._latlngs[1]}\t${heat._latlngs[2]}\t${heat._latlngs[3]}`)
    heat._latlngs.forEach((point) => {
        if(point[0] < minLat || point [0] > maxLat || point[1] < minLng || point [1] > maxLng) return      // return is continue for a forEach() loop
        //console.log(point)
        let I_total = Number(point[2]);
        let I_max = Number(point[2]);
        let count = 1;
        heat._latlngs.forEach((point2) => {
            if(point2[1] < point[1]+0.0005 && point2[1] > point[1]-0.0005 && point2[0] < point[0]+0.0005 && point2[0] > point[0]-0.0005) {
                I_total += Number(point2[2]);
                if(Number(point2[2]) > I_max) I_max = Number(point2[2]);
                count++;
                counteffected++;
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
    console.log(`intensity updated for ${counteffected} points`)
    heat.redraw()
}


/*
L.Routing.control({
  waypoints: [
    L.latLng(56.74, -2.94),
    L.latLng(56.6792, -2.949)
  ]
}).addTo(map);
*/
function requestRoute(locations) {
    fetchRoute(locations)
    .then(fetched => {
        fetched.routes.forEach(route => {
            const polyline = L.polyline(route.coordinates, { color: 'blue', weight: 4 }).addTo(map);
            map.fitBounds(polyline.getBounds());
        })
    })
}

async function fetchRoute(locations) {
    const requestData = {
        locations,
        costing: "pedestrian",
        exclude_polygons: {
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Polygon", 
                    "coordinates":[
                        [[52.47974445953175, -1.9246156254673905],
                        [52.476677710353265, -1.9205333814256134],
                        [52.478675139485524, -1.9148719589983176],
                        [52.48232486016832, -1.9208904199955532],
                        [52.47974445953175, -1.9246156254673905]]
                    ]

                },
                "properties": {
                    "levels": []
                }
            }]
        }
    };
    console.log(requestData);
    const res = await fetch("/api/route", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(requestData)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log(data);
    return data;
}

function createAvoidancePolygons() {
    
}

//fetchRoute().catch(console.error);
/*requestRoute([
    {lat: 52.531458, lon:-1.857663},
    {lat: 52.512840, lon: -1.884576}
])*/




function addStaticPolygon(map, coordinates, options = {}) {
  // Default styling
  const defaultOptions = {
    color: 'blue',        // border color
    fillColor: '#3388ff', // fill color
    fillOpacity: 0.5
  };

  // Merge default options with user-provided options
  const polygonOptions = { ...defaultOptions, ...options };

  // Create the polygon
  const polygon = L.polygon(coordinates, polygonOptions).addTo(map);

  // Fit map bounds to polygon
  map.fitBounds(polygon.getBounds());

  return polygon;
}

// Coordinates for the polygon
const fivePoints =  [[52.50974445953175, -2.0146156254673905],
                        [52.476677710353265, -2.0105333814256134],
                        [52.478675139485524, -2.0348719589983176],
                        [52.50232486016832, -2.0308904199955532],
                        [52.50974445953175, -2.0146156254673905]]

// Add polygon to map
// addStaticPolygon(map, fivePoints, { color: 'red', fillColor: '#f03' });






const url = "https://api.openrouteservice.org/v2/directions/driving-car";

async function testRoute() {
    const start = [-2.0215541124343877, 52.47132487539285];
    const end = [-2.009462714195252, 52.50287051747283];

    // --- 4. Define avoidance polygon [lng, lat] ---
    const avoidPolygon = [
        [52.50974445953175, -2.0146156254673905]
        [52.50232486016832, -2.0308904199955532],
        [52.478675139485524, -2.0348719589983176],
        [52.476677710353265, -2.0105333814256134],
        [52.50974445953175, -2.0146156254673905],
    ];

    // Draw the avoidance polygon
    L.polygon(
        avoidPolygon.map(p => [p[1], p[0]]), // Leaflet uses [lat, lng]
            { color: 'red', fillColor: '#f03', fillOpacity: 0.3 }
    ).addTo(map);

    // --- 5. Prepare ORS request body ---
    const body = {
        coordinates: [start, end],
        options: {
        avoid_polygons: { type: "Polygon", coordinates: [avoidPolygon] }
    }
    };

    // --- 6. Fetch route from ORS ---
    async function fetchRoute() {
    try {
        console.log(body);
        const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car", {
        method: "POST",
        headers: {
            "Authorization": process.env.ORS_KEY,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
        });

        const data = await res.json();
        console.log("ORS response:", data);

        // Decode geometry
        const decoded = polyline.decode(data.routes[0].geometry);

        // Leaflet expects [lat, lng]
        const latlngs = decoded.map(p => [p[0], p[1]]);

        // Draw route polyline
        const routeLine = L.polyline(latlngs, { color: 'blue', weight: 4 }).addTo(map);

        // Fit map to route
        map.fitBounds(routeLine.getBounds());

    } catch (err) {
        console.error(err);
    }
    }
    fetchRoute();
}

/*if (process.env.DEBUG === 1) { 
    testRoute();
}*/