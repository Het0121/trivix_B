import mongoose, { Schema } from "mongoose";

const packageSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        agency: {
            type: Schema.Types.ObjectId,
            ref: "Agency",
            required: true
        },
        mainLocation: {
            type: String,
            required: true,
        },
        fromLocation: {
            type: String,
            required: true,
        },
        toLocation: {
            type: String,
            required: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        description: {
            type: String,
            required: true,
            trim: true,
        },
        servicesAndFacilities: {
            type: [String],
            default: [],
        },
        activities: {
            type: [String],
            default: [],
        },
        itinerary: [
            {
                day: {
                    type: String,
                    required: true,
                },
                description: {
                    type: String,
                    required: true,
                },
            },
        ],
        photos: {
            type: [String],
            validate: {
                validator: (val) => val.length <= 4,
                message: "{PATH} exceeds the limit of 4",
            },
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        maxSlots: {
            type: Number,
            required: true,
        },
        availableSlots: {
            type: Number,
            required: true,
            validate: {
                validator: function (value) {
                    return value >= 0 && value <= this.maxSlots;
                },
                message: "Available slots must be between 0 and max slots.",
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Middleware to ensure `startDate` is before `endDate`
packageSchema.pre("validate", function (next) {
    if (this.startDate >= this.endDate) {
        return next(new Error("End date must be after start date."));
    }
    next();
});

// Middleware to set `availableSlots` to `maxSlots` if not provided
packageSchema.pre("save", function (next) {
    if (this.isNew && !this.availableSlots) {
        this.availableSlots = this.maxSlots;
    }
    next();
});

// Middleware to ensure `availableSlots` does not exceed `maxSlots`
packageSchema.pre("save", function (next) {
    if (this.availableSlots > this.maxSlots) {
        return next(new Error("Available slots cannot exceed maximum slots."));
    }
    next();
});

// Virtual property to check if booking slots are active
packageSchema.virtual("isBookingActive").get(function () {
    const currentDate = new Date();
    return this.availableSlots > 0 && this.startDate <= currentDate && this.endDate >= currentDate;
});

export const Package = mongoose.model("Package", packageSchema);
