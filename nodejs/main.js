// some node shit
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


import { Client } from 'pg';
import express from 'express';

const app=express();
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));



const connection = new Client({
    host: "localhost",
    user: "account1",
    port: 5432,
    password: "passwd",
    database: "main"
});


connection.connect().then(() => console.log("connected"));



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
                `SELECT id, crime_type, latitude, longitude, location, intensity_base FROM \"Crime\" 
                WHERE latitude BETWEEN $1 AND $2 
                AND longitude BETWEEN $3 AND $4`, 
                [req.query.minLat, req.query.maxLat, req.query.minLng, req.query.maxLng]
            );
            res.json(result.rows);
            console.log("Number of rows returned to ${res.rawHeaders[1]},(${res.rawHeaders[9]}): ", result.rows.length)
        }
        
        if(!req.query) {
            //console.log(req,"\n\n",req.body)
            const result = await connection.query(
                "SELECT crime_type, latitude, longitude, location, intensity_base FROM \"Crime\""
            );
            res.json(result.rows);
            console.log("Number of rows returned:", result.rows.length);
        }

        res.status(400).send("no range of points specified")


    }
    catch(err) {
        console.error(err);
        res.status(500).send("Database error");
    }
}) 

