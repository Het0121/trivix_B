import mongoose, { isValidObjectId } from "mongoose";
import { Booking } from "../models/booking.model.js";
import { Package } from "../models/package.model.js";
import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create a Booking
const createBooking = asyncHandler(async (req, res) => {
    const { travelerId, packageId, slotsBooked } = req.body;

    if (!isValidObjectId(travelerId) || !isValidObjectId(packageId)) {
        throw new ApiError(400, "Invalid traveler or package ID.");
    }

    const packageDoc = await Package.findById(packageId);
    if (!packageDoc) {
        throw new ApiError(404, "Package not found.");
    }

    if (packageDoc.availableSlots < slotsBooked) {
        throw new ApiError(400, "Not enough available slots.");
    }

    const newBooking = new Booking({
        traveler: travelerId,
        package: packageId,
        slotsBooked,
        status: "Pending",
    });
    await newBooking.save();

    await Notification.create({
        recipient: { userType: "Agency", userId: packageDoc.agency },
        sender: { userType: "Traveler", userId: travelerId },
        type: "BOOKING_REQUEST",
        relatedEntity: newBooking._id,
        relatedEntityType: "booking",
        message: `Traveler requested ${slotsBooked} slot(s) for package: ${packageDoc.title}.`,
    });

    res.status(201).json(new ApiResponse(201, newBooking, "Booking request sent successfully."));
});


// Handle Booking Request (Accept/Reject)
const handleBookingRequest = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;
    const { action } = req.body; // Accept or Reject

    if (!isValidObjectId(bookingId)) {
        throw new ApiError(400, "Invalid booking ID.");
    }

    const booking = await Booking.findById(bookingId).populate("package");
    if (!booking) {
        throw new ApiError(404, "Booking not found.");
    }

    const packageDoc = booking.package;
    if (!packageDoc.agency.equals(req.agency._id)) {
        throw new ApiError(403, "You are not authorized to handle this booking.");
    }

    if (action === "accept") {
        if (packageDoc.availableSlots < booking.slotsBooked) {
            throw new ApiError(400, "Not enough available slots.");
        }

        // Deduct available slots on acceptance
        packageDoc.availableSlots -= booking.slotsBooked;
        booking.status = "Confirmed";
        await packageDoc.save();
    } else if (action === "reject") {
        // If booking was previously confirmed, restore the available slots
        if (booking.status === "Confirmed") {
            packageDoc.availableSlots += booking.slotsBooked;
            await packageDoc.save();
        }

        booking.status = "Cancelled";
    } else {
        throw new ApiError(400, "Invalid action. Use 'accept' or 'reject'.");
    }

    await booking.save();

    // Notify traveler
    await Notification.create({
        recipient: { userType: "Traveler", userId: booking.traveler },
        sender: { userType: "Agency", userId: req.agency._id },
        type: action === "accept" ? "BOOKING_CONFIRMED" : "BOOKING_REJECTED",
        relatedEntity: booking._id,
        relatedEntityType: "booking",
        message: `Your booking for package: ${packageDoc.title} has been ${action}ed.`,
    });

    res.status(200).json(new ApiResponse(200, booking, `Booking ${action}ed successfully.`));
});


// Get Traveler's Booking
const getBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
        throw new ApiError(400, "Invalid booking ID.");
    }

    const booking = await Booking.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(bookingId) } }, // Use `new` keyword here
        {
            $lookup: {
                from: "travelers",
                localField: "traveler",
                foreignField: "_id",
                as: "traveler",
            },
        },
        {
            $lookup: {
                from: "packages",
                localField: "package",
                foreignField: "_id",
                as: "package",
            },
        },
        {
            $project: {
                _id: 1,
                slotsBooked: 1,
                status: 1,
                traveler: { $arrayElemAt: ["$traveler", 0] },
                package: { $arrayElemAt: ["$package", 0] },
            },
        },
    ]);

    if (!booking.length) {
        throw new ApiError(404, "Booking not found.");
    }

    res.status(200).json(new ApiResponse(200, booking[0], "Booking retrieved successfully."));
});



// Remove Traveler's Booking
const deleteBooking = asyncHandler(async (req, res) => {
    const { bookingId } = req.params;

    if (!isValidObjectId(bookingId)) {
        throw new ApiError(400, "Invalid booking ID.");
    }

    const booking = await Booking.findById(bookingId).populate("package");
    if (!booking) {
        throw new ApiError(404, "Booking not found.");
    }

    if (!booking.package.agency.equals(req.agency._id)) {
        throw new ApiError(403, "You are not authorized to delete this booking.");
    }

    if (booking.status === "Confirmed") {
        booking.package.availableSlots += booking.slotsBooked;
        await booking.package.save();
    }

    await booking.remove();

    // Notify traveler
    await Notification.create({
        recipient: { userType: "Traveler", userId: booking.traveler },
        sender: { userType: "Agency", userId: req.agency._id },
        type: "BOOKING_CANCELLED",
        relatedEntity: booking._id,
        relatedEntityType: "booking",
        message: `Your booking for package: ${booking.package.title} has been cancelled.`,
    });

    res.status(200).json(new ApiResponse(200, null, "Booking deleted successfully."));
});


export {
    createBooking,
    handleBookingRequest,
    getBooking,
    deleteBooking
};
