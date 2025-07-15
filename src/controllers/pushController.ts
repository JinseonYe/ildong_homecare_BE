import { Request, Response } from 'express';
import * as pushService from '../services/pushService';

// 푸시 알림 보내기
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { userId, title, body } = req.body;
    // userId가 단일 값이 아니라 배열일 수도 있으니 배열로 감싸서 넘김
    const targetUserIds = Array.isArray(userId) ? userId : [userId];
    const pushType = 'notification';
    const result = await pushService.sendPushProcess(
      targetUserIds,
      title,
      body,
      pushType,
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

// 알림 조회하기
export const getPushList = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const result = await pushService.getPushList(userId);
    res.status(200).json({
      success: true,
      message: 'push 알림 리스트를 성공적으로 조회했습니다.',
      data: result,
    });
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Something went wrong!',
    });
  }
};

// 알림 내역 읽음처리
export const updatePushReadStatus = async (req: Request, res: Response) => {
  try {
    const { notificationLogId } = req.body;
    const result = await pushService.updatePushReadStatus(notificationLogId);
    res.status(200).json({
      success: true,
      message: 'push 알림을 성공적으로 읽음처리했습니다.',
    });
  } catch (err: any) {
    console.error(err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Something went wrong!',
    });
  }
};
