import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const agencySchema = new mongoose.Schema(
    {
        agencyName: {
            type: String,
            required: [true, "Agency name is required"]
        },
        ownerName: {
            type: Schema.Types.ObjectId,
            ref: "Owner",
        },
        userName: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ // Simple email validation
        },
        agencyPhoneNo: {
            type: String,
            required: true,
            match: /^[0-9]{10}$/ // for a 10-digit phone number
        },
        password: {
            type: String,
            minlength: 6,
            required: [true, "Password is required"],
        },
        avatar: {
            type: String,
            default: "defaultImg.jpg"
        },
        coverImage: {
            type: String,
            default: "defaultImg.jpg"
        },
        city: {
            type: String,
            default: "",
        },
        state: {
            type: String,
            default: "",
        },
        bio: {
            type: String,
            maxLength: 300,
            default: "",
        },
        website: {
            type: String,
            default: "",
        },
        address: {
            type: String,
            default: "",
        },
        lastLogin: {
            type: Date,
            default: "",
        },
        refreshToken: {
            type: String
        },
    },
    {
        timestamps: true
    }
);


// Pre-save hook to hash the password before saving
agencySchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});


// Method to check if password is correct
agencySchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};


// Method to generate access token
agencySchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            agencyPhoneNo: this.agencyPhoneNo,
            userName: this.userName,
            agencyName: this.agencyName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};


// Method to generate refresh token
agencySchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};


export const Agency = mongoose.model("Agency", agencySchema);