import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// get all packages for all Users
const getAllPackages = asyncHandler(async (req, res) => {
    const { search, fromLocation, toLocation, minPrice, maxPrice, sortBy, sortOrder } = req.query;
    
    // Build query
    const query = { isActive: true };
    
    // Search in title and description
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } }
        ];
    }
    
    // Filter by location
    if (fromLocation) query.fromLocation = { $regex: fromLocation, $options: "i" };
    if (toLocation) query.toLocation = { $regex: toLocation, $options: "i" };
    
    // Filter by price range
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) query.price.$gte = Number(minPrice);
        if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    // Sort options
    const sort = {};
    if (sortBy) {
        sort[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
        sort.createdAt = -1; // Default sort by newest
    }
    
    const packages = await Package.find(query)
        .populate("agency", "name email phone profileImage")
        .sort(sort);
    
    return res.status(200).json(
        new ApiResponse(200, packages, "Packages fetched successfully")
    );
});

// Create Package
const createPackage = asyncHandler(async (req, res) => {
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
        maxSlots
    } = req.body;
    
    // Validation
    if (
        [title, mainLocation, fromLocation, toLocation, startDate, endDate, description, price, maxSlots].some(
            field => field === undefined || field === null || field === ""
        )
    ) {
        throw new ApiError(400, "All required fields must be provided");
    }
    
    // Validate itinerary
    if (!itinerary || !Array.isArray(itinerary) || itinerary.length === 0) {
        throw new ApiError(400, "Itinerary must be provided as an array of objects");
    }
    
    for (const item of itinerary) {
        if (!item.day || !item.description) {
            throw new ApiError(400, "Each itinerary item must have day and description");
        }
    }
    
    // Handle photo uploads
    const photoLocalPaths = req.files?.photos?.map(file => file.path) || [];
    
    if (photoLocalPaths.length === 0) {
        throw new ApiError(400, "At least one photo is required");
    }
    
    if (photoLocalPaths.length > 4) {
        throw new ApiError(400, "Maximum 4 photos are allowed");
    }
    
    // Upload to cloudinary
    const photoUploadPromises = photoLocalPaths.map(path => uploadOnCloudinary(path));
    const photoResults = await Promise.all(photoUploadPromises);
    
    // Check if any upload failed
    if (photoResults.some(result => !result || !result.url)) {
        throw new ApiError(500, "Error uploading images");
    }
    
    const photoUrls = photoResults.map(result => result.url);
    
    // Create package
    const newPackage = await Package.create({
        title,
        agency: req.agency._id,
        mainLocation,
        fromLocation,
        toLocation,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description,
        servicesAndFacilities: servicesAndFacilities || [],
        activities: activities || [],
        itinerary,
        photos: photoUrls,
        price: Number(price),
        maxSlots: Number(maxSlots),
        availableSlots: Number(maxSlots)
    });
    
    return res.status(201).json(
        new ApiResponse(201, newPackage, "Package created successfully")
    );
});

// get all packages only for agency who made those packages 
const getPackages = asyncHandler(async (req, res) => {
    const agencyId = req.agency._id;
    
    if (!agencyId) {
        throw new ApiError(400, "Agency ID is required");
    }
    
    const { status } = req.query;
    
    // Build query based on active status
    const query = { agency: agencyId };
    
    if (status === "active") {
        query.isActive = true;
    } else if (status === "inactive") {
        query.isActive = false;
    }
    
    const packages = await Package.find(query).sort({ createdAt: -1 });
    
    return res.status(200).json(
        new ApiResponse(200, packages, "Agency packages fetched successfully")
    );
});

// get package By ID 
const getPackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    
    if (!packageId || !isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }
    
    const packageData = await Package.findById(packageId)
        .populate("agency", "name email phone profileImage");
    
    if (!packageData) {
        throw new ApiError(404, "Package not found");
    }
    
    return res.status(200).json(
        new ApiResponse(200, packageData, "Package fetched successfully")
    );
});

