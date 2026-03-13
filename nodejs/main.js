// some node shit
import 'dotenv/config';
import path from "path";
import { fileURLToPath } from "url";
import polyline from "@mapbox/polyline";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import jsonwebtoken from "jsonwebtoken";
import cookieParser from "cookie-parser";

import crypto from "crypto";
import { Client } from 'pg';
import express from 'express';

import multer from 'multer';
import { json } from 'stream/consumers';

const app=express();
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

/* //jwt test
const token = jsonwebtoken.sign(
    {userID: 2},
    process.env.JWT_SECRET,
    {expiresIn: "48h"}
);
console.log(token);
console.log(jsonwebtoken.verify(token, process.env.JWT_SECRET));
*/

const uploads = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 512*1024} //512 KiB
})

const connection = new Client({
    host: "localhost",
    user: "account1",
    port: 5432,
    password: "passwd",
    database: "main"
});


await connection.connect().then(() => console.log("connected"));



app.listen(3000, ()=> {
    console.log("listening on port 3000")
})




app.get("/api/crime", async (req, res) => {
    /*
     * req is the requirements/paramaters passed during the request of the webpage
     * Example: 
     * 
     * localhost:3000/api/crime?type=violent
     * 
     * would give -> req.body.type = "violent" 
     */

    try {

        console.log(req.query);

        if(req.query && req.query.minLat && req.query.maxLat && req.query.minLng && req.query.maxLng) {
            const result = await connection.query(
                `SELECT id, crime_type, latitude, longitude, location, intensity_base, added_by FROM \"Crime\" 
                WHERE latitude BETWEEN $1 AND $2 
                AND longitude BETWEEN $3 AND $4`, 
                [req.query.minLat, req.query.maxLat, req.query.minLng, req.query.maxLng]
            );
            res.json(result.rows);
            console.log(`Number of rows returned to ${req.ip.replace("::ffff:", "")} (${req.get("User-Agent")}): `, result.rows.length)
            return    
        }
        
        if(!req.query) {
            //console.log(req,"\n\n",req.body)
            const result = await connection.query(
                "SELECT crime_type, latitude, longitude, location, intensity_base FROM \"Crime\""
            );
            console.log("Number of rows returned:", result.rows.length);
            return res.json(result.rows);
        }

        return res.status(400).send("no range of points specified")


    }
    catch(err) {
        console.error(err);
        return res.status(500).send("Database error");
    }
}) 

