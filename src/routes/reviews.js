import express from "express";
import {
  getReviewById,
  getReviewByAccountAndLocation,
  getReviewsByAccount,
  getReviewsByLocation,
  createReview,
  updateReview
} from "../controllers/reviewsController.js";

const router = express.Router();

router.get("/users/:userID/locations/:locationID", getReviewByAccountAndLocation);
router.get("/users/:userID", getReviewsByAccount);
router.get("/locations/:locationID", getReviewsByLocation);
router.get("/:reviewID", getReviewById);
router.post("/", createReview);
router.put("/:reviewID", updateReview);

export default router;
