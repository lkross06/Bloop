import { db } from "../admin.js";
import fs from "fs";

// Load JSON
const locationsData = JSON.parse(fs.readFileSync("./src/data/location.json", "utf8"));

async function importLocations() {
  try {
    for (const key in locationsData) {
      const loc = locationsData[key];

      // Let Firestore generate a random ID
      const docRef = await db.collection("locations").add({
        title: loc.title,
        lat: loc.lat,
        lng: loc.lng,
        posts: loc.posts || [],
        gender: loc.gender
      });

      console.log(`Imported location ${loc.title} with ID ${docRef.id}`);
    }

    console.log("All locations imported with Firestore IDs!");
    process.exit(0);
  } catch (err) {
    console.error("Error importing locations:", err);
    process.exit(1);
  }
}

importLocations();