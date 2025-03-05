import { Router } from "express";
import { 
    createBooking, 
    handleBookingRequest, 
    getBooking, 
    deleteBooking 
} from "../controllers/booking.controller.js";
import { verifyAgencyJWT } from "../middlewares/agencyAuth.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { verifyUser } from "../middlewares/verifyUser.middleware.js";


const router = Router();

// Create a new booking
router.route("/book").post( verifyJWT, createBooking);

// Handle booking request (accept/reject)
router.route("/:bookingId/action").patch(verifyAgencyJWT, handleBookingRequest);

// Get a specific booking by ID
router.route("/booked/:bookingId").get(verifyUser, getBooking);

// Delete a booking
router.route("/delete/:bookingId").delete(verifyAgencyJWT, deleteBooking);

export default router;
