import { Router } from "express";
import { 

    ensureAgency,
    createOwner,
    getAllOwnersWithAgencyDetails,
    getOwnerById,
    updateOwner,
    updateAvatar,
    deleteOwner,

} from "../controllers/owner.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";

const router = Router();


// Register User
router.route("/register").post(verifyAgencyJWT, ensureAgency, upload.single("avatar"), createOwner);

// Get All Owners with Agency Details
router.route("/owners",).get( verifyAgencyJWT, ensureAgency, getAllOwnersWithAgencyDetails );

// Get Owner by ID
router.route("/:ownerId").get( verifyAgencyJWT, ensureAgency, getOwnerById );

// Update Owner Details
router.route("/:ownerId").patch( verifyAgencyJWT, ensureAgency, updateOwner);

// Update Owner Avatar
router.route("/:ownerId/avatar").patch(verifyAgencyJWT, ensureAgency, upload.single("avatar"), updateAvatar);

// Delete Owner
router.route("/:ownerId").delete(verifyAgencyJWT, ensureAgency, deleteOwner );

export default router;
