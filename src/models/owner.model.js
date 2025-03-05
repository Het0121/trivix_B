import mongoose, { Schema } from "mongoose";

const ownerSchema = new mongoose.Schema(
  {
    ownerNames: { // Multiple names, max 3 names
      type: [String],
      required: true,
      validate: [arrayLimit, "You can only have up to 3 names"],
    },
    agency: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNo: { // Multiple phone numbers, max 3 numbers
      type: [String],
      required: true,
      validate: [arrayLimit, "You can only have up to 3 phone numbers"],
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "",
    },
    dob: {
      type: Date,
    },
    avatar: {
      type: String,
      required: false, // Avatar is optional 
    },
  },
  {
    timestamps: true
  }
);

// Custom validator for limiting array length to 3
function arrayLimit(val) {
  return val.length <= 3;
}

export const Owner = mongoose.model("Owner", ownerSchema);
