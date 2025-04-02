import express from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();

router.post('/api/auth/register', authController.register);
router.get('/api/auth/check-email', authController.verifyEmailDuplication);
router.post('/api/auth/login', authController.login);

export default router;
