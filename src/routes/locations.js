import express from "express";
import { verifyToken } from "../middleware/auth.js";
import {
  getAllLocations,
  getLocationById,
  createLocation
} from "../controllers/locationsController.js";

const router = express.Router();

router.get("/", getAllLocations);
router.get("/:locationID", getLocationById);
//Protected
router.post("/", verifyToken, createLocation);

export default router;
