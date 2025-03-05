import { Router } from "express";
import {

  registerAgency,
  loginAgency,
  logoutAgency,
  refreshAccessToken,
  changePassword,
  curruntAgencyProfile,
  updateProfileDetails,
  updateAvatar,
  deleteAvatar,
  updateCoverImage,
  deleteCoverImage,

} from "../controllers/agency.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";


const router = Router()


// Register Agency
router.route("/register").post(registerAgency)

// Login Agency
router.route("/login").post(loginAgency)

// Logout Agency
router.route("/logout").post(verifyAgencyJWT, logoutAgency)

// Refresh Token API
router.route("/refreshToken").post(refreshAccessToken)

// Get Agency Profile
router.route("/currentAgency").get(verifyAgencyJWT, curruntAgencyProfile)

// Update Agency Profile
router.route("/updateProfile").patch(verifyAgencyJWT, updateProfileDetails)

// Change Password
router.route("/changePassword").post(verifyAgencyJWT, changePassword)

// Update Avatar
router.route("/updateAvatar").patch(verifyAgencyJWT, upload.single("avatar"), updateAvatar);

// Delete Avatar
router.route("/deleteAvatar").delete(verifyAgencyJWT, deleteAvatar);

// Update Cover Image
router.route("/updateCoverImage").patch(verifyAgencyJWT, upload.single("coverImage"), updateCoverImage);

// Delete Cover Image
router.route("/deleteCoverImage").delete(verifyAgencyJWT, deleteCoverImage);

export default router