import { db } from "../admin.js";

export const getAllLocations = async (req, res) => {
  try {
    const snapshot = await db.collection("locations").get();
    const data = {};

    snapshot.forEach(doc => (data[doc.id] = doc.data()));
    
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getLocationById = async (req, res) => {
  try {
    const docRef = db.collection("locations").doc(req.params.id);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ error: "Location not found" });

    res.json(docSnap.data());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const createLocation = async (req, res) => {
  try {
    const { title, gender, lat, lng, ratings } = req.body;

    const newDoc = await db.collection("locations").add({
      title,
      gender,
      lat,
      lng,
      posts: [],
      ratings: ratings || {
        cleanliness: 0,
        availability: 0,
        amenities: 0
      }
    });

    res.json({ id: newDoc.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
