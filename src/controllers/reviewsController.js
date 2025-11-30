import { db } from "../admin.js";
import admin from "firebase-admin";

export const createReview = async (req, res) => {
  try {
    const data = req.body;

    const newDoc = await db.collection("reviews").add(data);

    const locRef = db.collection("locations").doc(String(data.locationID));
    await locRef.update({
      posts: admin.firestore.FieldValue.arrayUnion(newDoc.id)
    });

    res.json({ id: newDoc.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getReviewsByLocation = async (req, res) => {
  try {
    const locationID = req.params.locationID;

    const snapshot = await db
      .collection("reviews")
      .where("locationID", "==", locationID)
      .get();

    const data = {};
    snapshot.forEach(doc => (data[doc.id] = doc.data()));

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};