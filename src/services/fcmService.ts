import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fcmModel from '../models/fcmModel';
import * as formatting from '../utils/formatting';

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
