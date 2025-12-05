import { db } from "../admin.js";

/**
 * GET http://localhost:3000/api/locations/
 * Get all locations from database
 * @returns list of JSONs representing all locations
 */
export const getAllLocations = async (req, res) => {
  try {
    const snapshot = await db.collection("locations").get();
    const data = {};

    snapshot.forEach(doc => {
      data[doc.id] = {
        ...doc.data()
      };
    });
    
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * GET http://localhost:3000/api/locations/:locationID
 * Get a location by ID from database
 * @param {*} req.params.locationID unique identifier for this location
 * @returns JSON representing the location
 */
export const getLocationById = async (req, res) => {
  try {
    const docRef = db.collection("locations").doc(req.params.locationID);
    const docSnap = await docRef.get();

    if (!docSnap.exists)
      return res.status(404).json({ error: "Location not found" });

    res.json(
      { locationID: docSnap.id, ...docSnap.data() }
    );

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/**
 * POST http://localhost:3000/api/locations/
 * Create a new location in the database
 * @param {*} req.body JSON representing the new location
 * @returns ID of the newly created location
 */
export const createLocation = async (req, res) => {
  try {
    let { title, gender, lat, lng} = req.body;

    if (gender === "m" || gender === "M" || gender === "male" || gender === "Male") gender = "M";
    else if (gender === "f" || gender === "F" || gender === "female" || gender === "Female") gender = "F";
    else gender = "N";     

    const newDoc = await db.collection("locations").add({
      title,
      gender,
      lat: Number(lat),
      lng: Number(lng),
      posts: [],
    });

    await newDoc.update({
      id: newDoc.id,
      locationID: newDoc.id,
    });

    res.json({ id: newDoc.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
