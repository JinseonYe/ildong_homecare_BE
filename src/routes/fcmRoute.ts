import express from 'express';
import * as fcmController from '../controllers/fcmController';

const router = express.Router();

router.post('/api/fcm/send-push-notification', fcmController.sendNotification);
router.post('/api/fcm/save-fcm-token', fcmController.saveFCMToken);

export default router;
