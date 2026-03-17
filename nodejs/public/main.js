import { captureNextClickOnMap, addmarker, clearMarkers, drawMarkers, drawMarker, requestRoute, map, disableclickpropagation} from "./map.js";

document.getElementById("login-header-button").addEventListener("click", e => {
    document.getElementById("popup-wrapper").classList.add("active");
})

document.getElementById("close-login").addEventListener("click", e => {
    document.getElementById("popup-wrapper").classList.remove("active");
})

function displaywarning(text, time) {
    const id = `TEMPORARY_${Math.random().toString(36).slice(2, 10)}`
    if(document.getElementById(id)) return;
    const p = document.createElement("p");
    const li = document.createElement("li");
    p.textContent = text;
    p.style.color = "#d00000";
    li.append(p);
    li.id = id;
    document.getElementById("popup-content").getElementsByTagName("ul")[0].appendChild(li);
    setTimeout(()=>{document.getElementById(id).remove()}, time);
}


//LOGIN BTN
document.getElementById("login-con-login-btn").addEventListener("click", async e => {
    const username = document.getElementById("username-login-input").value;
    const password = document.getElementById("password-login-input").value;
    console.log(username);
    console.log(password);


    if(username.length < 4) {
        displaywarning("username must be at least 4 characters long", 5000);
    }
    else if(password.length < 8) {
        displaywarning("password must be atleast 8 characters long", 5000);
    }
    //insert a bunch of other checks here like anti sql injection
    else{
        try {
            console.log("else");
            const res = await fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            console.log(data);
            if(res.status !== 200) throw Error(data.error);
            const tokendata = await authenticateUser();
            console.log(tokendata);
            showLoggedInUser(tokendata);
            document.getElementById("popup-wrapper").classList.remove("active");
        }
        catch(err) {
            displaywarning(`error has occured: ${err}`,5000)
        }
    }
})


// SIGN UP BUTTON
document.getElementById("login-con-signup-btn").addEventListener("click", async e => {
    const username = document.getElementById("username-login-input").value;
    const password = document.getElementById("password-login-input").value;
    let req = {username, password};
    const res = await fetch("/create-account",{
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req)
    })
    const data = await res.json();
    if(!res.ok) {
        displaywarning(`Error: ${data.error}`, 5000);
        return;
    };
    console.log(data);
    const tokendata = await authenticateUser();
    console.log(tokendata);
    showLoggedInUser(tokendata);
    document.getElementById("popup-wrapper").classList.remove("active");
})

async function authenticateUser() {
    try {
        console.log("gonna authenticate");
        const res = await fetch("/auth-me", {method: "GET", credentials: "include"})
        const data = await res.json()
        return data.payload;
    }
    catch(err) {
        console.error(err); 
    }
}

window.addEventListener("DOMContentLoaded", async (e) => {
    console.log(1);
    try{
        authenticateUser()
        .then(res => {
            console.log(`res: ${res}`)
            if(res.loggedIn) {
                showLoggedInUser(res);
            }
        })

    }catch(err) {
        console.error(err);
    }
})

