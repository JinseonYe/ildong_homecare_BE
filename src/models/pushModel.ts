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

// userId 별로 알림 내역 조회
export const fetchPushListByUserId = async (userId: any) => {
  let conn;
  const params: any[] = [userId];

  try {
    let sql = `
        SELECT notification_log_id, title, body, push_type, is_read, created_at
        FROM t_push_notification_log
        WHERE user_id =?`;

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

// 알림 읽음 처리
export const updatePushReadStatus = async (notificationLogId: any) => {
  let conn;
  const readStatus = 1;
  const params: any[] = [readStatus, notificationLogId];

  try {
    let sql = `
        UPDATE t_push_notification_log
        SET is_read = ?
        WHERE notification_log_id = ?`;

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );
    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
};
