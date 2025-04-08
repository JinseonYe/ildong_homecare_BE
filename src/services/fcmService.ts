import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fcmModel from '../models/fcmModel';
import * as formatting from '../utils/formatting';
import { getMessaging } from 'firebase-admin/messaging';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  '..',
  'config',
  'firebase-key.json',
);

// FCM 커넥트
const connect = () => {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
      });
      console.log('FCM Initialized Successfully');
    } else {
      console.log('FCM Already Initialized');
    }
  } catch (error) {
    console.error('FCM Initialization Error:', error);
  }
};

export default connect;

// FCM 토큰 저장
// TODO: userId 대신 refreshtoken 받아서 유저 토큰이랑 비교할지 보고 수정완료하기
export const saveFCMToken = async (userId: any, fcmToken: any) => {
  try {
    // 유효성 검사
    if (!userId || !fcmToken) {
      return false;
    }

    let existTokens = await fcmModel.findFCMTokenByUserId(userId);
    existTokens = formatting.toCamelCase(existTokens);

    const isTokenExist = existTokens.some(
      (item: any) => item.fcmToken === fcmToken,
    );

    if (isTokenExist) {
      return true;
    }

    // 새로운 토큰이면 저장
    const result = await fcmModel.saveFCMToken(userId, fcmToken);

    return result;
  } catch (error) {
    throw error;
  }
};

const MAX_FCM_LIMIT = 500;

const chunkArray = (array: string[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// 실제 FCM 전송 담당
export const sendFCMNotification = async (
  tokens: string[],
  title: string,
  body: string,
) => {
  let successCount = 0;
  let failureCount = 0;

  const tokenChunks = chunkArray(tokens, MAX_FCM_LIMIT);

  for (const chunk of tokenChunks) {
    const message = {
      notification: { title, body },
      tokens: chunk,
      android: { notification: { title, body } },
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

    const response = await getMessaging().sendEachForMulticast(message);
    successCount += response.successCount;
    failureCount += response.failureCount;
  }

  return { successCount, failureCount };
};

// 서비스 레이어 (비즈니스 로직)
export const sendNotificationService = async (
  userId: number,
  title: string,
  body: string,
) => {
  const fcmTokenArr = await fcmModel.findFCMTokenByUserId(userId);
  if (!fcmTokenArr.length) {
    throw new Error('User or FCM token not found');
  }

  const fcmTokenList = formatting
    .toCamelCase(fcmTokenArr)
    .map((tokenObj) => tokenObj.fcmToken);

  const { successCount, failureCount } = await sendFCMNotification(
    fcmTokenList,
    title,
    body,
  );

  if (successCount === 0) {
    throw new Error('FCM push notification failed');
  }

  await fcmModel.insertNotificationLog({
    userId,
    title,
    body,
    tokens: JSON.stringify(fcmTokenList),
    successCount,
    failureCount,
  });

  return { successCount, failureCount };
};
