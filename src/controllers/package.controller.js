import mongoose, { isValidObjectId } from "mongoose";
import { Package } from "../models/package.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

// Middleware to ensure the requester is an Agency
const ensureAgency = (req, res, next) => {
    if (!req.agency) {
        throw new ApiError(403, "Only agencies are authorized to perform this action");
    }
    next();
};

// Create a new package
const createPackage = asyncHandler(async (req, res) => {
    const agencyId = req.agency?._id;

    if (!isValidObjectId(agencyId)) {
        throw new ApiError(400, "Invalid agency ID.");
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
        isActivated,
    } = req.body;

    if (!title || !mainLocation || !fromLocation || !toLocation || !startDate || !endDate || !description || !price || !maxSlots) {
        throw new ApiError(400, "All required fields must be provided.");
    }

    if (new Date(startDate) >= new Date(endDate)) {
        throw new ApiError(400, "End date must be after start date.");
    }

    const photos = req.file ? await uploadOnCloudinary(req.file.path) : [];

    const newPackage = new Package({
        title,
        agency: agencyId,
        mainLocation,
        fromLocation,
        toLocation,
        startDate,
        endDate,
        description,
        servicesAndFacilities,
        activities,
        itinerary: Array.isArray(itinerary) ? itinerary : [],
        price,
        maxSlots,
        availableSlots: maxSlots,
        photos,
        isActivated: isActivated !== undefined ? isActivated : true,
    });

    await newPackage.save();

    res.status(201).json(new ApiResponse(201, "Package created successfully.", newPackage));
});

// Update an existing package
const updatePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID.");
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        throw new ApiError(404, "Package not found.");
    }

    const updateData = { ...req.body };

    if (req.files?.photos) {
        if (packageDoc.photos.length) {
            await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
        }

        updateData.photos = await Promise.all(
            req.files.photos.map((file) => uploadOnCloudinary(file.path, "packages"))
        );
    }

    if (updateData.startDate && updateData.endDate && new Date(updateData.startDate) >= new Date(updateData.endDate)) {
        throw new ApiError(400, "End date must be after start date.");
    }

    if (updateData.hasOwnProperty('isActivated')) {
        updateData.isActivated = updateData.isActivated !== undefined ? updateData.isActivated : true;
    }

    const updatedPackage = await Package.findByIdAndUpdate(packageId, updateData, {
        new: true,
        runValidators: true,
    });

    res.status(200).json(new ApiResponse(200, "Package updated successfully.", updatedPackage));
});

// Delete a package
const deletePackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID.");
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        throw new ApiError(404, "Package not found.");
    }

    if (packageDoc.photos.length) {
        await Promise.all(packageDoc.photos.map((photo) => deleteFromCloudinary(photo)));
    }

    await packageDoc.remove();

    res.status(200).json(new ApiResponse(200, "Package deleted successfully."));
});


// Get a single package by ID
const getPackage = asyncHandler(async (req, res) => {
    const { packageId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(packageId)) {
        throw new ApiError(400, "Invalid package ID.");
    }

    const packageDoc = await Package.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(packageId) } },
        {
            $lookup: {
                from: "agencies",
                localField: "agency",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        { $unwind: "$agencyDetails" },
    ]);

    if (!packageDoc.length) {
        throw new ApiError(404, "Package not found.");
    }

    res.status(200).json(new ApiResponse(200, "Package fetched successfully.", packageDoc[0]));
});


// Get all packages with optional filters
const getPackages = asyncHandler(async (req, res) => {
    const { agencyId, location, startDate, endDate, minPrice, maxPrice, isActivated } = req.query;

    const matchFilter = {};
    if (agencyId && isValidObjectId(agencyId)) matchFilter.agency = mongoose.Types.ObjectId(agencyId);
    if (location) matchFilter.mainLocation = { $regex: location, $options: "i" };
    if (startDate || endDate) {
        matchFilter.startDate = { ...(startDate && { $gte: new Date(startDate) }) };
        if (endDate) matchFilter.startDate.$lte = new Date(endDate);
    }
    if (minPrice || maxPrice) {
        matchFilter.price = { ...(minPrice && { $gte: Number(minPrice) }), ...(maxPrice && { $lte: Number(maxPrice) }) };
    }
    if (isActivated !== undefined) matchFilter.isActivated = isActivated === "true";

    const packages = await Package.aggregate([
        {
            $lookup: {
                from: "agencies",
                localField: "agency",
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        { $unwind: "$agencyDetails" },
        { $match: matchFilter },
        { $sort: { createdAt: -1 } },
    ]);

    res.status(200).json(new ApiResponse(200, "Packages fetched successfully.", packages));
});


// Toggle package activation status
const togglePackageActivation = asyncHandler(async (req, res) => {
    const { packageId } = req.params;

    if (!isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid package ID.");
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        throw new ApiError(404, "Package not found.");
    }

    packageDoc.isActivated = !packageDoc.isActivated;
    await packageDoc.save();

    res.status(200).json(new ApiResponse(200, "Package activation status updated.", packageDoc));
});


export {
    ensureAgency,
    createPackage,
    updatePackage,
    deletePackage,
    getPackage,
    getPackages,
    togglePackageActivation,
};
