import express from "express";
import {
  getReviewsByLocation,
  createReview
} from "../controllers/reviewsController.js";

const router = express.Router();

router.get("/location/:locationID", getReviewsByLocation);
router.post("/", createReview);

export default router;
