import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { Agency } from "../models/agency.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

// Generate Access And Refresh Token
const generateAccessAndRefreshTokens = async (agencyId) => {
  try {
    const agency = await Agency.findById(agencyId)
    const accessToken = agency.generateAccessToken()
    const refreshToken = agency.generateRefreshToken()

    agency.refreshToken = refreshToken
    await agency.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }


  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating refresh and access token")
  }
}


// Register Agency
const registerAgency = asyncHandler(async (req, res) => {

  const { agencyName, userName, email, agencyPhoneNo, password } = req.body

  if (
    [agencyName, userName, email, agencyPhoneNo, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required")
  }

  const existedAgency = await Agency.findOne({
    $or: [{ userName }, { agencyPhoneNo }, { email }]
  })

  if (existedAgency) {
    throw new ApiError(409, "Agency with Phone No or username or Email already exists")
  }


  const agency = await Agency.create({
    agencyName,
    userName: userName.toLowerCase(),
    email : email.toLowerCase(),
    agencyPhoneNo,
    password
  })

  const createdAgency = await Agency.findById(agency._id).select(
    "-password -refreshToken"
  )

  if (!createdAgency) {
    throw new ApiError(500, "Something went wrong while registering the Agency")
  }

  return res.status(201).json(
    new ApiResponse(200, createdAgency, "Agency registered Successfully")
  )

})


// Login Agency
const loginAgency = asyncHandler(async (req, res) => {

  const { userName, phoneNo, password } = req.body


  if (!userName && !phoneNo) {
    throw new ApiError(400, "username or phone No is required")
  }


  const agency = await Agency.findOne({
    $or: [{ userName }, { phoneNo }]
  })

  if (!agency) {
    throw new ApiError(404, "Agency does not exist")
  }

  const isPasswordValid = await agency.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid Agency Password")
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(agency._id)

  const loggedInAgency = await Agency.findById(agency._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          agency : loggedInAgency, accessToken, refreshToken
        },
        "Agency logged In Successfully"
      )
    )
})


// Logout Agency
const logoutAgency = asyncHandler(async (req, res) => {
  await Agency.findByIdAndUpdate(
    req.agency._id,
    {
      $unset: {
        refreshToken: 1 // this removes the field from document
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Agency logged Out"))
})


// Refresh Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request")
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const agency = await Agency.findById(decodedToken?._id)

    if (!agency) {
      throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== agency?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used")

    }

    const options = {
      httpOnly: true,
      secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(agency._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      )
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }

})


// Change Agency Password
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmNewPassword } = req.body;

  // Validate request fields
  if (!oldPassword || !newPassword?.trim() || !confirmNewPassword?.trim()) {
    throw new ApiError(400, "Old password, new password, and confirmation are required and cannot be empty");
  }

  // Validate new password and confirmation match
  if (newPassword !== confirmNewPassword) {
    throw new ApiError(400, "New password and confirmation password do not match");
  }

  // Fetch the agency (single DB call)
  const agency = await Agency.findById(req.agency?._id);
  if (!agency) {
    throw new ApiError(404, "Agency not found");
  }

  // Validate old password and prevent password reuse in one block
  const isOldPasswordCorrect = await agency.isPasswordCorrect(oldPassword);
  if (!isOldPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  const isNewPasswordSameAsOld = await agency.isPasswordCorrect(newPassword);
  if (isNewPasswordSameAsOld) {
    throw new ApiError(400, "New password must be different from the old password");
  }

  // Update and save the new password
  agency.password = newPassword;
  await agency.save({ validateBeforeSave: false });

  res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});


// Get Agency Profile
const curruntAgencyProfile = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      req.agency,
      "Agency fetched successfully"
    ))
})


