import app from './app';
import http from 'http';
import dotenv from 'dotenv';
import fcmConnection from './services/fcmService';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

dotenv.config();

const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '51111', 10);

// 현재 모듈의 URL로부터 __dirname을 구하는 함수
const __filename = fileURLToPath(import.meta.url); // 현재 모듈의 URL을 파일 경로로 변환
const __dirname = path.dirname(__filename); // 파일 경로에서 디렉토리 경로만 추출

// uploads 폴더 경로 설정 (현재 파일 위치 기준)
const uploadDir = path.join(__dirname, '/uploads');

// 서버 시작 전에 uploads 디렉토리가 존재하는지 확인하고, 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created directory: ${uploadDir}`);
}

const httpServer = http.createServer(app);
fcmConnection();

httpServer.listen(BACKEND_PORT, '0.0.0.0', () => {
  console.log(`HTTP Server running on port ${BACKEND_PORT}!`);
});
