document.getElementById("login-header-button").addEventListener("click", e => {
    document.getElementById("popup-wrapper").classList.add("active");
})

document.getElementById("close-login").addEventListener("click", e => {
    document.getElementById("popup-wrapper").classList.remove("active");
})


document.getElementById("login-con-login-btn").addEventListener("click", e => {
    const username = document.getElementById("username-login-input").value;
    const password = document.getElementById("password-login-input").value;
    console.log(username);
    console.log(password);

    function displaywarning(text, time) {
        const id = `TEMPORARY_{Math.random().toString(36).slice(2, 10)}`
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

    if(username.length < 4) {
        displaywarning("username must be at least 4 characters long", 5000);
    }
    else if(password.length < 8) {
        displaywarning("password must be atleast 8 characters long", 5000);
    }
    //insert a bunch of other checks here like anti sql injection
    else{
        console.log("else");
        fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        })
        .then(res => res.json().then(data => ({resStatus: res.status, data: data})))
        .then(({resStatus, data}) => {
            if(resStatus !== 200) throw Error(data.error);
            console.log(data);
        })
        .catch(err => displaywarning(`error has occured: ${err}`,30000))
    }
})

document.getElementById("login-con-signup-btn").addEventListener("click", e => {
    fetch("/profile", {method: "GET", credentials: "include"})
    
})

