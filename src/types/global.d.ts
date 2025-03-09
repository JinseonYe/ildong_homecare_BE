import { JwtPayload } from 'jsonwebtoken';

// 타입 확장 (TypeScript에서는 req 객체에 새로운 속성을 추가할 때 타입 선언이 필요합니다)
declare global {
  namespace Express {
    interface Request {
      decodedToken?: JwtPayload;
    }
  }
}
