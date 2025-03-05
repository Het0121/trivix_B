import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const travelerSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        email: {
            type: String,
            unique: true,
        },
        phoneNo: {
            type: String,
            unique: true,
            required: true
        },
        dob: {
            type: Date,
        },
        gender: {
            type: String,
            enum: ['Male', 'Female', 'Other']
        },
        password: {
            type: String,
            minlength: 6,
            required: [true, 'Password is required']
        },
        city: {
            type: String,
        },
        state: {
            type: String,
        },
        avatar: {
            type: String, // cloudinary url
            default: "profile.jpg",
        },
        coverImage: {
            type: String, // cloudinary url
            default: "profile.jpg",
        },
        bio: {
            type: String,
            maxlength: 300,
            default: ""
        },
        website: {
            type: String,
            default: "",
        },
        notifications: {
            type: Boolean,
            default: true
        },
        private: {
            type: Boolean,
            default: false
        },
        savedPosts: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Post'
            }
        ],
        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true,
    }
);


// Pre-save hook to hash the password before saving
travelerSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
});


// Method to check if password is correct
travelerSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};


// Method to generate access token
travelerSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            phoneNo: this.phoneNo,
            userName: this.userName,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};


// Method to generate refresh token
travelerSchema.methods.generateRefreshToken = function () {
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

// Export the Traveler model
export const Traveler = mongoose.model("Traveler", travelerSchema);