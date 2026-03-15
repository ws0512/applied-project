import { captureNextClickOnMap, addmarker, clearMarkers, drawMarkers, drawMarker, requestRoute} from "./map.js";

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
    setTimeout(() => {
        document.getElementById("map").invalidateSize();
    }, 300);

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

// Add new point
addBtn.addEventListener("click", () => {
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

    const lngInput = document.createElement("input");
    lngInput.classList = ["lng"];
    lngInput.type = "number";
    lngInput.style = "flex: 1; width: 110px";
    lngInput.placeholder = "Longitude";

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
    })
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
});

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
