import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { Owner } from "../models/owner.model.js";
import { Agency } from "../models/agency.model.js"; 
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";


// Middleware to ensure the requester is an Agency
const ensureAgency = (req, res, next) => {
    if (!req.agency) {
        throw new ApiError(403, "Only agencies are authorized to perform this action");
    }
    next();
};


// Create a new owner
const createOwner = asyncHandler(async (req, res) => {
    const { ownerNames, email, phoneNo, gender, dob } = req.body;

    if (![ownerNames, email, phoneNo].every(Boolean)) {
        throw new ApiError(400, "Owner names, email, and phone numbers are required");
    }

    if (ownerNames.length > 3 || phoneNo.length > 3) {
        throw new ApiError(400, "You can only provide up to 3 names and 3 phone numbers");
    }

    const existingOwner = await Owner.findOne({
        $or: [{ email }, { phoneNo: { $in: phoneNo } }],
    });

    if (existingOwner) {
        throw new ApiError(409, "Owner with the given email or phone number already exists");
    }

    const avatar = req.file ? await uploadOnCloudinary(req.file.path) : null;

    const owner = await Owner.create({
        ownerNames,
        email,
        phoneNo,
        gender,
        dob,
        avatar: avatar?.url || "",
        agency: req.agency._id, // Set agencyId from the authenticated agency
    });

    return res.status(201).json(new ApiResponse(201, owner, "Owner created successfully"));
});


// Get all owners with agency details
const getAllOwnersWithAgencyDetails = asyncHandler(async (req, res) => {
    const agencyId = req.agency._id; // Assuming the agency is accessible from req.agency

    const owners = await Owner.aggregate([
        {
            $match: {
                agency: agencyId, // Ensure the owners belong to the current agency
            },
        },
        {
            $lookup: {
                from: "agencies", // Join the 'agencies' collection
                localField: "agency", // Assuming 'agency' is a field in the owner model
                foreignField: "_id",
                as: "agencyDetails",
            },
        },
        {
            $unwind: {
                path: "$agencyDetails",
                preserveNullAndEmptyArrays: true, // If no matching agency, still return owner data
            },
        },
        {
            $project: {
                ownerNames: 1,
                email: 1,
                phoneNo: 1,
                gender: 1,
                dob: 1,
                avatar: 1,
                "agencyDetails.agencyName": 1,
                "agencyDetails.username": 1,
                "agencyDetails.avatar": 1,
            },
        },
    ]);

    if (!owners || owners.length === 0) {
        throw new ApiError(404, "No owners found for this agency");
    }

    return res.status(200).json({
        success: true,
        message: "Owners fetched successfully",
        data: owners,
    });
});


// Get a single owner by ID
const getOwnerById = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId).populate("agency", "agencyName userName avatar");
    if (!owner) {
        throw new ApiError(404, "Owner not found");
    }

    return res.status(200).json(new ApiResponse(200, owner, "Owner fetched successfully"));
});


// Update an owner
const updateOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    const { ownerNames, email, phoneNo, gender, dob } = req.body;

    const updateData = {};
    if (ownerNames) updateData.ownerNames = ownerNames;
    if (phoneNo) updateData.phoneNo = phoneNo;
    if (email) updateData.email = email;
    if (gender) updateData.gender = gender;
    if (dob) updateData.dob = dob;

    const owner = await Owner.findOneAndUpdate(
        { _id: ownerId, agency: req.agency._id },
        updateData,
        { new: true, runValidators: true }
    );

    if (!owner) {
        throw new ApiError(404, "Owner not found or unauthorized to update");
    }

    return res.status(200).json(new ApiResponse(200, owner, "Owner updated successfully"));
});


// Update owner avatar
const updateAvatar = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;
    const agencyId = req.agency._id; // Ensure we have the agency ID from the authenticated request

    // Check if the owner exists and is associated with the current agency
    const owner = await Owner.findOne({ _id: ownerId, agency: agencyId });

    if (!owner) {
        throw new ApiError(404, "Owner not found or unauthorized to update avatar");
    }

    if (!req.file) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Delete the old avatar if it exists
    if (owner.avatar) {
        const publicId = owner.avatar.split("/").pop().split(".")[0]; // Extract the public ID of the old avatar
        await deleteFromCloudinary(publicId);
    }

    // Upload the new avatar
    const avatar = await uploadOnCloudinary(req.file.path);

    // Update the owner with the new avatar URL
    owner.avatar = avatar.url;
    await owner.save();

    return res.status(200).json(new ApiResponse(200, owner, "Avatar updated successfully"));
});


// Delete an owner
const deleteOwner = asyncHandler(async (req, res) => {
    const { ownerId } = req.params;

    const owner = await Owner.findOne({ _id: ownerId, agency: req.agency._id });
    if (!owner) {
        throw new ApiError(404, "Owner not found or unauthorized to delete");
    }

    if (owner.avatar) {
        const publicId = owner.avatar.split("/").pop().split(".")[0];
        await deleteFromCloudinary(publicId);
    }

    await Owner.deleteOne({ _id: ownerId });

    return res.status(200).json(new ApiResponse(200, null, "Owner deleted successfully"));
});

export {
    ensureAgency,
    createOwner,
    getAllOwnersWithAgencyDetails,
    getOwnerById,
    updateOwner,
    updateAvatar,
    deleteOwner,
};
