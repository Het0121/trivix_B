import mongoose, { Schema } from 'mongoose';

const tweetSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            maxLength: 400,
            required: true,
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


export const Tweet = mongoose.model('Tweet', tweetSchema);
