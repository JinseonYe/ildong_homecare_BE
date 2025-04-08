import { Request, Response } from 'express';
import { getMessaging } from 'firebase-admin/messaging';
import * as fcmService from '../services/fcmService';
import * as fcmModel from '../models/fcmModel';
import * as formatting from '../utils/formatting';

// 푸시 알림 보내기
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;

    const result = await fcmService.sendNotificationService(
      userId,
      title,
      body,
    );

    res.status(200).json({
      success: true,
      message: 'Successfully sent notification!',
      data: {
        successCount: result.successCount,
        failureCount: result.failureCount,
      },
    });
  } catch (err: any) {
    console.error('FCM send error:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Something went wrong!',
    });
  }
};

// FCM 토큰 저장
export const saveFCMToken = async (req: Request, res: Response) => {
  const { userId, fcmToken } = req.body;

  try {
    const result = await fcmService.saveFCMToken(userId, fcmToken);
    // 유효성 검사
    if (!result) {
      return res
        .status(400)
        .json({ error: 'userId and fcmToken are required' });
    }

    // FCM 토큰을 저장한 후 성공 응답
    res
      .status(200)
      .json({ success: true, message: 'FCM token saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to save FCM token' });
  }
};
