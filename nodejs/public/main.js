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

