import { Router } from "express";
import {
    ensureAgency,
    createPackage,
    updatePackage,
    deletePackage,
    getPackage,
    getPackages,
} from "../controllers/package.controller.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Route to create a new package
router.route(
    "/createpackage").post(
    verifyAgencyJWT,
    ensureAgency,
    upload.fields([
        {
            name: "photos",
            maxCount: 4, // Maximum of 4 photos allowed
        },
    ]),
    createPackage
);

// Route to update an existing package
router.route(
    "/update/:packageId").patch(
    verifyAgencyJWT,
    upload.fields([
        {
            name: "photos",
            maxCount: 4, // Maximum of 4 photos allowed
        },
    ]),
    updatePackage
);

// Route to delete a package
router.route("/delete/:packageId").delete(verifyAgencyJWT, deletePackage);

// Route to get a specific package by ID
router.route("/:packageId").get(verifyAgencyJWT, getPackage);

// Route to get all packages with optional filters
router.route("/allpackages").get(verifyAgencyJWT, getPackages);

export default router;
