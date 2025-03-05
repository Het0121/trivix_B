import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create a new notification
const createNotification = asyncHandler(async (req, res) => {
    const { recipient, sender, type, relatedEntity, relatedEntityType, message } = req.body;


    const notification = await Notification.create({
        recipient,
        sender,
        type,
        relatedEntity,
        relatedEntityType,
        message,
    });

    res.status(201).json(new ApiResponse(201, notification, 'Notification created successfully.'));
});


// Get notifications for the authenticated user
const getNotifications = asyncHandler(async (req, res) => {
    const { isRead } = req.query;

    const filter = {
        'recipient.userType': req.userType,
        'recipient.userId': req.user._id,
        ...(isRead !== undefined && { isRead }),
    };

    const notifications = await Notification.find(filter).sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, notifications, 'Notifications retrieved successfully.'));
});


// Mark a notification as read
const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
        {
            _id: notificationId,
            'recipient.userType': req.userType,
            'recipient.userId': req.user._id,
        },
        { isRead: true },
        { new: true }
    );

    if (!notification) {
        throw new ApiError(404, 'Notification not found or unauthorized.');
    }

    res.status(200).json(new ApiResponse(200, notification, 'Notification marked as read.'));
});


// Delete a notification
const deleteNotification = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndDelete({
        _id: notificationId,
        'recipient.userType': req.userType,
        'recipient.userId': req.user._id,
    });

    if (!notification) {
        throw new ApiError(404, 'Notification not found or unauthorized.');
    }

    res.status(200).json(new ApiResponse(200, null, 'Notification deleted successfully.'));
});

export {
    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification,
};
