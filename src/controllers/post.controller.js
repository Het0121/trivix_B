import mongoose, { isValidObjectId } from "mongoose";
import { Post } from "../models/post.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Get all posts with filters and aggregation
const getAllPost = asyncHandler(async (req, res) => {
    const { userId, location, sort } = req.query;

    const matchStage = {};

    if (userId && isValidObjectId(userId)) {
        matchStage["owner.userId"] = new mongoose.Types.ObjectId(userId);
    }
    if (location) {
        matchStage.location = { $regex: location, $options: "i" }; // Case-insensitive search
    }

    const posts = await Post.aggregate([
        { $match: matchStage },
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
                    $cond: [
                        { $eq: ["$owner.userType", "Traveler"] },
                        { $arrayElemAt: ["$travelerDetails", 0] },
                        { $arrayElemAt: ["$agencyDetails", 0] },
                    ],
                },
            },
        },
        {
            $project: {
                "ownerDetails.fullName": 1,
                "ownerDetails.userName": 1,
                "ownerDetails.avatar": 1,
                "ownerDetails.agencyName": 1,
                _id: 1,
                image: 1,
                video: 1,
                caption: 1,
                location: 1,
                views: 1,
                createdAt: 1,
                updatedAt: 1,
            },
        },
        { $sort: sort === "views" ? { views: -1 } : { createdAt: -1 } },
    ]);

    res.status(200).json(new ApiResponse(200, posts, "Posts fetched successfully"));
});


// Get post by ID
const getPostById = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // Validate postId
    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid postId");
    }

    try {
        // Aggregation pipeline to fetch the post with owner details
        const post = await Post.aggregate([
            // Match the post by ID
            { $match: { _id: new mongoose.Types.ObjectId(postId) } },

            // Lookup traveler details
            {
                $lookup: {
                    from: "travelers",
                    localField: "owner.userId",
                    foreignField: "_id",
                    as: "travelerDetails",
                },
            },

            // Lookup agency details
            {
                $lookup: {
                    from: "agencies",
                    localField: "owner.userId",
                    foreignField: "_id",
                    as: "agencyDetails",
                },
            },

            // Add owner details based on userType
            {
                $addFields: {
                    ownerDetails: {
                        $cond: [
                            { $eq: ["$owner.userType", "Traveler"] },
                            { $arrayElemAt: ["$travelerDetails", 0] },
                            { $arrayElemAt: ["$agencyDetails", 0] },
                        ],
                    },
                },
            },

            // Project only required fields
            {
                $project: {
                    _id: 1, // Include post ID
                    title: 1, // Example field: include post title (replace with actual field names)
                    content: 1, // Example field: include post content (replace with actual field names)
                    ownerDetails: {
                        fullName: 1,
                        userName: 1,
                        avatar: 1,
                        agencyName: 1,
                    },
                },
            },
        ]);

        // Handle post not found
        if (!post.length) {
            throw new ApiError(404, "Post not found");
        }

        // Respond with the post data
        res.status(200).json(new ApiResponse(200, post[0], "Post fetched successfully"));
    } catch (error) {
        // Handle unexpected errors
        throw new ApiError(500, error.message || "An error occurred while fetching the post");
    }
});


// Publish a new post
const publishAPost = asyncHandler(async (req, res) => {
    const { caption, location } = req.body;

    // Ensure at least one of image or video is uploaded
    if (!req.files || (!req.files.image && !req.files.video)) {
        throw new ApiError(400, "Either an image or a video is required.");
    }

    let imageUploadResponse = null;
    let videoUploadResponse = null;

    // Upload image if provided
    if (req.files.image) {
        imageUploadResponse = await uploadOnCloudinary(req.files.image[0].path);
        if (!imageUploadResponse) {
            throw new ApiError(500, "Failed to upload image to Cloudinary");
        }
    }

    // Upload video if provided
    if (req.files.video) {
        videoUploadResponse = await uploadOnCloudinary(req.files.video[0].path);
        if (!videoUploadResponse) {
            throw new ApiError(500, "Failed to upload video to Cloudinary");
        }
    }

    // Create the post in the database
    const post = await Post.create({
        owner: {
            userType: req.userType, // 'Traveler' or 'Agency'
            userId: req.user._id,
        },
        image: imageUploadResponse?.secure_url || null, // Use the image URL if provided
        video: videoUploadResponse?.secure_url || null, // Use the video URL if provided
        thumbnail: videoUploadResponse?.secure_url || null, // Use video thumbnail if video is uploaded
        caption: caption || null, // Optional caption
        location: location || null, // Optional location
        views: 0, // Initialize views counter
        isPublished: true,
    });

    res.status(201).json(new ApiResponse(201, post, "Post published successfully"));
});


// Increment view count
const incrementView = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        throw new ApiError(400, "Invalid postId");
    }

    const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { views: 1 } },
        { new: true }
    );

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    res.status(200).json(new ApiResponse(200, post, "Post views updated"));
});


// Update post (caption, thumbnail)
const updatePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;
    const { caption, thumbnail } = req.body;

    if (!caption && !thumbnail) {
        throw new ApiError(400, "Nothing to update");
    }

    const post = await Post.findByIdAndUpdate(
        postId,
        { caption, thumbnail },
        { new: true }
    );

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    res.status(200).json(new ApiResponse(200, post, "Post updated successfully"));
});


// Delete a post and remove associated media from Cloudinary
const deletePost = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    // Find the post by its ID
    const post = await Post.findById(postId);

    // If post doesn't exist, throw an error
    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    try {
        // Prepare an array to hold promises for media deletion
        const deletionPromises = [];

        // Check if post has an image and delete it from Cloudinary
        if (post.image) {
            const imagePublicId = post.image.split("/").pop().split(".")[0]; // Extract public ID
            deletionPromises.push(deleteFromCloudinary(imagePublicId)); // Add promise for image deletion
        }

        // Check if post has a video and delete it from Cloudinary
        if (post.video) {
            const videoPublicId = post.video.split("/").pop().split(".")[0]; // Extract public ID
            deletionPromises.push(deleteFromCloudinary(videoPublicId)); // Add promise for video deletion
        }

        // Wait for all deletion promises to resolve concurrently
        await Promise.all(deletionPromises);

        // Now delete the post from the database
        await Post.findByIdAndDelete(postId);  // This is the correct way to delete a post by its ID

    } catch (error) {
        // Catch any error that occurs during the media deletion process
        console.error("Error deleting media from Cloudinary:", error);
        throw new ApiError(500, "Error deleting media from Cloudinary");
    }

    // Send a success response
    res.status(200).json(new ApiResponse(200, null, "Post and associated media deleted successfully"));
});


// Toggle publish status
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        throw new ApiError(404, "Post not found");
    }

    post.isPublished = !post.isPublished;
    await post.save();

    res.status(200).json(new ApiResponse(200, post, "Post publish status toggled"));
});


export {
    getAllPost,
    getPostById,
    publishAPost,
    incrementView,
    updatePost,
    deletePost,
    togglePublishStatus,
};
