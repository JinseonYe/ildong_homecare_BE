import bcrypt from 'bcrypt';
import * as authModel from '../models/authModel';
import { pool } from '../config/db';

// 비밀번호 해싱
export const hashing = async (passowrd: string) => {
  const saltRound = 10;
  const salt = await bcrypt.genSalt(saltRound);

  const hashedPassword = await bcrypt.hash(passowrd, salt);
  return hashedPassword;
};

// 트랜잭션으로 사용자 생성 및 정보 삽입
export const createUserWithTransaction = async (data: any) => {
  const conn = await pool.getConnection();
  await conn.beginTransaction();
  try {
    const createdAt = new Date(); // 생성 시간
    let userId = await authModel.createUser(conn, data, createdAt); // 유저 생성해서 유저id 추출
    await authModel.insertUserInfo(conn, data, userId, createdAt); // 유저 상세 정보
    await authModel.insertUserPasswordInfo(conn, data, userId); // 유저 비밀번호

    await conn.commit(); // 모든 작업이 성공하면 커밋
    return { success: true };
  } catch (error) {
    console.error('Error occurred:', error); // 오류 메시지 출력
    await conn.rollback(); // 오류가 발생하면 롤백
    throw error;
  } finally {
    conn.release(); // 연결 해제
  }
};
