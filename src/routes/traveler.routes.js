import { Router } from "express";
import {

  registerTraveler,
  loginTraveler,
  logoutTraveler,
  refreshAccessToken,
  changePassword,
  curruntTravelerProfile,
  updateProfileDetails,
  updateAvatar,
  deleteAvatar,
  updateCoverImage,
  deleteCoverImage,
  togglePrivacy,
  getUserProfile

} from "../controllers/traveler.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()


// Register Traveler
router.route("/register").post(registerTraveler)

// Login Traveler
router.route("/login").post(loginTraveler)

// Logout Traveler
router.route("/logout").post(verifyJWT, logoutTraveler)

// Refresh Token API
router.route("/refreshToken").post(refreshAccessToken)

// Get Traveler Profile
router.route("/currentTraveler").get(verifyJWT, curruntTravelerProfile)

// Update Traveler Profile
router.route("/updateProfile").patch(verifyJWT, updateProfileDetails)

// Change Password
router.route("/changePassword").post(verifyJWT, changePassword)

// Update Avatar
router.route("/updateAvatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);

// Delete Avatar
router.route("/deleteAvatar").delete(verifyJWT, deleteAvatar);

// Update Cover Image
router.route("/updateCoverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);

// Delete Cover Image
router.route("/deleteCoverImage").delete(verifyJWT, deleteCoverImage);

// Privacy Tonggle For Make Public & Private profile 
router.route("/toggle-privacy").patch(verifyJWT, togglePrivacy)

// Get User Profile by Search
router.route("/profile/:userName").get(verifyJWT, getUserProfile);

export default router