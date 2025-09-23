import app from './app';
import https from 'https';
import http from 'http';
import dotenv from 'dotenv';
import fcmConnection from './services/pushService';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import { logger } from './middlewares/loggingMiddleware';

dotenv.config();

// 현재 모듈의 URL로부터 __dirname을 구하는 함수
const __filename = fileURLToPath(import.meta.url); // 현재 모듈의 URL을 파일 경로로 변환
const __dirname = path.dirname(__filename); // 파일 경로에서 디렉토리 경로만 추출

// uploads 폴더 경로 설정 (프로젝트 루트 기준)
const uploadDir = path.join(process.cwd(), 'uploads');

// 서버 시작 전에 uploads 디렉토리가 존재하는지 확인하고, 없으면 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`📁 Created directory: ${uploadDir}`);
  logger.info(`📁 Created directory: ${uploadDir}`);
}

const BACKEND_HOST = process.env.BACKEND_HOST;
const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '51111', 10);
const SERVER_TYPE = process.env.SERVER_TYPE; // 서버 타입 (http or https)

fcmConnection();

if (SERVER_TYPE === 'http') {
  const httpServer = http.createServer(app);

  // HTTP 서버 실행
  httpServer.listen(BACKEND_PORT, '0.0.0.0', () => {
    console.log(`🚀 HTTP Server running on port ${BACKEND_PORT}!`);
    logger.info(`🚀 HTTP Server running on port ${BACKEND_PORT}!`);
  });
} else if (SERVER_TYPE === 'https') {
  try {
    // SSL 인증서 옵션 설정
    const options = {
      key: fs.readFileSync(`/etc/letsencrypt/live/${BACKEND_HOST}/privkey.pem`),
      cert: fs.readFileSync(
        `/etc/letsencrypt/live/${BACKEND_HOST}/fullchain.pem`,
      ),
    };

    const httpsServer = https.createServer(options, app); // HTTPS 서버 생성
    // HTTPS 서버 실행
    httpsServer.listen(BACKEND_PORT, '0.0.0.0', () => {
      console.log(`🚀 HTTPS Server running on port ${BACKEND_PORT}!`);
      logger.info(`🚀 HTTPS Server running on port ${BACKEND_PORT}!`);
    });
  } catch (error) {
    console.error(`❌ HTTPS 서버 실행 중 에러 발생: ${error}`);
    logger.error(`❌ HTTPS 서버 실행 중 에러 발생: ${error}`);
  }
} else {
  console.log(`올바른 서버가 아닙니다.`);
  logger.info(`올바른 서버가 아닙니다.`);
}
