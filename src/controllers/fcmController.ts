import { Request, Response } from 'express';
import admin from 'firebase-admin';
import * as fcmService from '../services/fcmService';
import * as fcmModel from '../models/fcmModel';

// 푸시 알림 보내기
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { title, body, userId } = req.body;

    const fcmToken = await fcmModel.findFCMTokenByUserId(userId);

    if (!fcmToken) {
      return res.status(404).json({ error: 'User or FCM token not found' }); // 토큰 누락 시 에러 반환
    }

    const message = {
      fcmToken,
      notification: {
        title,
        body,
      },
      android: {
        notification: {
          title,
          body,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    await admin.messaging().send(message);

    res.status(200).json({ message: 'Successfully sent notifications!' });
  } catch (err: any) {
    console.error('FCM send error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Something went wrong!' });
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
    res.status(200).json({ message: 'FCM token saved successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save FCM token' });
  }
};
