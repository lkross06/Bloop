import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = 3000;

const db = null;

/** ------- HELPER FUNCTIONS ------- */

function generateUniqueID() {
  return Date.now(); //theoretically deterministic
}

app.get("/test", (req, res) => {
  res.json({ message: "hello from express!!!" });
});

/** ------- LOCATION DATA ------- */

//GET all locations in a JSON, res = { locationID : location }
app.get("/locations", (req, res) => {
  const locations = db.getLocationsAll();

  res.json(locations);
});

//GET specific location by locationID, params = id
app.get("/locations/:id", (req, res) => {
  //validate inputs
  var id = Number(req.params.id);

  const valid_id = !Number.isNaN(id);

  if (!valid_id){
    return res.status(404).json({ error: "Location not found" });
  }

  const location = db.getLocation(id);

  if (location == null) {
    return res.status(404).json({ error: "Location not found" });
  }

  res.json(location);
});

//POST a new location, body = { title, lat, lng, gender }
app.post("/locations", (req, res) => {
  const MAX_TITLE_LENGTH = 30;

  //validate inputs
  var title = String(req.body.title);
  var lat = Number(req.body.lat);
  var lng = Number(req.body.lng);
  var gender = String(req.body.gender);

  const valid_title = title.length <= MAX_TITLE_LENGTH;
  const valid_position = !Number.isNaN(lat) && !Number.isNaN(lng);
  const valid_gender = gender == "M" || gender == "F" || gender == "N";

  if (!valid_title) { title = title.substring(0, MAX_TITLE_LENGTH); }
  if (
    !valid_position ||
    !valid_gender
  ) {
    return res.status(400).json({ error: "Invalid inputs" });
  }

  const id = generateUniqueID();

  const location = {
    locationID: id,
    title: title,
    lat: lat,
    lng: lng,
    posts: [],
    gender: gender,
  };

  if (!db.createLocation(location)) {
    return res.status(500).json({ error: "Failed to create location" });
  }

  res.json({ locationID: id });
});

/** ------- POST DATA ------- */

/** ------- ACCOUNT DATA ------- */

/** ------- MAIN FUNCTION ------- */

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});