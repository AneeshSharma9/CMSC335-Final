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

// const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
// const { MongoClient, ServerApiVersion } = require('mongodb');
// // TODO: fix uri
// const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@temporary`;
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     }
// });

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
    const city = req.query.location;
    if (!city) {
        return res.status(400).send({ error: "City is required" });
    }

    const apiKey = process.env.WEATHER_API_KEY;
    const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?q=${encodeURIComponent(city)}&key=${apiKey}&days=7`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();

    const moonUrl = `https://api.weatherapi.com/v1/astronomy.json?q=${encodeURIComponent(city)}&key=${apiKey}`;
    const moonResponse = await fetch(moonUrl);
    const moonData = await moonResponse.json();

    const hour = parseInt(weatherData.location.localtime.split(" ")[1].split(":")[0]);

    console.log(JSON.stringify(weatherData, null, 2));

    let gradient = "";
    if (hour >= 7 && hour < 18) {
        gradient = "linear-gradient(to bottom, #87CEEB, #e6f7ff)"; // Light blue (day)
    } else if (hour >= 18 && hour < 24) {
        gradient = "linear-gradient(to bottom, #001f3f, #003366)"; // Dark blue (evening)
    } else {
        gradient = "linear-gradient(to bottom, #000033, #000011)"; // Dark dark blue (night)
    }

    // Pass forecast data to the template
    const forecast = weatherData.forecast.forecastday.map(day => ({
        date: day.date,
        condition: day.day.condition.text,
        high: day.day.maxtemp_f,
        low: day.day.mintemp_f,
    }));

    data = {
        city: weatherData.location.name,
        state: weatherData.location.region,
        temperature: weatherData.current.temp_f,
        description: weatherData.current.condition.text,
        moonPhase: moonData.astronomy.astro.moon_phase,
        moonIllumination: moonData.astronomy.astro.moon_illumination,
        gradient: gradient,
        forecast: forecast, // Pass the forecast array to the template
    };
    res.render("weather", data);
});


app.listen(portNumber);