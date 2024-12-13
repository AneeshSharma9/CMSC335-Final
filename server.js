const express = require("express");
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
require('dotenv').config();

if (process.argv.length != 2) {
    console.log("Usage: server.js");
    process.exit(0);
}

const app = express();
const portNumber = 5001;
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
console.log(`Web server started and running at http://localhost:${portNumber}`);

const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.4fev4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

function getWeatherEmoji(condition) {
    if (condition.toLowerCase().includes("snow")) {
        return "&#10052;";
    } else if (condition.toLowerCase().includes("rain")) {
        return "&#127783;";
    } else if (condition.toLowerCase().includes("cloud")) {
        return "&#9729;";
    } else if (condition.toLowerCase().includes("sun")) {
        return "&#9728;";
    } else {
        return "&#9925;";
    }
}

function getMoonEmoji(phase) {
    switch (phase.toLowerCase()) {
        case "new moon":
            return "🌑";
        case "waxing crescent":
            return "🌒";
        case "first quarter":
            return "🌓";
        case "waxing gibbous":
            return "🌔";
        case "full moon":
            return "🌕";
        case "waning gibbous":
            return "🌖";
        case "last quarter":
            return "🌗";
        case "waning crescent":
            return "🌘";
        default:
            return "🌑";
    }
}

app.get("/", async (req, res) => {
    const name = req.cookies.name || ""; // Check if a name is already stored in the cookie

    res.render("index", { previousSearches: [], name }); // Pass empty searches initially
});

app.post("/weather", async (req, res) => {
    let { location: city, name } = req.body;

    if (!name) {
        name = req.cookies.name; // Retrieve name from cookie if not present in request
    }

    if (!name) {
        return res.redirect("/"); // Redirect back to index if no name is provided
    }

    res.cookie("name", name, { httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000 }); // Set name cookie

    if (city.trim() === "") {
        return res.status(400).send({ error: "City is required" });
    }

    try {
        await client.connect();
        const database = client.db(databaseAndCollection.db);
        const collection = database.collection(databaseAndCollection.collection);

        let userData = await collection.findOne({ name: name });
        let previousSearches = userData?.searches?.map((search) => search.city) || [];

        const apiKey = process.env.WEATHER_API_KEY;
        const weatherUrl = `https://api.weatherapi.com/v1/forecast.json?q=${encodeURIComponent(city)}&key=${apiKey}&days=7`;
        const weatherResponse = await fetch(weatherUrl);
        const weatherData = await weatherResponse.json();

        const moonUrl = `https://api.weatherapi.com/v1/astronomy.json?q=${encodeURIComponent(city)}&key=${apiKey}`;
        const moonResponse = await fetch(moonUrl);
        const moonData = await moonResponse.json();

        const hour = parseInt(weatherData.location.localtime.split(" ")[1].split(":")[0]);

        let gradient = "";
        if (hour >= 7 && hour < 18) {
            gradient = "linear-gradient(to bottom, #87CEEB, #e6f7ff)";
        } else if (hour >= 18 && hour < 24) {
            gradient = "linear-gradient(to bottom, #1e293b, #0f172a)";
        } else {
            gradient = "linear-gradient(to bottom, #000033, #000011)";
        }

        const forecast = weatherData.forecast.forecastday.map((day) => ({
            date: day.date,
            condition: day.day.condition.text,
            high: day.day.maxtemp_f,
            low: day.day.mintemp_f,
            emoji: getWeatherEmoji(day.day.condition.text),
        }));

        const location = `${weatherData.location.name}, ${weatherData.location.region}`;
        if (previousSearches.includes(location)) {
            await collection.updateOne(
                { name: name, "searches.city": location },
                { $set: { "searches.$.timestamp": new Date() } }
            );
        } else {
            await collection.updateOne(
                { name: name },
                { $push: { searches: { city: location, timestamp: new Date() } } },
                { upsert: true }
            );
        }

        userData = await collection.findOne({ name: name });
        previousSearches = userData?.searches?.map((search) => search.city) || [];

        const data = {
            city: weatherData.location.name,
            state: weatherData.location.region,
            temperature: weatherData.current.temp_f,
            description: weatherData.current.condition.text,
            currentEmoji: getWeatherEmoji(weatherData.current.condition.text),
            moonPhase: moonData.astronomy.astro.moon_phase,
            moonEmoji: getMoonEmoji(moonData.astronomy.astro.moon_phase),
            moonIllumination: moonData.astronomy.astro.moon_illumination,
            gradient: gradient,
            forecast: forecast,
            previousSearches: previousSearches,
            name: name
        };

        res.render("weather", data);
    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
});
app.listen(portNumber);