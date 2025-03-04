import express from 'express';
import * as authController from '../controllers/authController';

const router = express.Router();

router.post('/api/auth/register', authController.register);

export default router;
