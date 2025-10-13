import {
  NotFoundError,
  BadRequest,
  InternalServerError,
} from '../errors/httpError';
import bcrypt from 'bcrypt';
import * as authModel from '../models/authModel';
import { pool } from '../config/db';
import * as formatting from '../utils/formatting';
import * as fileService from '../services/fileService';

// 비밀번호 해싱
export const hashing = async (passowrd: string) => {
  const saltRound = 10;
  const salt = await bcrypt.genSalt(saltRound);

  const hashedPassword = await bcrypt.hash(passowrd, salt);
  return hashedPassword;
};

// 트랜잭션으로 사용자 생성 및 정보 삽입
export const createUserWithTransaction = async (data: any, files: any) => {
  const hashedPassword = await hashing(data.password);
  data.password = hashedPassword; // 비밀번호 해싱하고 data에 다시 삽입
  const isApproved = data.isApproved;

  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const createdAt = new Date(); // 생성 시간
    let userId = await authModel.createUser(conn, data, createdAt); // 유저 생성해서 유저id 추출
    await authModel.insertUserInfo(conn, data, userId, createdAt); // 유저 상세 정보
    await authModel.insertUserPasswordInfo(conn, data, userId); // 유저 비밀번호

    // 승인 여부가 있으면 업데이트 (관리자가 가입 시켰을 시)
    if (isApproved) {
      await authModel.updateApprovalStatus(conn, isApproved, userId);
    }

    const targetType = 'profile';

    // 파일 정보 삽입
    await fileService.insertFileInfos(
      conn,
      files,
      userId,
      targetType,
      createdAt,
    );

    await conn.commit(); // 모든 작업이 성공하면 커밋
    return { success: true };
  } catch (error) {
    await conn.rollback(); // 오류가 발생하면 롤백
    throw new InternalServerError(`${error}`);
  } finally {
    conn.release(); // 연결 해제
  }
};

// 이메일 중복 확인
export const isUserEmailAvailable = async (userEmail: string) => {
  try {
    const count = await authModel.checkUserEmailExists(userEmail);

    return count === 0; // count가 0이면 true(사용 가능), 1 이상이면 false(이미 존재)
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};

// ID가 일치하는 사용자가 있는지 확인하고 사용자 정보 가져옴
export const findUserByIdService = async (userEmail: string) => {
  const userInfo = await authModel.findUserById(userEmail);

  // 사용자가 없는 경우
  if (userInfo && userInfo.length === 0) {
    return null;
  }

  const userInfoToCamel = formatting.toCamelCase(userInfo);
  return userInfoToCamel;
};

// 비밀번호 비교
export const comparePassword = async (
  password: string,
  hashedPassword: string,
) => {
  const isMatch = await bcrypt.compare(password, hashedPassword);

  return isMatch;
};
