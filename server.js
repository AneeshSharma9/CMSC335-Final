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

app.get("/", (request, response) => {
    response.render("index");
});

app.get("/weather", (req, res) => {
    const city = req.query.location;
    if (!city) {
        return res.redirect("/");
    }
    res.render("weather", { city });
});

app.listen(portNumber);