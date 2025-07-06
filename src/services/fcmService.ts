import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fcmModel from '../models/fcmModel';
import * as deviceModel from '../models/deviceModel';
import * as formatting from '../utils/formatting';
import { getMessaging } from 'firebase-admin/messaging';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  '..',
  'config',
  'firebase-key.json',
);

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// FCM 커넥트
const connect = () => {
  try {
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
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

const MAX_FCM_LIMIT = 500;

const chunkArray = (array: string[], size: number) => {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
};

// FCM 토큰 유효성 검증
export const validateFCMToken = async (token: string) => {
  try {
    await getMessaging().send({
      token,
      notification: {
        title: 'Token Validation',
        body: 'This is a validation message',
      },
    });
    return true;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// 실제 FCM 전송 담당
export const sendFCMNotification = async (
  tokens: string[],
  title: string,
  body: string,
) => {
  let successCount = 0;
  let failureCount = 0;
  let validTokens: string[] = [];

  // 토큰 유효성 검증
  for (const token of tokens) {
    const isValid = await validateFCMToken(token);
    if (isValid) {
      validTokens.push(token);
    } else {
      console.log(`Invalid token: ${token}`);
      // 유효하지 않은 토큰은 DB에서 삭제하는 로직을 추가할 수 있습니다
      // await fcmModel.deleteInvalidToken(token);
    }
  }

  if (validTokens.length === 0) {
    throw new Error('No valid FCM tokens found');
  }

  const tokenChunks = chunkArray(validTokens, MAX_FCM_LIMIT);

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

// push 알림 보내기
export const sendNotificationService = async (
  userId: number,
  title: string,
  body: string,
) => {
  const pushTokenArr = await deviceModel.findPushTokenInfoByUserId(userId);

  if (!pushTokenArr.length) {
    throw new Error('User or push token not found');
  }

  const pushTokenList = formatting
    .toCamelCase(pushTokenArr)
    .map((tokenObj: any) => tokenObj.pushToken);

  const { successCount, failureCount } = await sendFCMNotification(
    pushTokenList,
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
    tokens: JSON.stringify(pushTokenList),
    successCount,
    failureCount,
  });

  return { successCount, failureCount };
};
