import mongoose, { Schema } from 'mongoose';

const commentSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            maxLength: 400,
            required: true,
        },
        post: {
            type: Schema.Types.ObjectId,
            ref: 'Post',
        },
        tweet: {
            type: Schema.Types.ObjectId,
            ref: 'Tweet',
        },
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
    },
    { 
        timestamps: true 
    }
);


export const Comment = mongoose.model('Comment', commentSchema);
