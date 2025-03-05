import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper function to calculate unique like count for a given target (e.g., post, comment, etc.)
const calculateLikeCount = async (targetId, targetType) => {
    const result = await Like.aggregate([
        {
            $match: {
                [targetType]: new mongoose.Types.ObjectId(targetId),
            },
        },
        {
            $group: {
                _id: `$${targetType}`,
                uniqueLikes: { $addToSet: "$likedBy.userId" },
            },
        },
        {
            $project: {
                likeCount: { $size: "$uniqueLikes" },
            },
        },
    ]);
    return result[0]?.likeCount || 0;
};

// Generalized function to toggle likes on various target types (post, comment, tweet, package, etc.)
const toggleLike = async (req, res, targetType) => {
    const targetId = req.params[`${targetType}Id`]; // Get the targetId from the URL parameter
    const { userId, userType } = req.body; // Get userId and userType from request body

    // Validate the targetId and userId to ensure they are valid ObjectIds
    if (!isValidObjectId(targetId) || !isValidObjectId(userId)) {
        throw new ApiError(400, `Invalid ${targetType}Id or userId`);
    }

    const likeQuery = { [targetType]: targetId, "likedBy.userId": userId }; // Query to check if the user already liked this target
    const existingLike = await Like.findOne(likeQuery); // Find if like already exists

    if (existingLike) {
        await existingLike.deleteOne(); // Remove the like
        const likeCount = await calculateLikeCount(targetId, targetType); // Recalculate the like count
        return res
            .status(200)
            .json(new ApiResponse(200, { likeCount }, `${targetType} unliked successfully.`));
    } else {
        // If like doesn't exist, create a new like and update the like count
        await Like.create({ [targetType]: targetId, likedBy: { userId, userType } });
        const likeCount = await calculateLikeCount(targetId, targetType);

        const senderName = req.traveler ? req.traveler.userName : req.agency?.userName;

        if (!senderName) {
            throw new ApiError(400, "Sender name is missing.");
        }

        // Constructing the message and relatedEntityType dynamically
        const notificationMessage = `${senderName} liked your ${targetType}.`;
        
        // Fetch the owner of the target entity (e.g., post, tweet, etc.)
        const targetEntity = await mongoose
            .model(targetType.charAt(0).toUpperCase() + targetType.slice(1))
            .findById(targetId)
            .select("owner");

        if (!targetEntity) {
            throw new ApiError(404, `${targetType} not found.`);
        }

        await Notification.create({
            recipient: { userId: targetEntity.owner, userType: "Traveler" }, // Assuming the owner is always a Traveler
            sender: { userId, userType },
            type: "LIKE",
            message: `${senderName} liked your ${targetType}.`,
            relatedEntity: targetId,
            relatedEntityType: targetType.toLowerCase(),
        });



        return res
            .status(201)
            .json(new ApiResponse(201, { likeCount }, `${targetType} liked successfully.`));
    }
};

// Specific handler functions for different target types
const togglePostLike = asyncHandler(async (req, res) => toggleLike(req, res, "post"));
const toggleCommentLike = asyncHandler(async (req, res) => toggleLike(req, res, "comment"));
const toggleTweetLike = asyncHandler(async (req, res) => toggleLike(req, res, "tweet"));
const togglePackageLike = asyncHandler(async (req, res) => toggleLike(req, res, "package"));

// Generalized function to get the liked items for a user
const getLikedItems = async (req, res, targetType, collectionName) => {
    const { userId } = req.body; // Get userId from the request body

    // Validate the userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid userId");
    }

    const likedItems = await Like.aggregate([
        {
            $match: {
                "likedBy.userId": new mongoose.Types.ObjectId(userId),
                [targetType]: { $exists: true },
            },
        },
        {
            $lookup: {
                from: collectionName,
                localField: targetType,
                foreignField: "_id",
                as: "details",
            },
        },
        { $unwind: "$details" },
        {
            $project: {
                _id: 0,
                id: `$${targetType}`,
                details: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, likedItems, `Liked ${targetType}s fetched successfully.`));
};

// Specific handler functions to get liked posts and liked packages for a user
const getLikedPost = asyncHandler(async (req, res) => getLikedItems(req, res, "post", "posts"));
const getLikedPackage = asyncHandler(async (req, res) => getLikedItems(req, res, "package", "packages"));

export {
    togglePostLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedPost,
    togglePackageLike,
    getLikedPackage,
};