function showLoggedInUser(user) {
    console.log(2);
    fetch("/profile/get-pfp",{method: "GET", headers: { "Content-Type": "application/json" },credentials: "include"}).then(res => res.json()).then(data => {user.pfpB64 = data.profile_icon; document.getElementById("header-pfp").src = "data:image/png;base64," + data.profile_icon})
    document.getElementById("login-header-button").style.display = "none";
    document.getElementById("login-content-header").insertAdjacentHTML("beforeend",
        `<span id="login-header-span" class="user" style="white-space: nowrap;display: inline-flex;align-items: center;gap: 1rem;">
            <img id="header-pfp" scr="data:image/png;base64,${user.pfpB64}" style="max-width: 40px; border: 2px solid grey; border-radius: 5px">
            <p id="profile-header-text" style="cursor: pointer;">${user.username}</p>
            <button id="header-logout-btn">Logout</button>
        </span>`
    )
    document.getElementById("profile-header-text").addEventListener("click", e => {
        if(!document.getElementById("profile-viewer")) {
            document.body.insertAdjacentHTML("beforeend",
                `<div id="profile-viewer" style="position: absolute; max-width: 20vw; min-height: 20vh; top: 65px; right: 10px; z-index: 99999; background-color: white; padding: 1rem; border: 1px solid black; border-radius: 5px;">
                    <button id="close-profile-viewer" style="background-color: red; border-radius:99px; padding: 1px 4px; color: #d8d8d8; font-weight: bold;">x</button><br> 
                    <img id="profile-content-pfp" src="data:image/png;base64,${user.pfpB64}" style="max-width: 128px; border: 2px solid grey; border-radius: 15px">
                    <button id="pfp-content-change-image">change profile icon</button>
                    <p>Username: ${user.username}</p>
                    <p>User ID: ${user.UId}</p>
                    <button id="pfp-content-remove-user">remove account</button>
                </div>`
            )
        }
        document.getElementById("pfp-content-remove-user").addEventListener("click", async e => {

            const res = await fetch("/profile/remove",{
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include"
            })
            if(res.ok) {
                console.log("account removed")
            }
        })
        document.getElementById("pfp-content-change-image").addEventListener("click", async e => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.onchange = async () => {
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("image", file);

            const res = await fetch("/profile/upload-pfp", {
                method: "POST",
                body: formData,
                credentials: "include"
            });
            if (res.ok) console.log("icon changed!");
            };
            fileInput.click();
        })
        document.getElementById("close-profile-viewer").addEventListener("click", e => {
            document.getElementById("close-profile-viewer").parentElement.remove();
        })
    })
    document.getElementById("header-logout-btn").addEventListener("click", (e) => {
        fetch("/logout",{method: "POST", credentials: "include"}).then(res => {
            if(res.ok) {
                document.getElementById("login-header-span").remove();
                document.getElementById("login-header-button").style.display = "block";
            }
        })
    })
}




const McButton = document.querySelector("[data-hamburger-menu]");
const McBar1 = McButton.querySelector("b:nth-child(1)");
const McBar2 = McButton.querySelector("b:nth-child(2)");
const McBar3 = McButton.querySelector("b:nth-child(3)");
const sidebar = document.getElementById("sidebar")

McButton.addEventListener("click", () => {

    McButton.classList.toggle("active");
    sidebar.classList.toggle("active")

    if (McButton.classList.contains("active")) {

        McBar1.animate(
            [{ top: "0%" }, { top: "50%" }],
            { duration: 200, fill: "forwards", easing: "ease" }
        );

        McBar3.animate(
            [{ top: "100%" }, { top: "50%" }],
            { duration: 200, fill: "forwards", easing: "ease" }
        ).onfinish = () => {

            McBar3.animate(
                [{ transform: "rotate(0deg)" }, { transform: "rotate(90deg)" }],
                { duration: 800, fill: "forwards", easing: "ease" }
            );

            McButton.animate(
                [{ transform: "rotate(0deg)" }, { transform: "rotate(135deg)" }],
                { duration: 800, fill: "forwards", easing: "ease" }
            );

        };

    } else {

        McBar3.animate(
            [{ transform: "rotate(90deg)" }, { transform: "rotate(0deg)" }],
            { duration: 800, fill: "forwards", easing: "ease" }
        ).onfinish = () => {

            McBar3.animate(
                [{ top: "50%" }, { top: "100%" }],
                { duration: 200, fill: "forwards", easing: "ease" }
            );

        };

        McBar1.animate(
            [{ top: "50%" }, { top: "0%" }],
            { duration: 200, delay: 800, fill: "forwards", easing: "ease" }
        );

        McButton.animate(
            [{ transform: "rotate(135deg)" }, { transform: "rotate(0deg)" }],
            { duration: 800, fill: "forwards", easing: "ease" }
        );

    }

});




const container = document.getElementById("route-point-container");
const addBtn = document.getElementById("add-route-point");
const calcBtn = document.getElementById("calc-route-button");

let pointCount = 0;

// drag state
let dragSrcEl = null;

