import mongoose, { isValidObjectId } from "mongoose";
import { Traveler } from "../models/traveler.model.js";
import { Agency } from "../models/agency.model.js";
import { FollowerFollowing } from "../models/follow.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Toggle for follow and unfollow user
const toggleFollow = asyncHandler(async (req, res) => {
    const { userName } = req.params;

    // Find the user to be followed/unfollowed
    let user = await Traveler.findOne({ userName: userName.toLowerCase() });
    let userType = "Traveler";

    if (!user) {
        user = await Agency.findOne({ userName: userName.toLowerCase() });
        userType = "Agency";
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const currentUserId = req.traveler?._id || req.agency?._id;
    const currentUserType = req.traveler ? "Traveler" : "Agency";

    if (!currentUserId || !isValidObjectId(currentUserId)) {
        throw new ApiError(401, "Unauthorized request");
    }

    if (String(user._id) === String(currentUserId) && userType === currentUserType) {
        throw new ApiError(400, "You cannot follow yourself");
    }

    // Check if already following
    const existingFollow = await FollowerFollowing.findOne({
        "follower.userId": currentUserId,
        "follower.userType": currentUserType,
        "following.userId": user._id,
        "following.userType": userType,
    });

    if (existingFollow) {
        // Unfollow if already following
        await FollowerFollowing.findByIdAndDelete(existingFollow._id);
        return res.status(200).json(new ApiResponse(200, {}, "User unfollowed successfully"));
    } else {
        // Follow if not already following
        const followEntity = await FollowerFollowing.create({
            follower: { userId: currentUserId, userType: currentUserType },
            following: { userId: user._id, userType: userType },
        });

        // Ensure we get the correct name or agency name for the sender
        const senderName = req.traveler ? req.traveler.userName : req.agency?.userName;
        
        if (!senderName) {
            throw new ApiError(400, "Sender name is missing.");
        }

        const notificationMessage = `${senderName} started following you.`;

        await Notification.create({
            recipient: { userId: user._id, userType },
            sender: { userId: currentUserId, userType: currentUserType },
            type: "FOLLOW",
            message: notificationMessage,
            relatedEntity: followEntity._id,            // Set relatedEntity to the follow entity's ID
            relatedEntityType: "follow",                // Type is "Follow"
        });

        return res.status(200).json(new ApiResponse(200, {}, "User followed successfully"));
    }
});



// get user followers 
const getUserFollower = asyncHandler(async (req, res) => {
    const { userName } = req.params;

    // Find the user whose followers we want
    let user = await Traveler.findOne({ userName: userName.toLowerCase() });
    let userType = "Traveler";

    if (!user) {
        user = await Agency.findOne({ userName: userName.toLowerCase() });
        userType = "Agency";
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Use aggregation pipeline to fetch followers with specific fields
    const followers = await FollowerFollowing.aggregate([
        {
            $match: {
                "following.userId": user._id,
                "following.userType": userType,
            },
        },
        {
            $lookup: {
                from: "travelers",
                localField: "follower.userId",
                foreignField: "_id",
                as: "followerTraveler",
            },
        },
        {
            $lookup: {
                from: "agencies",
                localField: "follower.userId",
                foreignField: "_id",
                as: "followerAgency",
            },
        },
        {
            $addFields: {
                followerDetails: {
                    $cond: {
                        if: { $eq: ["$follower.userType", "Traveler"] },
                        then: {
                            name: { $arrayElemAt: ["$followerTraveler.name", 0] },
                            userName: { $arrayElemAt: ["$followerTraveler.userName", 0] },
                            avatar: { $arrayElemAt: ["$followerTraveler.avatar", 0] },
                            type: "Traveler",
                        },
                        else: {
                            agencyName: { $arrayElemAt: ["$followerAgency.agencyName", 0] },
                            userName: { $arrayElemAt: ["$followerAgency.userName", 0] },
                            avatar: { $arrayElemAt: ["$followerAgency.avatar", 0] },
                            type: "Agency",
                        },
                    },
                },
            },
        },
        { $project: { followerDetails: 1, _id: 0 } },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, followers.map((f) => f.followerDetails), "Followers fetched successfully"));
});


// Get user following 
const getUserFollowing = asyncHandler(async (req, res) => {
    const { userName } = req.params;

    // Find the user whose followings we want
    let user = await Traveler.findOne({ userName: userName.toLowerCase() });
    let userType = "Traveler";

    if (!user) {
        user = await Agency.findOne({ userName: userName.toLowerCase() });
        userType = "Agency";
    }

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Use aggregation pipeline to fetch followings with specific fields
    const followings = await FollowerFollowing.aggregate([
        {
            $match: {
                "follower.userId": user._id,
                "follower.userType": userType,
            },
        },
        {
            $lookup: {
                from: "travelers",
                localField: "following.userId",
                foreignField: "_id",
                as: "followingTraveler",
            },
        },
        {
            $lookup: {
                from: "agencies",
                localField: "following.userId",
                foreignField: "_id",
                as: "followingAgency",
            },
        },
        {
            $addFields: {
                followingDetails: {
                    $cond: {
                        if: { $eq: ["$following.userType", "Traveler"] },
                        then: {
                            name: { $arrayElemAt: ["$followingTraveler.name", 0] },
                            userName: { $arrayElemAt: ["$followingTraveler.userName", 0] },
                            avatar: { $arrayElemAt: ["$followingTraveler.avatar", 0] },
                            type: "Traveler",
                        },
                        else: {
                            agencyName: { $arrayElemAt: ["$followingAgency.agencyName", 0] },
                            userName: { $arrayElemAt: ["$followingAgency.userName", 0] },
                            avatar: { $arrayElemAt: ["$followingAgency.avatar", 0] },
                            type: "Agency",
                        },
                    },
                },
            },
        },
        { $project: { followingDetails: 1, _id: 0 } },
    ]);

    return res
        .status(200)
        .json(new ApiResponse(200, followings.map((f) => f.followingDetails), "Followings fetched successfully"));
});

export {
    toggleFollow,
    getUserFollower,
    getUserFollowing
};