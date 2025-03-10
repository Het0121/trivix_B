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


// Get all tweets for all users
const getAllTweets = asyncHandler(async (req, res) => {
  // Extract pagination parameters from query
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Extract optional filter parameters
  const { userType } = req.query;
  
  // Create match object for filtering
  const matchStage = {};
  if (userType && ["Traveler", "Agency"].includes(userType)) {
    matchStage["owner.userType"] = userType;
  }

  // Get total count for pagination
  const totalTweetsCount = await Tweet.countDocuments(matchStage);

  // Perform aggregation
  const tweets = await Tweet.aggregate([
    { $match: matchStage },
    { $sort: { createdAt: -1 } }, // Sort by newest first
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: "travelers",
        localField: "owner.userId",
        foreignField: "_id",
        as: "travelerDetails",
      },
    },
    {
      $lookup: {
        from: "agencies",
        localField: "owner.userId",
        foreignField: "_id",
        as: "agencyDetails",
      },
    },
    {
      $addFields: {
        ownerDetails: {
          $cond: {
            if: { $eq: ["$owner.userType", "Traveler"] },
            then: { $arrayElemAt: ["$travelerDetails", 0] },
            else: { $arrayElemAt: ["$agencyDetails", 0] },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        retweets: 1,
        owner: {
          userType: "$owner.userType",
          userId: "$owner.userId",
          details: {
            userName: "$ownerDetails.userName",
            avatar: "$ownerDetails.avatar",
            fullName: { $ifNull: ["$ownerDetails.fullName", null] },
            agencyName: { $ifNull: ["$ownerDetails.agencyName", null] },
          },
        },
        retweetCount: { $size: { $ifNull: ["$retweets", []] } },
      },
    },
  ]);

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalTweetsCount / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json(
    new ApiResponse(200, {
      tweets,
      pagination: {
        currentPage: page,
        totalPages,
        totalTweets: totalTweetsCount,
        hasNextPage,
        hasPrevPage,
      },
    }, "All tweets fetched successfully")
  );
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


// Get trending tweets
const getTrendingTweets = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  const trendingTweets = await Tweet.aggregate([
    {
      $addFields: {
        retweetCount: { $size: { $ifNull: ["$retweets", []] } }
      }
    },
    { $sort: { retweetCount: -1, createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "travelers",
        localField: "owner.userId",
        foreignField: "_id",
        as: "travelerDetails",
      },
    },
    {
      $lookup: {
        from: "agencies",
        localField: "owner.userId",
        foreignField: "_id",
        as: "agencyDetails",
      },
    },
    {
      $addFields: {
        ownerDetails: {
          $cond: {
            if: { $eq: ["$owner.userType", "Traveler"] },
            then: { $arrayElemAt: ["$travelerDetails", 0] },
            else: { $arrayElemAt: ["$agencyDetails", 0] },
          },
        },
      },
    },
    {
      $project: {
        _id: 1,
        content: 1,
        createdAt: 1,
        retweets: 1,
        retweetCount: 1,
        owner: {
          userType: "$owner.userType",
          userId: "$owner.userId",
          details: {
            userName: "$ownerDetails.userName",
            avatar: "$ownerDetails.avatar",
            fullName: { $ifNull: ["$ownerDetails.fullName", null] },
            agencyName: { $ifNull: ["$ownerDetails.agencyName", null] },
          },
        },
      },
    },
  ]);

  res
    .status(200)
    .json(new ApiResponse(200, trendingTweets, "Trending tweets fetched successfully"));
});


export {
  createTweet,
  getUserTweets,
  getAllTweets,
  updateTweet,
  deleteTweet,
  retweet,
  getTrendingTweets,
};