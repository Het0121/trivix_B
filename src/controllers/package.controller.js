import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { Agency } from "../models/agency.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Get all packages
const getAllPackages = asyncHandler(async (req, res) => {
    const packages = await Package.find({ isActive: true })
        .populate("agency", "name email")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(new ApiResponse(200, packages, "Packages retrieved successfully"));
});

// Get package by ID
const getPackageById = asyncHandler(async (req, res) => {
    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }

    const travelPackage = await Package.findById(packageId).populate("agency");

    if (!travelPackage || !travelPackage.isActive) {
        throw new ApiError(404, "Package not found");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, travelPackage, "Package retrieved successfully"));
});

// Create packages
const createPackage = asyncHandler(async (req, res) => {
    const agencyId = req.agency?._id;
    if (!agencyId) {
        throw new ApiError(401, "Agency authentication required");
    }

    const {
        title,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities = [],
        activities = [],
        price,
        maxSlots,
        availableSlots,
    } = req.body;

    // Parse JSON string fields from form-data
    const parsedServices = typeof servicesAndFacilities === "string" 
        ? servicesAndFacilities.split(",").map((s) => s.trim()) 
        : servicesAndFacilities;

    const parsedActivities = typeof activities === "string" 
        ? activities.split(",").map((s) => s.trim()) 
        : activities;

    let parsedItinerary = [];
    if (req.body.itinerary) {
        try {
            parsedItinerary = JSON.parse(req.body.itinerary);
            if (!Array.isArray(parsedItinerary)) {
                throw new Error();
            }
        } catch (error) {
            throw new ApiError(400, "Invalid itinerary format. It should be a valid JSON array.");
        }
    }

    const files = req.files || [];
    let photoUrls = [];

    if (files.length > 0) {
        const uploadResults = await Promise.all(
            files.map((file) => uploadOnCloudinary(file.path))
        );
        photoUrls = uploadResults.map((result) => result?.url).filter(Boolean);
    }

    if (photoUrls.length === 0) {
        throw new ApiError(400, "At least one photo is required");
    }

    const newPackage = await Package.create({
        title,
        agency: agencyId,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities: parsedServices,
        activities: parsedActivities,
        itinerary: parsedItinerary, // Now properly parsed
        photos: photoUrls,
        price,
        maxSlots,
        availableSlots: availableSlots || maxSlots,
    });

    return res.status(201).json(new ApiResponse(201, newPackage, "Package created successfully"));
});



// Update package
const updatePackage = asyncHandler(async (req, res) => {
    const agencyId = req.agency?._id;
    if (!agencyId) {
        throw new ApiError(401, "Agency authentication required");
    }

    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }

    const travelPackage = await Package.findOne({
        _id: packageId,
        agency: agencyId,
    });

    if (!travelPackage) {
        throw new ApiError(404, "Package not found or not authorized");
    }

    const {
        title,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities,
        activities,
        itinerary,
        price,
        maxSlots,
        availableSlots,
    } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (mainLocation) updateData.mainLocation = mainLocation;
    if (fromLocation) updateData.fromLocation = fromLocation;
    if (toLocation) updateData.toLocation = toLocation;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (description) updateData.description = description;
    if (servicesAndFacilities)
        updateData.servicesAndFacilities = JSON.parse(servicesAndFacilities);
    if (activities) updateData.activities = JSON.parse(activities);
    if (itinerary) updateData.itinerary = JSON.parse(itinerary);
    if (price) updateData.price = price;
    if (maxSlots) updateData.maxSlots = maxSlots;
    if (availableSlots) updateData.availableSlots = availableSlots;

    const files = req.files;
    if (files && files.length > 0) {
        if (travelPackage.photos && travelPackage.photos.length > 0) {
            const deletePromises = travelPackage.photos.map((photo) => {
                const publicId = photo.split("/").pop().split(".")[0];
                return deleteFromCloudinary(publicId);
            });
            await Promise.all(deletePromises);
        }

        const uploadPromises = files.map((file) => uploadOnCloudinary(file.path));
        const uploadResults = await Promise.all(uploadPromises);
        updateData.photos = uploadResults
            .map((result) => result?.url)
            .filter((url) => url);
    }

    const updatedPackage = await Package.findByIdAndUpdate(
        packageId,
        { $set: updateData },
        { new: true }
    );

    return res
        .status(200)
        .json(new ApiResponse(200, updatedPackage, "Package updated successfully"));
});

// Delete a package
const deletePackage = asyncHandler(async (req, res) => {
    const agencyId = req.agency?._id;
    if (!agencyId) {
        throw new ApiError(401, "Agency authentication required");
    }

    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }

    const travelPackage = await Package.findOne({
        _id: packageId,
        agency: agencyId,
    });

    if (!travelPackage) {
        throw new ApiError(404, "Package not found or not authorized");
    }

    if (travelPackage.photos && travelPackage.photos.length > 0) {
        const deletePromises = travelPackage.photos.map((photo) => {
            const publicId = photo.split("/").pop().split(".")[0];
            return deleteFromCloudinary(publicId);
        });
        await Promise.all(deletePromises);
    }

    await Package.findByIdAndDelete(packageId);

    return res
        .status(200)
        .json(new ApiResponse(200, null, "Package deleted successfully"));
});

export {
    getAllPackages,
    getPackageById,
    createPackage,
    updatePackage,
    deletePackage,
};