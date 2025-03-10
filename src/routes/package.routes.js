import express from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
} from "../controllers/package.controller.js";

const router = express.Router();

// Public routes
router.get("/", getAllPackages);
router.get("/:packageId", getPackageById);

// Agency-protected routes
router.post(
    "/create",
    verifyAgencyJWT,
    upload.array("photos", 4),
    createPackage
);
router.put(
    "/update/:packageId",
    verifyAgencyJWT,
    upload.array("photos", 4),
    updatePackage
);
router.delete("/delete/:packageId", verifyAgencyJWT, deletePackage);

export default router;