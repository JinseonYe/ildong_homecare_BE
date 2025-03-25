import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

// 유저 프로필 정보 업데이트 (Model)
export const updateUserProfile = async (
  userId: any,
  fields: string,
  values: any[],
) => {
  let conn;

  try {
    const sql = `UPDATE t_user_profile SET ${fields} WHERE user_id = ?`;
    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(sql, [
      ...values,
      userId,
    ]);

    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release(); // DB 연결 해제
  }
};
