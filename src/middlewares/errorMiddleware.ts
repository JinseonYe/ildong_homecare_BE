import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/appError';
import { DatabaseError } from '../errors/databaseError';
import { logger } from '../middlewares/loggingMiddleware';

export const errorMiddleware = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // AppError 기반 커스텀 에러인지 확인
  if (err instanceof AppError) {
    const status = err.statusCode || 500;
    const customMessage = err.message;
    let originalMessage = '';
    if (err.cause instanceof Error) {
      originalMessage = `${err.cause.name}: ${err.cause.message}`;
    }

    // DatabaseError라면 추가 정보 로그
    if (err instanceof DatabaseError) {
      logger.error(
        `[${err.name}${err.code ? ':' + err.code : ''}] (status: ${status})\n` +
          `Custom Message: ${customMessage}\n` +
          (originalMessage ? `Original Error: ${originalMessage}\n` : '') +
          (err.stack ? `Stack:\n${err.stack}\n` : '') +
          `Errno: ${err.errno}, SQLState: ${err.sqlState}\n` +
          `SQL:\n${err.sql}`,
      );
    } else {
      logger.error(
        `[${err.name}] (status: ${status})\n` +
          `Custom Message: ${customMessage}\n` +
          (originalMessage ? `Original Error: ${originalMessage}\n` : '') +
          (err.stack ? `Stack:\n${err.stack}\n` : ''),
      );
    }

    return res.status(status).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  } else {
    // 일반적인 서버 에러 처리
    let message = '';
    if (err instanceof Error) {
      message = err.stack || err.message;
    } else {
      message = JSON.stringify(err);
    }
    logger.error(`[UnknownError] (status: 500)\n` + `Message: ${message}`);

    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};
