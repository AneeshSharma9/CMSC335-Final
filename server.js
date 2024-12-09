const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

if (process.argv.length != 3) {
    console.log("Usage server.js port");
    process.exit(0);
}

const app = express();
const portNumber = process.argv[2];
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
console.log(`Web server started and running at http://localhost:${portNumber}`);

const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const { MongoClient, ServerApiVersion } = require('mongodb');
// TODO: fix uri
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@temporary`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

process.stdout.write("Stop to shutdown the server: ");
process.stdin.on("readable", async function () {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.toString().trim();
        if (command === "stop") {
            console.log(`Shutting down the server`);
            try {
                await client.close();
            } catch (e) {
                console.error("Error closing MongoDB connection:", e);
            }
            process.exit(0);
        } else {
            process.stdout.write(`Invalid command: ${command}\n`);
        }
        process.stdout.write("Stop to shutdown the server: ");
        process.stdin.resume();
    }
});

let portInfo = { port: portNumber }

app.get("/", (req, res) => {
    res.render("index");
});

app.get("/weather", async (req, res) => {
    const { city } = req.query;

    if (!city) {
        return res.status(400).send({ error: "City is required" });
    }

    try {
        const apiKey = process.env.WEATHER_API_KEY;
        const weatherUrl = `https://api.weatherapi.com/v1/current.json?q=${city}&key=${apiKey}`;
        const weatherResponse = await axios.get(weatherUrl);
        const weatherData = response.data;

        const moonUrl = `https://api.weatherapi.com/v1/astronomy.json?q=${city}&key=${apiKey}`;
        const moonResponse = await axios.get(moonUrl);
        const moonData = response.data;

        data = {
            city: weatherData.location.name,
            temperature: weatherData.current.temp_f,
            description: weatherData.condition.text,
            
        }

        res.render("weather", data)
    } catch (error) {
        res.status(500).send({ error: "Unable to fetch weather data" });
    }
});

app.get("/weather", (req, res) => {
    const city = req.query.location || "Unknown";
    const now = new Date();
    const hour = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", hour12: false });

    // Determine background color based on hour
    let gradient = "";
    if (hour >= 7 && hour < 18) {
        gradient = "linear-gradient(to bottom, #87CEEB, #e6f7ff)"; // Light blue (day)
    } else if (hour >= 18 && hour < 24) {
        gradient = "linear-gradient(to bottom, #001f3f, #003366)"; // Dark blue (evening)
    } else {
        gradient = "linear-gradient(to bottom, #000033, #000011)"; // Dark dark blue (night)
    }

    res.render("weather", { city, gradient });
});

app.listen(portNumber);