import JWT, { JwtPayload } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { RowDataPacket, FieldPacket } from 'mysql2';
import { pool } from '../config/db';

dotenv.config();

interface Payload {
  userId: string;
  userName: string;
  userEmail: string;
}

// 토큰 생성 함수
export const createToken = (
  payload: Payload,
  secretKey: string,
  expiresIn: string,
) => {
  const token = JWT.sign(
    {
      userId: payload.userId,
      userName: payload.userName,
      userEmail: payload.userEmail,
    },
    secretKey,
    {
      algorithm: 'HS256',
      expiresIn: expiresIn,
    },
  );
  return token;
};

// 디코딩된 토큰을 DB의 정보와 일치하는지 유효성 검사
const validateTokenInfo = async (decodedToken: JwtPayload) => {
  const decodedTokenInfo = [decodedToken.userCode, decodedToken.userEmail];
  let conn;

  try {
    const sql =
      'SELECT user_name, user_email FROM t_user_profile WHERE user_Id = ? AND user_email = ?';
    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      decodedTokenInfo,
    );

    return rows.length > 0;
  } catch (error) {
    return false;
  } finally {
    if (conn) conn.release();
  }
};

// 시크릿 키 생성
const generateSecretKey = (length: number) => {
  return crypto.randomBytes(length).toString('hex'); // length는 원하는 시크릿 키 자리수
};

// 인증 미들웨어
export const tokenAuthMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers['authorization'];
    if (!token) {
      return res
        .status(401)
        .send({ success: false, message: '토큰이 없습니다.' });
    }

    // 토큰이 'Bearer ejglwjeglgkje' 이런 형식인지 확인
    const parts = token.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res
        .status(401)
        .send({ success: false, message: '토큰 형식이 잘못되었습니다.' });
    }

    const secretKey = process.env.SECRET_KEY ?? '';
    const tokenPart = parts[1];
    const decodedToken = JWT.verify(tokenPart, secretKey) as JwtPayload;

    // secretKey로 decoding된 정보가 DB에 존재하는지 확인
    const isValid = await validateTokenInfo(decodedToken);
    if (!isValid) {
      return res
        .status(401)
        .send({ success: false, message: '인증에 실패했습니다.' });
    }

    // decodedToken을 req 객체에 저장
    req.decodedToken = decodedToken;

    next();
  } catch (error) {
    res.status(401).send({ success: false, message: '인증에 실패했습니다.' });
  }
};

// refreshToken 미들웨어
export const refreshTokenMiddleware = async (req: Request, res: Response) => {
  const secretKey = process.env.SECRET_KEY ?? '';
  const refreshSecretKey = process.env.R_SECRET_KEY ?? '';

  const accessToken = req.headers['authorization']?.split(' ')[1];
  const refreshHeader = req.headers['refresh'];
  const refreshToken = Array.isArray(refreshHeader)
    ? refreshHeader[0].split(' ')[1]
    : refreshHeader?.split(' ')[1];

  // Access 토큰과 Refresh 토큰이 모두 존재하지 않을 때
  if (!accessToken || !refreshToken) {
    return res.status(401).send({
      success: false,
      message: 'Access 토큰과 Refresh 토큰이 모두 필요합니다.',
    });
  }

  try {
    JWT.verify(accessToken, secretKey); // Access 토큰 검증
    return res
      .status(200)
      .send({ success: true, message: 'Access 토큰이 유효합니다.' });
  } catch (accessTokenError) {
    // Access 토큰이 만료된 경우에만 Refresh 토큰을 확인
    try {
      const decodedRefreshToken = JWT.verify(refreshToken, refreshSecretKey); // Refresh 토큰 검증

      // Refresh 토큰이 유효한 경우, 새로운 Access 토큰 발급
      const newAccessToken = JWT.sign(
        { userCode: (decodedRefreshToken as any).userCode },
        secretKey,
        { expiresIn: '1d' },
      );
      res.setHeader('authorization', `Bearer ${newAccessToken}`); // Access 토큰 재발급
      return res.status(200).send({
        success: true,
        message: 'Access 토큰 재발급 성공.',
      });
    } catch (refreshTokenError) {
      // Refresh 토큰이 유효하지 않으면 401 응답
      return res.status(401).send({
        success: false,
        message: '권한이 없습니다. Refresh 토큰이 만료되었습니다.',
      });
    }
  }
};