// helper to handle drag events
    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
    }

    function handleDragEnd() {
    this.classList.remove("dragging");
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const dragging = container.querySelector(".dragging");
        const afterElement = getDragAfterElement(container, e.clientY);
        if (afterElement == null) {
            container.appendChild(dragging);
        } else {
            container.insertBefore(dragging, afterElement);
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll(".point:not(.dragging)")];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
            } else {
            return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

function createControlpoint(lat, lng) {
    pointCount++;
    
    const pointDiv = document.createElement("div");
    pointDiv.className = "point";
    pointDiv.style = "margin: 5px;";
    pointDiv.draggable = true;
    
    const latInput = document.createElement("input");
    latInput.classList = ["lat"];
    latInput.style = "flex: 1;width: 110px";
    latInput.type = "number";
    latInput.placeholder = "Latitude";
    if(lat !== null) latInput.value = lat;
    
    const lngInput = document.createElement("input");
    lngInput.classList = ["lng"];
    lngInput.type = "number";
    lngInput.style = "flex: 1; width: 110px";
    lngInput.placeholder = "Longitude";
    if(lng !== null) lngInput.value = lng;
    
    const btn = document.createElement("button");
    btn.textContent = "🗺️";
    btn.addEventListener("click", () => {
        const lat = parseFloat(latInput.value);
        const lng = parseFloat(lngInput.value);
        if (!isNaN(lat) && !isNaN(lng)) {
            clearMarkers()
            console.log(`Plotting point ${pointCount}:`, lat, lng);
            //addmarker(lat, lng)
            drawMarker(lat, lng);
            //refreshMarkers();
        } else {
            alert("Enter valid coordinates");
        }
    });
    const getFromMapBtn = document.createElement("button");
    getFromMapBtn.textContent = "📍";
    getFromMapBtn.addEventListener("click", () => {
        //alert('Click on the map to select a point!');
        getFromMapBtn.style = "background-color: #0000A080"
        const row = getFromMapBtn.parentElement.closest(".point");
        const lat = row.querySelector('.lat');
        const lng = row.querySelector('.lng');
        captureNextClickOnMap((latlng) => {
            console.log('User clicked:', latlng);
            getFromMapBtn.style = "background-color: #FFFFFFFF"
            lat.value = latlng.lat;
            lng.value = latlng.lng;
            //addmarker(latlng.lat, latlng.lng);
            drawMarker(latlng.lat, latlng.lng);
            //refreshMarkers();
        }, clickMenu)
    })
    
    const removeRow = document.createElement("button");
    removeRow.textContent = "🗑️";
    removeRow.style = "background-color: #FF000080"
    removeRow.addEventListener("click", () => {
        removeRow.parentElement.remove();
    })
    
    pointDiv.append(latInput, lngInput, btn, getFromMapBtn, removeRow);
    container.appendChild(pointDiv);
    
    // attach drag events
    pointDiv.addEventListener("dragstart", handleDragStart);
    pointDiv.addEventListener("dragend", handleDragEnd);
    container.addEventListener("dragover", handleDragOver);
}


// Add new point
addBtn.addEventListener("click", () => createControlpoint(null, null));


// Calculate route in current order
calcBtn.addEventListener("click", () => {
    clearMarkers();
    const points = [...container.querySelectorAll(".point")].map(div => {
        const lat = parseFloat(div.querySelector("input[type=number]:nth-child(1)").value);
        const lng = parseFloat(div.querySelector("input[type=number]:nth-child(2)").value);
        addmarker(lat, lng);
        return { lat, lon: lng };
    });
    drawMarkers(points);
    console.log("Route order:", points);
    requestRoute(points);
// Use points array to plot polyline on map
})

function refreshMarkers() {
    clearMarkers();
    const points = [...container.querySelectorAll(".point")].map(div => {
        const lat = parseFloat(div.querySelector("input[type=number]:nth-child(1)").value);
        const lng = parseFloat(div.querySelector("input[type=number]:nth-child(2)").value);
        addmarker(lat, lng);
        return { lat, lon: lng };
    });
    drawMarkers(points);
}



function reportCrimePopUp(lat, lng) {
    console.log("REPORT MENU");

    let selectedFile = null;

    // TODO aestetics
    document.body.insertAdjacentHTML("beforeend", 
        `<div id="report-crime-menu" style="display: flex; flex-direction: column; position: fixed; top: 50vh; left: 50vw; transform: translate(-50%, -50%); min-width: 45vw; min-height: 30vh; z-index: 1000010; background-color: #e0e0e0; border-radius: 25px; border: #404040 1.7px solid ;padding: 60px 20px;">
        <button style="background-color: red; width: 30px; border-radius: 8px; right: 5px; position: absolute; top: 5px;" onclick="this.parentElement.remove()">X</button>
        <span class="span1" style="width: 100%;"><input id="report-crime-latitude-input" class="lat" type="number" placeholder="latitude" value="${lat}"><input id="report-crime-longitude-input" class="lng" type="number" placeholder="longitude" value="${lng}"><button id="report-crime-get-coords">📍</button></span>
        <span class="span2" style="display: flex; padding: 20px 0px;"><p style="margin: 4px 10px;">Name the crime: </p><input type="string" id="report-crime-type" style="flex: 1;"></span>
        <span>Crime Intensity: <input type="range" min="0" max="1" value="0.3" step="0.01" id="crime-intensity-slider" style="flex: 1;"><p>Value: <span id="crime-intensity-slider-value">0.3</span></p></span>
        <span><img style="max-width:15vh;max-height:15vh" id="report-crime-image-preview" src=""><button id="crime-add-image">Add picture of a crime (optional)</button></span>
        <span><button id="crime-report-submit">Submit</button></span>
        </div>`
    )
        
    disableclickpropagation(document.getElementById("report-crime-menu"));
    const btn = document.getElementById("report-crime-get-coords")
    btn.style = "background-color: #0000A080"
    const row = btn.parentElement;

    document.getElementById("crime-intensity-slider").addEventListener("input", () => {
        document.getElementById("crime-intensity-slider-value").textContent = document.getElementById("crime-intensity-slider").value;
    });

    const latinp = row.querySelector('.lat');
    const lnginp = row.querySelector('.lng');
    captureNextClickOnMap((latlng) => {
        console.log('[Report menu]: User clicked:', latlng);
        btn.style = "background-color: #FFFFFFFF"
        latinp.value = latlng.lat;
        lnginp.value = latlng.lng;
        //addmarker(latlng.lat, latlng.lng);
        drawMarker(latlng.lat, latlng.lng);
        //refreshMarkers();
    }, clickMenu)

    document.getElementById("crime-add-image").addEventListener("click", () => {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        
        fileInput.onchange = () => {
            selectedFile = fileInput.files[0];
            
            // preview
            if (selectedFile) {
                const img = document.getElementById("report-crime-image-preview");
                img.src = URL.createObjectURL(selectedFile);
                img.style.display = "block";
            }
        };
        
        fileInput.click();
    });
    document.getElementById("crime-report-submit").addEventListener("click", async () => {
        const crimetype = document.getElementById("report-crime-type").value;
        const instensityinp = document.getElementById("crime-intensity-slider").value;

        const formData = new FormData();
        formData.append("lat", latinp.value);
        formData.append("lng", lnginp.value);
        formData.append("intensity", instensityinp)
        formData.append("crimetype", crimetype);

        // only add image if present ✅
        if (selectedFile) {
            formData.append("image", selectedFile);
        }
        console.log(formData)
        const res = await fetch("/api/crime/report", {
            method: "POST",
            body: formData,
            credentials: "include"
        });

        if (res.ok) {
            console.log("Crime reported!");
            document.getElementById("report-crime-menu").remove();
        } else {
            console.error("Failed to report crime");
        }
    });
}



function clickMenu(e) {
    console.log("clicking :) ",e);
    console.log("clientY: ", e.originalEvent.clientY)
    if(document.getElementById("clickMenu")) document.getElementById("clickMenu").remove();
    const root = document.body;


    const maindiv = document.createElement("div")
    maindiv.id = "clickMenu"
    maindiv.style = `position: fixed; top: ${e.originalEvent.clientY}px; left: ${e.originalEvent.clientX}px; min-width: 10vw; height: fir-content; background-color: #e0e0e0; z-index: 1000000; border: #404040 1px solid ;border-radius: 10px; padding: 10px;`

    const addPointToRoute = document.createElement("p");
    addPointToRoute.textContent = "Add controlpoint to the route";
    addPointToRoute.style = "size: 0.7rem;"
    addPointToRoute.addEventListener("click", () => createControlpoint(e.latlng.lat, e.latlng.lng))

    const reportCrime = document.createElement("p")
    reportCrime.textContent = "report a crime at this location";
    reportCrime.style = "";
    reportCrime.addEventListener("click", () => { if(!document.getElementById("report-crime-menu")) {reportCrimePopUp(e.latlng.lat, e.latlng.lng)}})

    root.append(maindiv);
    maindiv.append(addPointToRoute);
    maindiv.append(reportCrime);
    map.on("movestart", e => maindiv.remove()) 

}

map.on("click", clickMenu);


document.getElementById("alt-route-slider").addEventListener("input", () => {
    document.getElementById("alt-route-slider-value").textContent = document.getElementById("alt-route-slider").value;
});

