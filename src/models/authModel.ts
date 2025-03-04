import { pool } from '../config/db';
import { RowDataPacket, FieldPacket } from 'mysql2';

// DB에 사용자 생성
export const createUser = async (conn: any, data: any, createdAt: Date) => {
  const sql = 'INSERT INTO t_user (user_email, created_at) VALUES (?, ?)';
  await conn.query(sql, [data.userEmail, createdAt]);

  const [result] = await conn.query('SELECT LAST_INSERT_ID() AS userCode');
  return result[0].userCode; // 자동 생성된 user_code 반환
};

// DB에 사용자 정보 삽입
export const insertUserInfo = async (
  conn: any,
  data: any,
  userId: number,
  createdAt: Date,
) => {
  const sql =
    'INSERT INTO t_user_profile (user_id, user_name, user_email, phone_number, user_role, created_at) VALUES (?, ?, ?, ?, ?, ?)';
  await conn.query(sql, [
    userId,
    data.userName,
    data.userEmail,
    data.phoneNumber,
    data.userRole,
    createdAt,
  ]);
};

// DB에 비밀번호 정보 삽입
export const insertUserPasswordInfo = async (
  conn: any,
  data: any,
  userId: number,
) => {
  const sql = 'INSERT INTO t_user_password (user_id, password) VALUES (?, ?)';
  await conn.query(sql, [userId, data.password]);
};

// 사용자 ID로 이미 사용자가 존재하는지 확인
export const checkUserEmailExists = async (userEmail: string) => {
  let conn;
  try {
    const sql = 'SELECT COUNT(*) AS count FROM t_user WHERE user_email = ?';
    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(sql, [
      userEmail,
    ]);
    const count = rows[0].count;

    return count;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release();
  }
};
