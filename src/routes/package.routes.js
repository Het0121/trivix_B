import { Router } from "express";
import {
  getAllPackages,
  getPackages,
  getPackage,
  createPackage,
  updatePackage,
  deletePackage,
} from "../controllers/package.controller.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public routes
router.get("/all", getAllPackages);
router.get("/detail/:packageId", getPackage);

// Protected agency routes
router.use(verifyAgencyJWT);

// Package management for agencies
router
  .route("/")
  .get(getPackages)
  .post(upload.fields([{ name: "photos", maxCount: 4 }]), createPackage);

router
  .route("/:packageId")
  .put(upload.fields([{ name: "photos", maxCount: 4 }]), updatePackage)
  .delete(deletePackage);

export default router;