// Update package 
const updatePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const agencyId = req.agency._id;
    
    if (!packageId || !isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }
    
    // Find the package and check ownership
    const existingPackage = await Package.findById(packageId);
    
    if (!existingPackage) {
        throw new ApiError(404, "Package not found");
    }
    
    if (existingPackage.agency.toString() !== agencyId.toString()) {
        throw new ApiError(403, "You are not authorized to update this package");
    }
    
    // Fields to update
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
        isActive
    } = req.body;
    
    // Prepare update object
    const updateData = {};
    
    if (title !== undefined) updateData.title = title;
    if (mainLocation !== undefined) updateData.mainLocation = mainLocation;
    if (fromLocation !== undefined) updateData.fromLocation = fromLocation;
    if (toLocation !== undefined) updateData.toLocation = toLocation;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (description !== undefined) updateData.description = description;
    if (servicesAndFacilities !== undefined) updateData.servicesAndFacilities = servicesAndFacilities;
    if (activities !== undefined) updateData.activities = activities;
    if (itinerary !== undefined) {
        // Validate itinerary
        if (!Array.isArray(itinerary) || itinerary.length === 0) {
            throw new ApiError(400, "Itinerary must be provided as an array of objects");
        }
        
        for (const item of itinerary) {
            if (!item.day || !item.description) {
                throw new ApiError(400, "Each itinerary item must have day and description");
            }
        }
        
        updateData.itinerary = itinerary;
    }
    if (price !== undefined) updateData.price = Number(price);
    if (maxSlots !== undefined) updateData.maxSlots = Number(maxSlots);
    if (availableSlots !== undefined) updateData.availableSlots = Number(availableSlots);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle photo uploads if provided
    if (req.files && req.files.photos && req.files.photos.length > 0) {
        const photoLocalPaths = req.files.photos.map(file => file.path);
        
        if (photoLocalPaths.length > 4) {
            throw new ApiError(400, "Maximum 4 photos are allowed");
        }
        
        // Delete existing photos from cloudinary
        if (existingPackage.photos && existingPackage.photos.length > 0) {
            const deletePromises = existingPackage.photos.map(url => deleteFromCloudinary(url));
            await Promise.all(deletePromises);
        }
        
        // Upload new photos
        const photoUploadPromises = photoLocalPaths.map(path => uploadOnCloudinary(path));
        const photoResults = await Promise.all(photoUploadPromises);
        
        // Check if any upload failed
        if (photoResults.some(result => !result || !result.url)) {
            throw new ApiError(500, "Error uploading images");
        }
        
        updateData.photos = photoResults.map(result => result.url);
    }
    
    // Update package
    const updatedPackage = await Package.findByIdAndUpdate(
        packageId,
        updateData,
        { new: true, runValidators: true }
    );
    
    return res.status(200).json(
        new ApiResponse(200, updatedPackage, "Package updated successfully")
    );
});

// Delete package 
const deletePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;
    const agencyId = req.agency._id;
    
    if (!packageId || !isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID");
    }
    
    // Find the package and check ownership
    const existingPackage = await Package.findById(packageId);
    
    if (!existingPackage) {
        throw new ApiError(404, "Package not found");
    }
    
    if (existingPackage.agency.toString() !== agencyId.toString()) {
        throw new ApiError(403, "You are not authorized to delete this package");
    }
    
    // Delete photos from cloudinary
    if (existingPackage.photos && existingPackage.photos.length > 0) {
        const deletePromises = existingPackage.photos.map(url => deleteFromCloudinary(url));
        await Promise.all(deletePromises);
    }
    
    // Delete package
    await Package.findByIdAndDelete(packageId);
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Package deleted successfully")
    );
});

export {
    getAllPackages,
    getPackages,
    getPackage,
    createPackage,
    updatePackage,
    deletePackage
};