// Update Agency Profile Details
const updateProfileDetails = asyncHandler(async (req, res) => {
  const { agencyName, userName, email, agencyPhoneNo, city, state, bio, website, address } = req.body;

  // Collect only fields that are provided and have changes
  const updateData = {};

  if (agencyName) updateData.agencyName = agencyName;
  if (userName) updateData.userName = userName;
  if (agencyPhoneNo) updateData.agencyPhoneNo = agencyPhoneNo;
  if (email) {
    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiError(400, "Invalid email format");
    }
    updateData.email = email;
  }
  if (bio) updateData.bio = bio;
  if (city) updateData.city = city;
  if (state) updateData.state = state;
  if (website) updateData.website = website;
  if (address) updateData.address = address;

  // Check if there are any fields to update
  if (Object.keys(updateData).length === 0) {
    return res
      .status(400)
      .json(new ApiResponse(400, {}, "No updates provided"));
  }

  // Check for duplicate phoneNo or email among other agency
  if (updateData.agencyPhoneNo || updateData.email) {
    const existingAgency = await Agency.findOne({
      $or: [
        { agencyPhoneNo : updateData.agencyPhoneNo },
        { email : updateData.email },
      ],
      _id: { $ne: req.agency._id }, // Exclude the current agency
    });

    if (existingAgency) {
      throw new ApiError(
        409,
        "Phone number or email already in use by another agency"
      );
    }
  }

  // Update agency details
  const agency = await Agency.findByIdAndUpdate(
    req.agency?._id,
    {
      $set: updateData
    },
    { new: true, runValidators: true } // schema validation
  ).select("-password -refreshToken");

  if (!agency) {
    throw new ApiError(404, "agency not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, agency, "Profile updated successfully"));
});


// Upload & Update Avatar
const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // Fetch agency data
  const agency = await Agency.findById(req.agency?._id);

  // Check if Agency has an existing avatar
  if (agency?.avatar) {
    // Delete the old avatar from Cloudinary
    const publicId = agency.avatar.split("/").pop().split(".")[0]; // Extract public ID from URL
    await deleteFromCloudinary(publicId); // Delete the old avatar
  }

  // Upload the new avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar?.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // Update the agency avatar URL in the database
  const updatedAgency = await Agency.findByIdAndUpdate(
    req.agency?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedAgency, "Avatar updated successfully"));
});


// Delete Avatar
const deleteAvatar = asyncHandler(async (req, res) => {
  // Fetch the Agency data
  const agency = await Agency.findById(req.agency?._id);

  if (!agency || !agency.avatar) {
    throw new ApiError(404, "No cover image to delete");
  }

  try {
    // Extract Cloudinary public ID from the URL (improved extraction)
    const avatarUrl = agency.avatar;
    const parts = avatarUrl.split('/');

    if (parts.length < 8) {
      throw new ApiError(400, "Invalid avatar URL format");
    }

    const publicId = parts[7].split('.')[0]; // Extract the public ID (this works for Cloudinary URLs)

    // Delete the avatar from Cloudinary
    const result = await deleteFromCloudinary(publicId);

    // Check if deletion was successful
    if (!result || result.result !== 'ok') {
      throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
    }

    // Set the avatar field to an empty string
    agency.avatar = "defaultImg.jpg";
    await agency.save();

    return res
      .status(200)
      .json(new ApiResponse(200, agency, "Avatar deleted successfully"));
  } catch (error) {
    console.error("Error deleting avatar:", error);  // Log the error for debugging
    throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
  }
});


// Update Cover Image
const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }

  // Fetch agency data
  const agency = await Agency.findById(req.agency?._id);

  // Check if agency has an existing cover image
  if (agency?.coverImage) {
    // Delete the old cover image from Cloudinary
    const publicId = agency.coverImage.split("/").pop().split(".")[0]; // Extract public ID from URL
    await deleteFromCloudinary(publicId); // Delete the old cover image
  }

  // Upload the new cover image
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage?.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }

  // Update the Agency cover image URL in the database
  const updatedAgency = await Agency.findByIdAndUpdate(
    req.agency?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, updatedAgency, "Cover image updated successfully"));
});


// Delete Cover Image
const deleteCoverImage = asyncHandler(async (req, res) => {
  // Fetch the agency data
  const agency = await Agency.findById(req.agency?._id);

  if (!agency || !agency.coverImage) {
    throw new ApiError(404, "No cover image to delete");
  }

  try {
    // Extract Cloudinary public ID from the URL (improved extraction)
    const coverImageUrl = agency.coverImage;
    const parts = coverImageUrl.split('/');

    if (parts.length < 8) {
      throw new ApiError(400, "Invalid avatar URL format");
    }

    const publicId = parts[7].split('.')[0]; // Extract the public ID (this works for Cloudinary URLs)

    // Delete the avatar from Cloudinary
    const result = await deleteFromCloudinary(publicId);

    // Check if deletion was successful
    if (!result || result.result !== 'ok') {
      throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
    }

    // Set the avatar field to an empty string
    agency.coverImage = "defaultImg.jpg";
    await agency.save();

    return res
      .status(200)
      .json(new ApiResponse(200, agency, "Avatar deleted successfully"));
  } catch (error) {
    console.error("Error deleting avatar:", error);  // Log the error for debugging
    throw new ApiError(400, "Error while deleting Avatar from Cloudinary");
  }
});


export {

    registerAgency,
    loginAgency,
    logoutAgency,
    refreshAccessToken,
    changePassword,
    curruntAgencyProfile,
    updateProfileDetails,
    updateAvatar,
    deleteAvatar,
    updateCoverImage,
    deleteCoverImage,

  }
