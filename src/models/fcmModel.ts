import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

// 알림 내용 저장
export const insertNotificationLog = async (data: {
  userId: number;
  title: string;
  body: string;
  tokens: string;
  successCount: number;
  failureCount: number;
}) => {
  let conn;

  try {
    const sql = `
    INSERT INTO t_push_notification_log
    (user_id, title, body, tokens, success_count, failure_count) 
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    const params = [
      data.userId,
      data.title,
      data.body,
      data.tokens,
      data.successCount,
      data.failureCount,
    ];

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );

    return rows;
  } catch (error) {
    throw error;
  }
};
