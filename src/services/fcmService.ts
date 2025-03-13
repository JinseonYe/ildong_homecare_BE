import admin from 'firebase-admin';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serviceAccountPath = path.resolve(
  __dirname,
  '..',
  'config',
  'firebase-key.json',
);

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
