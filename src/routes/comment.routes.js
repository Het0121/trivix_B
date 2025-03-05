import { Router } from 'express';
import {

     getPostComments,
     addComment,
     updateComment,
     deleteComment

} from '../controllers/coment.controller.js';
import { verifyUser } from "../middlewares/verifyUser.middleware.js"

const router = Router();


// Get comments for a specific post
router.route('/:postId').get(verifyUser, getPostComments);

// Add a comment to a post
router.route('/:postId').post(verifyUser, addComment);

// Update a comment
router.route('/:commentId').patch(verifyUser, updateComment);

// Delete a comment
router.route('/:commentId').delete(verifyUser, deleteComment);

export default router;
