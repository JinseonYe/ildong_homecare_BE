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
import { logger } from '../middlewares/loggingMiddleware';

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
    try {
      const tokens = await deviceModel.findPushTokenInfoByUserId(userId);
      if (tokens && tokens.length > 0) {
        allTokens.push(...tokens.map((t: any) => t.push_token || t.pushToken));
      }
    } catch (err) {
      console.error(`Failed to collect push token for userId ${userId}:`, err);
      // 실패해도 넘어감
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
  const invalidTokens: string[] = [];

  // 토큰 유효성 검증
  for (const token of tokens) {
    const isValid = await validatePushToken(token);
    if (isValid) {
      validTokens.push(token);
    } else {
      invalidTokens.push(token);
      logger.info(`Invalid token: ${token}`);
    }
  }

  // 유효하지 않은 토큰 한 번에 DB에서 삭제
  if (invalidTokens.length > 0) {
    try {
      await pushModel.deleteInvalidTokens(invalidTokens);
    } catch (error) {
      logger.error(`Failed to delete invalid tokens: ${error}`);
      // 에러 발생해도 다음 코드 진행됨
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
    try {
      const response = await getMessaging().sendEachForMulticast(message);
      successCount += response.successCount;
      failureCount += response.failureCount;

      // 상세 로그 추가: 각 토큰별 성공/실패 및 에러 메시지
      response.responses.forEach((resp, idx) => {
        const token = chunk[idx];
        if (resp.success) {
          logger.info(`[FCM SUCCESS] token: ${token}`);
        } else {
          logger.error(
            `[FCM FAIL] token: ${token}, error: ${resp.error?.message}`,
          );
          // throw하지 않고 그냥 실패 카운트에 포함
        }
      });
    } catch (error) {
      logger.error(`FCM multicast failed for chunk: ${error}`);
      failureCount += chunk.length; // chunk 전체를 실패로 처리
    }
  }

  // 푸시 로그 저장 (userId별로)
  for (const userId of targetUserIds) {
    try {
      await pushModel.insertNotificationLog(
        userId,
        title,
        body,
        JSON.stringify(validTokens),
        successCount,
        failureCount,
        pushType,
      );
    } catch (error) {
      logger.error(`Failed to insert push log for user ${userId}: ${error}`);
    }
  }

  console.log('successCount', successCount);
  console.log('failureCount', failureCount);

  logger.info(`[FCM SUMMARY] successCount: ${successCount}`);
  logger.info(`[FCM SUMMARY] failureCount: ${failureCount}`);

  return { successCount, failureCount };
};

// push 알림 보내는 프로세스
export const sendPushProcess = async (
  targetUserIds: any,
  title: string,
  body: string,
  pushType: any,
) => {
  try {
    const allTokens = await collectPushToken(targetUserIds);
    logger.info(`푸시를 전송할 토큰들: ${allTokens}`);

    return await sendFCMNotification(
      targetUserIds,
      allTokens,
      title,
      body,
      pushType,
    );
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};

// 알림 조회하기
export const getPushList = async (userId: any) => {
  try {
    await pushModel.markOlderNotificationsAsRead(userId); // 최근 100개 제외하고는 읽음처리
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
