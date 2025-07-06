import { Request, Response } from 'express';
import * as pushService from '../services/pushService';

// 푸시 알림 보내기
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;

    const result = await pushService.sendNotificationService(
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
