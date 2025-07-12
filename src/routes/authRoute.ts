import express from 'express';
import * as authController from '../controllers/authController';
import * as uploadMiddleware from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post(
  '/api/auth/register',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  authController.register,
);
router.get('/api/auth/check-email', authController.verifyEmailDuplication);
router.post('/api/auth/login', authController.login);

export default router;
