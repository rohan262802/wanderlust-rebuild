
require("dotenv").config({
    path: require("path").join(__dirname, "../.env")
});

const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const initData = require("./data.js");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust_new";

const geocodingClient = mbxGeocoding({
    accessToken: process.env.MAP_TOKEN
});

const initDB = async () => {
    try {
        await mongoose.connect(MONGO_URL);
        console.log("Connected to database");

        const ownerId = "6acda59123b2a03393512e7c";
        const preparedListings = [];

        // Prepare and validate every listing before deleting existing data.
        for (const obj of initData.data) {
            const response = await geocodingClient.forwardGeocode({
                query: `${obj.location}, ${obj.country}`,
                limit: 1
            }).send();

            if (!response.body.features.length) {
                throw new Error(
                    `Location not found: ${obj.location}, ${obj.country}`
                );
            }

            const listingData = {
                ...obj,
                owner: ownerId,
                geometry: response.body.features[0].geometry
            };

            // Validate before touching the existing collection.
            const listing = new Listing(listingData);
            await listing.validate();

            preparedListings.push(listingData);
        }

        console.log("All sample listings validated successfully.");

        // Destructive operation: only reached after successful preparation.
        await Listing.deleteMany({});
        await Listing.insertMany(preparedListings);

        console.log("Sample data initialized successfully!");
    } catch (err) {
        console.error("Initialization failed:", err.message);
    } finally {
        await mongoose.disconnect();
    }
};

initDB();
