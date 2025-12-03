import { db } from "../admin.js";
import admin from "firebase-admin";

/** GET http://localhost:3000/api/reviews/:reviewID
 * Get a review by ID from database
 * @param {*} req.params.reviewID unique identifier for this review
 * @returns JSON representing the review
 */
export const getReviewById = async (req, res) => {
  try {
    const docRef = db.collection("reviews").doc(req.params.reviewID);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ error: "Review not found" });

    res.json(docSnap.data());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** GET http://localhost:3000/api/reviews/user/:userID/location/:locationID
 * Get a review by User ID and Location ID from database
 * @param {*} req.params.userID unique identifier for account that made this review
 * @param {*} req.params.locationID unique identifier for location this review is about
 * @returns JSON representing the review
 */
export const getReviewByAccountAndLocation = async (req, res) => {
  try {
    const { userID, locationID } = req.params;

    const snapshot = await db
      .collection("reviews")
      .where("accountID", "==", userID)
      .where("locationID", "==", locationID)
      .get();
    if (snapshot.empty)
      return res.status(404).json({ error: "Review not found" });

    const doc = snapshot.docs[0];
    res.json({reviewID: doc.id, ...doc.data()});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/** GET http://localhost:3000/api/reviews/user/:userID
 * Get all reviews by User ID from database
 * @param {*} req.params.userID unique identifier for account that made these reviews
 * @returns list of JSONs representing all reviews made by the user
 */
export const getReviewsByAccount = async (req, res) => {
  try {
    const userID = req.params.userID;
    
    if (!userID) {
      return res.status(400).json({ error: "UserID is required" });
    }

    const snapshot = await db
      .collection("reviews")
      .where("accountID", "==", userID)
      .get();

    const data = {};
    snapshot.forEach(doc => (data[doc.id] = doc.data()));

    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST http://localhost:3000/api/reviews/
 * Create a new review in the database
 * @param {*} req.body JSON representing the new review
 * @returns ID of the newly created review
 */
export const createReview = async (req, res) => {
  try {
    const {locationID, accountID, cleanliness, availability, amenities, notes, timestamp} = req.body;

    if (!locationID || !accountID)
      return res.status(400).json({ error: "locationID and userID are required" });
    
    const newDoc = await db.collection("reviews").add({
      locationID,
      accountID,
      cleanliness,
      availability,
      amenities,
      notes,
      timestamp: timestamp || Date.now()
    });

    await db.collection("locations").doc(String(locationID))
      .update({
        posts: admin.firestore.FieldValue.arrayUnion(newDoc.id)
      });
    
    await db.collection("users").doc(String(accountID))
      .update({
        posts: admin.firestore.FieldValue.arrayUnion(newDoc.id)
      });

    res.json({ id: newDoc.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET http://localhost:3000/api/reviews/:locationID
 * Gets all reviews for a specific location
 * @param {*} req.params.locationID unique identifier for the location
 * @returns list of JSONs representing all reviews for the location
 */
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

/** PUT http://localhost:3000/api/reviews/:reviewID
 * Update an existing review in the database
 * @param {*} req.params.reviewID unique identifier for the review to update
 * @param {*} req.body JSON representing the updated review fields
 * @returns confirmation of review update
 */
export const updateReview = async (req, res) => {
  try {
    const reviewID = req.params.reviewID;
    const updateData = req.body;

    await db.collection("reviews").doc(reviewID).update(updateData);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};