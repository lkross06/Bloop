import express from "express";
import {
  ensureUserRecord,
  getUserById
} from "../controllers/usersController.js";

const router = express.Router();

router.post("/ensure", ensureUserRecord);
router.get("/:uid", getUserById);

export default router;