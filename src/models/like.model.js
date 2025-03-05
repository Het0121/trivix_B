import mongoose, { Schema } from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        post: {
            type: Schema.Types.ObjectId,
            ref: "Post",
        },
        comment: {
            type: Schema.Types.ObjectId,
            ref: "Comment",
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: "Tweet",
        },
        likedBy: {
            userType: {
                type: String,
                enum: ["Traveler", "Agency"],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: "likedBy.userType",
                required: true,
            },
        },
    },
    {
        timestamps: true
    }
);

export const Like = mongoose.model("Like", likeSchema);