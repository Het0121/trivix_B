import { Router } from "express";
import {

    getAllPost,
    publishAPost,
    getPostById,
    incrementView,
    updatePost,
    deletePost,
    togglePublishStatus,

} from "../controllers/post.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyUser } from "../middlewares/verifyUser.middleware.js"

const router = Router();


// Publish a new post (POST with image/video upload)
router.route("/post").post(
    verifyUser,
    upload.fields([
        {
            name: "image",
            maxCount: 1,
        },
        {
            name: "video",
            maxCount: 1, 
        },
    ]),
    publishAPost
);



// Get all posts
router.route("/posts").get(verifyUser, getAllPost);

// Get a post by ID
router.route("/post/:postId").get(verifyUser, getPostById);

// Increment view count
router.route("/post/:postId/view").patch(verifyUser, incrementView);

// Update post (caption, thumbnail)
router.route("/post/:postId").patch(verifyUser, updatePost);

// Delete a post
router.route("/post/:postId").delete(verifyUser, deletePost);

// Toggle publish status of a post
router.route("/post/:postId/publish").patch(verifyUser, togglePublishStatus);

export default router;