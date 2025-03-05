import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create a new tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Tweet content is required");
  }

  let user;
  let userType;

  if (req.traveler) {
    user = req.traveler;
    userType = "Traveler";
  } else if (req.agency) {
    user = req.agency;
    userType = "Agency";
  } else {
    throw new ApiError(401, "Unauthorized: User information is missing");
  }

  const tweet = await Tweet.create({
    content,
    owner: {
      userType,
      userId: user._id,
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});


// Get tweets by user with aggregation
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId, userType } = req.query;

  if (!userId || !userType || !["Traveler", "Agency"].includes(userType)) {
    throw new ApiError(400, "Invalid userId or userType");
  }

  if (!mongoose.isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid userId");
  }

  const tweets = await Tweet.aggregate([
    { $match: { "owner.userId": new mongoose.Types.ObjectId(userId), "owner.userType": userType } },
    {
      $lookup: {
        from: userType === "Traveler" ? "travelers" : "agencies",
        localField: "owner.userId",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    { $unwind: "$ownerDetails" },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        owner: {
          userType: "$owner.userType",
          userId: "$owner.userId",
          details: {
            userName: "$ownerDetails.userName",
            avatar: "$ownerDetails.avatar",
            ...(userType === "Traveler" ? { fullName: "$ownerDetails.fullName" } : { agencyName: "$ownerDetails.agencyName" }),
          },
        },
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
});


// Update a tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "Tweet content is required for update");
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const userId = req.traveler?._id || req.agency?._id;
  const userType = req.traveler ? "Traveler" : "Agency";

  if (!tweet.owner.userId.equals(userId) || tweet.owner.userType !== userType) {
    throw new ApiError(403, "Unauthorized to update this tweet");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    { content },
    { new: true }
  );

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet updated successfully"));
});


// Delete a tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const userId = req.traveler?._id || req.agency?._id;
  const userType = req.traveler ? "Traveler" : "Agency";

  if (!tweet.owner.userId.equals(userId) || tweet.owner.userType !== userType) {
    throw new ApiError(403, "Unauthorized to delete this tweet");
  }

  await Tweet.deleteOne({ _id: tweetId });

  res
    .status(200)
    .json(new ApiResponse(200, null, "Tweet deleted successfully"));
});


// Retweet a tweet
const retweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const userId = req.traveler?._id || req.agency?._id;

  if (tweet.retweets && tweet.retweets.includes(userId.toString())) {
    throw new ApiError(400, "Already retweeted this tweet");
  }

  tweet.retweets = tweet.retweets || [];
  tweet.retweets.push(userId);
  await tweet.save();

  res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet retweeted successfully"));
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet,
  retweet,
};