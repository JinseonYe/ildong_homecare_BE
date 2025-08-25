import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import rTracer from 'cls-rtracer';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import winstonDaily from 'winston-daily-rotate-file';
import { createLogger, format, transports, transport } from 'winston';
import util from 'util';

dotenv.config();

const ENV_MODE = process.env.ENV_MODE;
const __dirname = dirname(fileURLToPath(import.meta.url));
const logDir = path.resolve(__dirname, '../../logs');

const { combine, timestamp, printf, colorize } = format;

/**
 * 로그 디렉토리 자동 생성
 */
function ensureLogDirectories() {
  ['all', 'warn', 'error'].forEach((level) => {
    const levelDir = path.join(logDir, level);
    if (!fs.existsSync(levelDir)) {
      fs.mkdirSync(levelDir, { recursive: true });
    }
  });
}
ensureLogDirectories();

/**
 * 요청 ID, user ID 포함한 포맷
 */
const rTracerFormat = printf((info) => {
  const traceId = rTracer.id() as string | undefined; // request-id|userId:username 형식
  let formattedTrace = '';

  if (traceId) {
    const [requestId, userInfo] = traceId.split('|');
    formattedTrace = `[request-id:${requestId} user:${userInfo}]`;
  }

  return `${info.timestamp} ${formattedTrace}: ${info.level.toUpperCase()} ${
    info.message
  }`;
});

/**
 * 공통 로그 파일 옵션
 */
const createDailyRotateFile = (level: string, dir: string, suffix: string) =>
  new winstonDaily({
    level,
    datePattern: 'YYYY-MM-DD',
    dirname: path.join(logDir, dir),
    filename: `%DATE%.${suffix}.log`,
    maxFiles: 30, //30일치 로그파일 저장
    zippedArchive: true, // 로그가 쌓이면 압축하여 관리
    format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })),
  });

/**
 * 콘솔 로그 옵션 (개발 환경에서만)
 */
const consoleTransport = new transports.Console({
  level: 'debug', //console은 debug 이상은 다 출력한다

  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    rTracerFormat,
  ),
});

/**
 * logger 생성
 */
export const logger = createLogger({
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), rTracerFormat),
  transports: [
    ...(ENV_MODE === 'development' ? [consoleTransport] : []),
    createDailyRotateFile('info', 'all', 'all'),
    createDailyRotateFile('warn', 'warn', 'warn'),
    createDailyRotateFile('error', 'error', 'error'),
  ],
});

/**
 * 프로세스 예외 및 비동기 에러 로깅
 */
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.stack || err.message}`);
  process.exit(1); // PM2 같은 프로세스 매니저가 재시작하게 함
});

process.on('unhandledRejection', (reason: any) => {
  logger.error(`Unhandled Rejection: ${reason?.stack || reason}`);
  // 필요 시 종료 (운영 환경에 따라 결정)
  // process.exit(1);
});

/**
 * 요청/응답 정보 로깅 미들웨어
 */
export const loggingMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { method, originalUrl, ip } = req;
  const userAgent = req.headers['user-agent'] || '';

  logger.info(`[${method}] ${originalUrl}`);

  // 리퀘스트 데이터 로그
  logger.info(`[REQUEST] ${util.inspect(req.body, { depth: null })}`);
  if (req.files) {
    logger.info(`[REQUEST FILES] ${util.inspect(req.files, { depth: null })}`);
  }

  res.on('finish', () => {
    const { statusCode } = res;
    logger.info(
      `응답 완료 → ${method} ${originalUrl} ${statusCode} - ${ip} (${userAgent})`,
    );
  });

  next();
};
