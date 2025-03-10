import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
} from "../controllers/package.controller.js";

const router = Router();

// Public routes

// Get All Packages
router.route("/").get(getAllPackages);

// Get Package By ID
router.get("/:packageId", getPackageById);

// Agency-protected routes

//Create Package 
router.post(
    "/create",
    verifyAgencyJWT,
    upload.array("photos", 4),
    createPackage
);

// Upate Package
router.put(
    "/update/:packageId",
    verifyAgencyJWT,
    upload.array("photos", 4),
    updatePackage
);

// Delete Package
router.delete("/delete/:packageId", verifyAgencyJWT, deletePackage);

export default router;