app.post("/api/route", async (req, res) => {
    try {
        //console.log(req.body);
        //console.log(JSON.stringify(req.body, null, 2));
        const response = await fetch(`http://localhost:3001/route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body)
        })
        const data = await response.json();

        console.log(data);
        const coordinates = data.trip.legs
        .map(leg => polyline.decode(leg.shape, 6)) // decode each leg
        .flat(); // flatten one level

        const resp = {
            routes: [{
                name: "",
                coordinates,
                summary: {
                    totalDistance: data.trip.summary.length * 1000, // meters
                    totalTime: data.trip.summary.time // seconds
                }
            }]
        }
        //console.log(resp);
        //const text = await response.text();

        res.status(response.status);
        res.setHeader("Content-Type", response.headers.get("content-type") || "application/json");
        res.send(resp);
    } catch (err) {
        console.error("Proxy error:", err);
        res.status(502).json({ error: "Valhalla proxy failed" });
    }
});

/*
 * Oliver section
 * 10.111.22.141:3000/api/arduinopost?id=23&people=56 
 */
app.post(`/api/arduinoPost`, async (req, res) => {
    try {
        console.log("req: ", req);
        console.log("req boady: ", req.body);
        console.log("req query: ", req.query);
        if(req.query && true) {
            //const result = await connection.query(``);
            //res.json(result.rows); 
            return;
        }
        res.status(400).send(`incorrect format provided`);
    } catch(err) {
        res.status(500).send(`unknown error has occured: ${err}`);
    }
})

app.post("/login", async (req, res) => {
    try{
        const { username, password } = req.body;
        if(!req.body || !username || !password) {
            res.status(400).send("incorrect format")
            return
        }
        const passwdhash = crypto.createHash('sha256').update(password).digest('hex');
        let result = await connection.query(
            `SELECT id, username, password FROM users WHERE username = $1`,
            [username]
        );
        if(result.rows.length === 0) {res.status(401).json({error: "user or password not found or is incorrect"}) }
        result = result.rows[0];
        //console.log(result.password);
        //console.log(passwdhash);
        if(result.password === passwdhash){
            const token = jsonwebtoken.sign({
                username: result.username,
                UId: result.id,
                loggedIn: true
            }, process.env.JWT_SECRET, {expiresIn: "48h"})
            res.cookie("token", token, {
                httpOnly: true,             // JS cannot read it
                secure: process.env.NODE_ENV === "production", // only HTTPS in prod
                sameSite: "lax",             // prevents some CSRF attacks
                maxAge: 48 * 60 * 60 * 1000 // 48 hours
            });
            res.status(200).json({success: true});
        }
        else{
            res.status(401).json({error: "user or password not found or is incorrect"}) 
        }
    }
    catch(err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Server error" });
    }
})

function authenticateUser(req, res, next) {
    const header = req.headers;
    if (!header) return res.sendStatus(401);
    
    // switched to JWT*    {authorization: "bearer <TOKEN>"} splits the authorization string into 2 parts [0]: brearer and [1]:<TOKEN>
    const token = req.cookies.token;
    if(!token) return res.status(401).json({error: "Not Authenticated"});

    try{
        const payload = jsonwebtoken.verify(token, process.env.JWT_SECRET);
        req.payload = payload;
        console.log(payload);
        next();
    }
    catch(err) {
        return res.status(401).json({error: "Invalid token", success: false})
    }

}
app.get("/profile", authenticateUser, async(req, res) => {
    console.log("Meow /ᐠ｡ꞈ｡ᐟ\\");
    res.status(200).json({success: true});
})

app.get("/auth-me", authenticateUser, async(req, res) => {
    res.status(200).json({payload: req.payload, success: true});
})
app.post("/logout", (req, res) => {
    res.clearCookie("token");
    res.status(200).json({success: true});
});
app.post("/create-account", async (req, res) => {
    console.log("create account\t", req.body);
    if (!req.body.username || !req.body.password) {
        res.status(401).json({success: false, error: "invalid request, missing username or password."});
    }

    const {username, password} = req.body
    const passwdhash = crypto.createHash('sha256').update(password).digest('hex');

    const userExistsCheck = await connection.query(`
        SELECT * FROM users WHERE username = $1`,
        [username]
    )
    console.log(userExistsCheck.rows.length);
    if (userExistsCheck.rows.length !== 0) {
        res.status(401).json({success: false, error: "user already exists"});
        return;
    }
    const result = await connection.query(`
        INSERT INTO users(username, password) VALUES($1, $2) RETURNING * 
        `,
        [username, passwdhash]
    )
    console.log(`sign up btn result of insert ${result}`);
    const token = jsonwebtoken.sign({
        username: result.rows[0].username,
        UId: result.rows[0].id,
        loggedIn: true
    }, process.env.JWT_SECRET, {expiresIn: "48h"})
    res.cookie("token", token, {
        httpOnly: true,             // JS cannot read it
        secure: process.env.NODE_ENV === "production", // only HTTPS in prod
        sameSite: "lax",             // prevents some CSRF attacks
        maxAge: 48 * 60 * 60 * 1000 // 48 hours
    });
    res.status(200).json({success: true});
})

app.post("/profile/upload-pfp", authenticateUser, uploads.single("image"), async (req, res) => {
    //console.log(req.payload);
    //console.log(req.file);

    const imageBuffer = req.file.buffer;
    const base64Image = imageBuffer.toString("base64");

    const result = await connection.query(`
        UPDATE users SET profile_icon=$1 WHERE id=$2`,
        [base64Image, req.payload.UId]
    )

    res.status(200)

})

app.get("/profile/get-pfp", authenticateUser, async (req, res) => {
    const result = await connection.query(`
        SELECT profile_icon FROM users WHERE id=$1`,
        [req.payload.UId]
    )
    console.log(`Profile icon: ${result.rows[0]}`)
    res.status(200).json({profile_icon: result.rows[0].profile_icon});
})

app.post("/profile/remove", authenticateUser, async (req, res) => {
    const result = await connection.query(`
        DELETE FROM users WHERE id = $1`,
        [req.payload.UId]
    )
    res.status(200)
})

/*app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
*/