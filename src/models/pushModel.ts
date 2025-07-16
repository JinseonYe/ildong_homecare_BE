import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { DatabaseError } from '../errors/databaseError';

// 알림 내용 저장
export const insertNotificationLog = async (
  userId: number,
  title: string,
  body: string,
  tokens: string,
  successCount: number,
  failureCount: number,
  pushType: any,
) => {
  let conn;

  try {
    const sql = `
    INSERT INTO t_push_notification_log
    (user_id, title, body, tokens, success_count, failure_count, push_type) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

    const params = [
      userId,
      title,
      body,
      tokens,
      successCount,
      failureCount,
      pushType,
    ];

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );

    return rows;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] insertNotificationLog: ${error}`,
        error,
      );
    }
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
        WHERE user_id =?
        AND success_count > 0`;

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );
    return rows;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] fetchPushListByUserId: ${err}`, err);
    }
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
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] updatePushReadStatus: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};
