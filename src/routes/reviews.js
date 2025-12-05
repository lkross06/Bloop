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

router.get("/users/:accountID/locations/:locationID", getReviewByAccountAndLocation);
router.get("/users/:accountID", getReviewsByAccount);
router.get("/locations/:locationID", getReviewsByLocation);
router.get("/id/:reviewID", getReviewById);
router.post("/", createReview);
router.put("/id/:reviewID", updateReview);

export default router;
