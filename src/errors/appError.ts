export class AppError extends Error {
  public readonly statusCode: number;
  public readonly cause?: Error;

  constructor(message: string, statusCode: number, cause?: Error) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.cause = cause;

    // 프로토타입 체인 문제 해결
    Object.setPrototypeOf(this, new.target.prototype);

    // 에러가 발생한 정확한 위치로 스택 트레이스 설정
    Error.captureStackTrace(this, this.constructor);
  }
}
