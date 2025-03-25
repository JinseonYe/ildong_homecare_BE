import express from 'express';
import * as userController from '../controllers/userController';

const router = express.Router();

router.patch('/api/user/profile/:userId', userController.updateUserProfile);

export default router;
