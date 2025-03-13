import { Request, Response } from 'express';
import admin from 'firebase-admin';

export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { title, body, token } = req.body;
    console.log(title);

    if (!token) {
      return res.status(400).json({ message: 'FCM token is required' }); // ✅ 토큰 누락 시 에러 반환
    }

    await admin.messaging().send({
      token,
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
    });

    res.status(200).json({ message: 'Successfully sent notifications!' });
  } catch (err: any) {
    console.error('FCM send error:', err);
    res
      .status(err.status || 500)
      .json({ message: err.message || 'Something went wrong!' });
  }
};
