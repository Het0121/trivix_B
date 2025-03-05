import { Router } from "express";
import {

  toggleFollow,
  getUserFollower,
  getUserFollowing

} from "../controllers/follow.controller.js";
import { verifyUser } from "../middlewares/verifyUser.middleware.js"

const router = Router()


// Toggle follow/unfollow a user 
router.route("/:userName/togglefollow").post(verifyUser, toggleFollow);

// Get followers list for a user
router.route("/:userName/followers").get(verifyUser, getUserFollower);

// Get followings list for a user
router.route("/:userName/followings").get(verifyUser, getUserFollowing);

export default router;
