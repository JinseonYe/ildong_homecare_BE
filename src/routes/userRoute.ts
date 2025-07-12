import express from 'express';
import * as userController from '../controllers/userController';
import * as uploadMiddleware from '../middlewares/uploadMiddleware';

const router = express.Router();

router.get('/api/users', userController.getUsers);
router.get('/api/user', userController.getUserById);
router.patch(
  '/api/user/profile/:userId',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  userController.updateUserProfile,
);

export default router;
