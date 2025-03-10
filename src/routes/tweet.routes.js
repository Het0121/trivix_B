import { Router } from "express";
import {
  createTweet,
  getUserTweets,
  getAllTweets,
  updateTweet,
  deleteTweet,
  retweet,
  getTrendingTweets
} from "../controllers/tweet.controller.js";
import { verifyUser } from "../middlewares/verifyUser.middleware.js";

const router = Router()


// Create a new tweet
router.route("/create").post(verifyUser, createTweet);

// Get all tweets for a specific user
router.route("/user").get(verifyUser, getUserTweets);

// Get all tweets for all users
router.route("/").get(getAllTweets);

// Get trending tweets
router.route("/trending").get(getTrendingTweets);

// Update a tweet
router.route("/:tweetId").patch(verifyUser, updateTweet);

// Delete a tweet
router.route("/:tweetId").delete(verifyUser, deleteTweet);

// Retweet a tweet
router.route("/retweet/:tweetId").post(verifyUser, retweet);

export default router;