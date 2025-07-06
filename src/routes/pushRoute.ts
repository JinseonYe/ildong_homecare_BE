import express from 'express';
import * as pushController from '../controllers/pushController';

const router = express.Router();

router.post('/api/push/send', pushController.sendNotification);

export default router;
