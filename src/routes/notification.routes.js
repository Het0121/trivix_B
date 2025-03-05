import { Router } from 'express';
import {

    createNotification,
    getNotifications,
    markAsRead,
    deleteNotification,

} from '../controllers/notification.controller.js';
import { verifyUser } from "../middlewares/verifyUser.middleware.js";


const router = Router();


// Create a new notification
router.post('/notification', verifyUser, createNotification);

// Get notifications for the authenticated user
router.get('/getnotification', verifyUser, getNotifications);

// Mark a notification as read
router.patch('/:notificationId/markasread', verifyUser, markAsRead);

// Delete a notification
router.delete('/:notificationId/delete', verifyUser, deleteNotification);

export default router;
