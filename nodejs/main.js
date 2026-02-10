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
    try {
        const result = await connection.query(
            "SELECT crime_type, latitude, longitude, location, intensity_base FROM \"Crime\""
        );
        res.json(result.rows);
        console.log("Number of rows returned:", result.rows.length);

    }
    catch(err) {
        console.error(err);
        res.status(500).send("Database error");
    }
}) 

