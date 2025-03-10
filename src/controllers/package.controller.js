import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { Agency } from "../models/agency.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Get all packages with pagination
const getAllPackages = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sort = "createdAt", order = "desc" } = req.query;
    
    // Convert to numbers and validate
    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = Math.max(1, Math.min(5, parseInt(limit))); // Limiting to max 50 items per page
    
    // Calculate skip value for pagination
    const skip = (pageNumber - 1) * limitNumber;
    
    // Build sort object
    const sortObj = {};
    sortObj[sort] = order === "asc" ? 1 : -1;
    
    // Count total documents for pagination metadata
    const totalPackages = await Package.countDocuments({ isActive: true });
    
    // Fetch packages with pagination
    const packages = await Package.find({ isActive: true })
        .populate("agency", "name email")
        .sort(sortObj)
        .skip(skip)
        .limit(limitNumber);
    
    // Prepare pagination metadata
    const paginationData = {
        total: totalPackages,
        totalPages: Math.ceil(totalPackages / limitNumber),
        currentPage: pageNumber,
        hasNext: pageNumber < Math.ceil(totalPackages / limitNumber),
        hasPrev: pageNumber > 1
    };
    
    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            { packages, pagination: paginationData }, 
            "Packages retrieved successfully"
        ));
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

    // Create update object
    const updateData = {};
    
    // Basic text fields
    if (title) updateData.title = title;
    if (mainLocation) updateData.mainLocation = mainLocation;
    if (fromLocation) updateData.fromLocation = fromLocation;
    if (toLocation) updateData.toLocation = toLocation;
    if (startDate) updateData.startDate = startDate;
    if (endDate) updateData.endDate = endDate;
    if (description) updateData.description = description;
    if (price) updateData.price = price;
    if (maxSlots) updateData.maxSlots = maxSlots;
    if (availableSlots) updateData.availableSlots = availableSlots;
    
    // Array fields parsing - consistent with createPackage
    if (servicesAndFacilities) {
        updateData.servicesAndFacilities = typeof servicesAndFacilities === "string" 
            ? servicesAndFacilities.split(",").map(s => s.trim())
            : servicesAndFacilities;
    }
    
    if (activities) {
        updateData.activities = typeof activities === "string"
            ? activities.split(",").map(s => s.trim())
            : activities;
    }
    
    // Handle itinerary - ensure it's properly parsed
    if (itinerary) {
        try {
            updateData.itinerary = typeof itinerary === "string"
                ? JSON.parse(itinerary)
                : itinerary;
                
            if (!Array.isArray(updateData.itinerary)) {
                throw new Error();
            }
        } catch (error) {
            throw new ApiError(400, "Invalid itinerary format. It should be a valid JSON array.");
        }
    }

    // Handle photo uploads
    const files = req.files;
    if (files && files.length > 0) {
        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Upload new photos
            const uploadPromises = files.map(file => uploadOnCloudinary(file.path));
            const uploadResults = await Promise.all(uploadPromises);
            const newPhotoUrls = uploadResults
                .map(result => result?.url)
                .filter(url => url);
                
            // Verify we have at least one valid photo
            if (newPhotoUrls.length === 0) {
                throw new ApiError(400, "Failed to upload photos");
            }
            
            updateData.photos = newPhotoUrls;
            
            // Update the package
            const updatedPackage = await Package.findByIdAndUpdate(
                packageId,
                { $set: updateData },
                { new: true, session }
            );
            
            // If update succeeded, delete old photos
            if (travelPackage.photos && travelPackage.photos.length > 0) {
                const deletePromises = travelPackage.photos.map(photo => {
                    // Extract public ID more safely
                    try {
                        const url = new URL(photo);
                        const pathParts = url.pathname.split('/');
                        const filename = pathParts[pathParts.length - 1];
                        const publicId = filename.split('.')[0];
                        return deleteFromCloudinary(publicId);
                    } catch (error) {
                        console.error("Error extracting public ID:", error);
                        return Promise.resolve(); // Continue even if one deletion fails
                    }
                });
                await Promise.all(deletePromises);
            }
            
            await session.commitTransaction();
            
            return res
                .status(200)
                .json(new ApiResponse(200, updatedPackage, "Package updated successfully"));
                
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } else {
        // If no new photos, just update the package data
        const updatedPackage = await Package.findByIdAndUpdate(
            packageId,
            { $set: updateData },
            { new: true }
        );

        return res
            .status(200)
            .json(new ApiResponse(200, updatedPackage, "Package updated successfully"));
    }
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