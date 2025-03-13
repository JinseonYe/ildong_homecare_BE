import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';
import * as fcmModel from '../models/fcmModel';

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
  // 유효성 검사
  if (!userId || !fcmToken) {
    return false;
  }

  const result = await fcmModel.saveFCMToken(userId, fcmToken);
  return result;
};
