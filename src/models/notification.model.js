import mongoose, { Schema } from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'recipient.userType',
                required: true,
            },
        },
        sender: {
            userType: {
                type: String,
                enum: ['Traveler', 'Agency'],
                required: true,
            },
            userId: {
                type: Schema.Types.ObjectId,
                refPath: 'sender.userType',
                required: true,
            },
        },
        type: {
            type: String,
            enum: ['LIKE', 'COMMENT', 'FOLLOW', 'TWEET', 'BOOKING', 'NEW_PACKAGE', 'BOOKING_REQUEST', 'BOOKING_REJECTED', 'BOOKING_CONFIRMED', 'BOOKING_CANCELLED'],
            required: true,
        },
        relatedEntity: {
            type: Schema.Types.ObjectId,
            refPath: 'relatedEntityType',
            required: true
        },
        relatedEntityType: {
            type: String,
            enum: ['post', 'comment', 'tweet', 'package', 'follow', 'booking', 'request'],
            required: true
        },
        message: {
            type: String,
            required: true, 
        },
        isRead: {
            type: Boolean,
            default: false, 
        },
    },
    {
        timestamps: true, 
        versionKey: false, // Optionally disable the versioning field (_v)
    }
);

export const Notification = mongoose.model('Notification', notificationSchema);
