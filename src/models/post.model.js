import mongoose, { Schema } from 'mongoose';

const postSchema = new mongoose.Schema(
    {
        owner: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'owner.userType',
                required: true,
            },
        },
        image: {
            type: String,
        },
        video: {
            type: String,
        },
        thumbnail: {
            type: String,
        },
        caption: {
            type: String,
            default: '',
        },
        views: {
            type: Number,
            default: 0,
        },
        location: {
            type: String,
            trim: true,
        },
        isPublished: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true
    }
);

// Exporting the Post model
export const Post = mongoose.model('Post', postSchema);

