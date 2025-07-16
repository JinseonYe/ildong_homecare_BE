import { AppError } from './appError';

// 400 - 잘못된 요청
export class BadRequest extends AppError {
  constructor(message: string = 'Bad Request', cause?: Error) {
    super(message, 400, cause);
    this.name = 'BadRequestError';
  }
}

// 404 - 리소스를 찾을 수 없음
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', cause?: Error) {
    super(message, 404, cause);
    this.name = 'NotFoundError';
  }
}

// 401 - 인증되지 않음
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', cause?: Error) {
    super(message, 401, cause);
    this.name = 'UnauthorizedError';
  }
}

// 409 - 리소스 충돌
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', cause?: Error) {
    super(message, 409, cause);
    this.name = 'ConflictError';
  }
}

// 500 - 서버 내부 오류
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', cause?: Error) {
    super(message, 500, cause);
    this.name = 'InternalServerError';
  }
}
