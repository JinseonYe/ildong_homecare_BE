import express from 'express';
import * as pushController from '../controllers/pushController';

const router = express.Router();

router.post('/api/push/send', pushController.sendNotification);
router.get('/api/push', pushController.getPushList); // 알림 내역 조회

export default router;
