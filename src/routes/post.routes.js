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
import  { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

// Middleware to verify user type (Traveler or Agency) before accessing routes
const verifyUser = async (req, res, next) => {
  try {
      const userType = req.headers["user-type"];
      if (!userType) {
          return res.status(400).json({ error: "User type is required in headers." });
      }

      if (userType === "Traveler") {
          await verifyJWT(req, res, () => {
              req.userType = "Traveler"; // Set user type
              req.user = req.traveler;  // Normalize user object
              next();
          });
      } else if (userType === "Agency") {
          await verifyAgencyJWT(req, res, () => {
              req.userType = "Agency"; // Set user type
              req.user = req.agency;  // Normalize user object
              next();
          });
      } else {
          return res.status(400).json({ error: "Invalid user type. Must be 'Traveler' or 'Agency'." });
      }
  } catch (error) {
      res.status(401).json({ error: error.message });
  }
};

const router = Router();



// Publish a new post (POST with image/video upload)
router.route("/post").post(
    verifyUser,
    upload.fields([
        {
            name: "image",
            maxCount: 1, // Allow only one image
        },
        {
            name: "video",
            maxCount: 1, // Allow only one video
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

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NzYwMzA0MTRkMDYxMjc1MzE5MTc0YjQiLCJwaG9uZU5vIjoiNzgwMTk5NzcyOSIsInVzZXJOYW1lIjoiaF9lX3RfMjEiLCJmdWxsTmFtZSI6IkhldCBQcmFqYXBhdGkiLCJpYXQiOjE3MzQzNTcxNDMsImV4cCI6MTczNDQ0MzU0M30.JBkuDQcDwsi8sTo9duwzIn37w5QcMwyqOvEQDkfAV0Y