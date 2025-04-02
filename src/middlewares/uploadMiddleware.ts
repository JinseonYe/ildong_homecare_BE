import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import admin from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

/**
 * Firebase 저장소를 사용할 경우 uploadToFirebaseMiddleware, uploadToFirebase 호출
 * Local에 저장할할 경우 uploadToLocalMiddleware, uploadToLocal 호출
 */

// 현재 파일의 경로를 가져오기 위해 fileURLToPath 사용
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase Admin SDK 초기화
admin.initializeApp({
  credential: admin.credential.cert(
    path.join(__dirname, '..', 'config', 'firebase-key.json'),
  ),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET, // Firebase Storage 버킷 주소로 수정
});

// Multer 설정 (메모리 저장소 사용)
const uploadForFirebase = multer({ storage: multer.memoryStorage() });
export const uploadToFirebaseMiddleware = uploadForFirebase.array('files'); // 다중 파일을 처리하는 미들웨어

// Firebase에 파일 업로드 미들웨어
export const uploadToFirebase = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // 다중 파일이 업로드 되었는지 확인
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: '파일이 없습니다.' });
  }

  try {
    const bucket = getStorage().bucket(); // Firebase Storage의 버킷을 가져옴
    const fileNameUrl: { fileName: string; fileUrl: string }[] = [];

    // 각 파일을 Firebase에 업로드
    for (const file of req.files as Express.Multer.File[]) {
      const firebaseFile = bucket.file(
        `uploads/${Date.now()}-${file.originalname}`,
      ); // 업로드할 파일 경로와 이름 설정

      // Firebase Storage에 파일 저장
      await firebaseFile.save(file.buffer, { contentType: file.mimetype });

      // 파일의 URL을 생성 (만료일 설정)
      const [url] = await firebaseFile.getSignedUrl({
        action: 'read',
        expires: '03-01-2030',
      });

      // 파일 URL과 이름을 배열에 저장
      fileNameUrl.push({
        fileName: file.originalname,
        fileUrl: url,
      });
    }

    // 요청 본문에 모든 파일의 URL과 이름을 저장
    req.body.fileNameUrl = fileNameUrl;

    next(); // 다음 미들웨어로 이동
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '파일 업로드 실패' });
  }
};

// 업로드 디렉터리 설정
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 설정 (파일을 로컬 uploads 폴더에 저장)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const uploadForLocal = multer({ storage });
export const uploadToLocalMiddleware = uploadForLocal.array('files'); // 다중 파일 업로드 미들웨어

// 로컬에 파일 업로드 미들웨어
export const uploadToLocal = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
    return res
      .status(400)
      .json({ success: false, message: '파일이 없습니다.' });
  }

  try {
    const fileNameUrl: { fileName: string; fileUrl: string }[] = [];

    for (const file of req.files as Express.Multer.File[]) {
      fileNameUrl.push({
        fileName: file.filename,
        fileUrl: `/uploads/${file.filename}`,
      });
    }

    req.body.fileNameUrl = fileNameUrl;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: '파일 업로드 실패' });
  }
};
