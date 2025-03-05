import { Router } from 'express';
import {

  togglePostLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedPost,
  togglePackageLike,
  getLikedPackage,

} from '../controllers/like.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { verifyAgencyJWT } from '../middlewares/agencyAuth.middleware.js';


const router = Router();


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

// Toggle like for a post
router.route('/posts/:postId/like').post(verifyUser, togglePostLike);

// Toggle like for a comment
router.route('/comments/:commentId/like').post(verifyUser, toggleCommentLike);

// Toggle like for a tweet
router.route('/tweets/:tweetId/like').post(verifyUser, toggleTweetLike);

// Get all liked posts of a user
router.route('/posts/liked').get(verifyUser, getLikedPost);

// Toggle like for a package
router.route('/packages/:packageId/like').post(verifyUser, togglePackageLike);

// Get all liked packages of a user
router.route('/packages/liked').get(verifyUser, getLikedPackage);

export default router;
