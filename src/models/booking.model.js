import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema(
    {
        traveler: {
            type: Schema.Types.ObjectId,
            ref: "Traveler",
            required: true,
        },
        package: {
            type: Schema.Types.ObjectId,
            ref: "Package",
            required: true,
        },
        slotsBooked: {
            type: Number,
            required: true,
            min: 1,
        },
        bookingDate: {
            type: Date,
            default: Date.now,
        },
        status: {
            type: String,
            enum: ["Pending", "Confirmed", "Cancelled"],
            default: "Pending",
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true
    }
);


export const Booking = mongoose.model("Booking", bookingSchema);
