import { db } from "../admin.js";
import fs from "fs";

// Load JSON
const reviewsData = JSON.parse(fs.readFileSync("./src/data/post.json", "utf8"));

async function importReviews() {
  try {
    for (const key in reviewsData) {
      const review = reviewsData[key];

      // Let Firestore generate a random ID
      const docRef = await db.collection("reviews").add({
        locationID: review.locationID,
        accountID: review.accountID,
        cleanliness: review.cleanliness,
        availability: review.availability,
        amenities: review.amenities,
        notes: review.notes,
        timestamp: review.timestamp || Date.now()
      });

      console.log(`Imported review for location ${review.locationID} with ID ${docRef.id}`);
    }

    console.log("All reviews imported with Firestore IDs!");
    process.exit(0);
  } catch (err) {
    console.error("Error importing reviews  :", err);
    process.exit(1);
  }
}

importReviews();