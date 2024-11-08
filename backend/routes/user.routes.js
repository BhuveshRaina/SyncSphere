import express from "express";
import { protectRoute } from "../middleware/protectRoute";
import { followUser, getSuggestedUsers, getUserProfile, updateUser } from "../controllers/user.controllers";

const router = express.Router();

router.get("/profile/:id", protectRoute, getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, followUser);
router.post("/update", protectRoute, updateUser);

export default router;