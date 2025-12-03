import express from "express";
import {
  getAllLocations,
  getLocationById,
  createLocation
} from "../controllers/locationsController.js";

const router = express.Router();

router.get("/", getAllLocations);
router.get("/:locationID", getLocationById);
router.post("/", createLocation);

export default router;
