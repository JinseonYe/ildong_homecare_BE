import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pushModel from '../models/pushModel';
import * as deviceModel from '../models/deviceModel';
import * as formatting from '../utils/formatting';
import { getMessaging } from 'firebase-admin/messaging';
import {
  NotFoundError,
  BadRequest,
  InternalServerError,
} from '../errors/httpError';

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
    throw new InternalServerError(`${error}`);
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

// push 토큰 유효성 검증
export const validatePushToken = async (token: string) => {
  // 최소한의 포맷 체크
  return typeof token === 'string' && token.length > 0;
};

// 타겟 user id 마다 push token 수집해서 반환
export const collectPushToken = async (targetUserIds: any) => {
  let allTokens: string[] = [];
  for (const userId of targetUserIds) {
    const tokens = await deviceModel.findPushTokenInfoByUserId(userId);
    if (tokens && tokens.length > 0) {
      allTokens.push(...tokens.map((t: any) => t.push_token || t.pushToken));
    }
  }
  // 중복 제거
  allTokens = [...new Set(allTokens)].filter(Boolean);
  return allTokens;
};

// 실제 FCM 전송 담당
export const sendFCMNotification = async (
  targetUserIds: any,
  tokens: string[],
  title: string,
  body: string,
  pushType: any,
) => {
  let successCount = 0;
  let failureCount = 0;
  let validTokens: string[] = [];

  // 토큰 유효성 검증
  for (const token of tokens) {
    const isValid = await validatePushToken(token);
    if (isValid) {
      validTokens.push(token);
    } else {
      console.log(`Invalid token: ${token}`);
      // 유효하지 않은 토큰은 DB에서 삭제하는 로직을 추가할 수 있습니다
      // await fcmModel.deleteInvalidToken(token);
    }
  }

  if (validTokens.length === 0) {
    throw new NotFoundError('No valid FCM tokens found');
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

    // 상세 로그 추가: 각 토큰별 성공/실패 및 에러 메시지
    response.responses.forEach((resp, idx) => {
      const token = chunk[idx];
      if (resp.success) {
        console.log(`[FCM SUCCESS] token: ${token}`);
      } else {
        console.error(
          `[FCM FAIL] token: ${token}, error:`,
          resp.error?.message || resp.error,
        );
        throw new Error(
          `[FCM FAIL] token: ${token}, error: ${
            resp.error?.message || resp.error
          }`,
        );
      }
    });
  }

  // 푸시 로그 저장 (userId별로)
  for (const userId of targetUserIds) {
    await pushModel.insertNotificationLog(
      userId,
      title,
      body,
      JSON.stringify(validTokens),
      successCount,
      failureCount,
      pushType,
    );
  }

  console.log('[FCM SUMMARY] successCount:', successCount);
  console.log('[FCM SUMMARY] failureCount:', failureCount);

  return { successCount, failureCount };
};

// push 알림 보내는 프로세스
export const sendPushProcess = async (
  targetUserIds: any,
  title: string,
  body: string,
  pushType: any,
) => {
  const allTokens = await collectPushToken(targetUserIds);
  return await sendFCMNotification(
    targetUserIds,
    allTokens,
    title,
    body,
    pushType,
  );
};

// 알림 조회하기
export const getPushList = async (userId: any) => {
  try {
    const fetchedData = await pushModel.fetchPushListByUserId(userId);
    let result = formatting.toCamelCase(fetchedData);
    if (result) {
      return result;
    } else {
      return false;
    }
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};

// 알림 읽음처리
export const updatePushReadStatus = async (notificationLogId: any) => {
  try {
    const result = await pushModel.updatePushReadStatus(notificationLogId);
    return result;
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};
