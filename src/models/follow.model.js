import mongoose, { Schema } from "mongoose";

const followerFollowingSchema = new Schema(
    {
        follower: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'follower.userType'
            }
        },
        following: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'following.userType'
            }
        }
    },
    {
        timestamps: true
    }
);

export const FollowerFollowing = mongoose.model("FollowerFollowing", followerFollowingSchema);
