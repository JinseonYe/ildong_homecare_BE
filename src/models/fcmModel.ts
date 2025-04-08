import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

// FCM 토큰 저장
export const saveFCMToken = async (userId: any, fcmToken: any) => {
  let conn;
  const time = new Date();

  try {
    let sql = `
      INSERT INTO t_fcm_token (user_id, fcm_token, created_at)
          VALUES (?, ?, ?)`;

    const values = [userId, fcmToken, time];

    conn = await pool.getConnection();

    const [result]: any = await conn.query(sql, values);
    return result;
  } catch (error) {
    throw error;
  }
};

// FCM 토큰 user id 별로 조회 TODO: user id 별로 FCM 토큰이 1개 이상이 된다면 어떤 조건을 추가할지 결정
export const findFCMTokenByUserId = async (userId: any) => {
  let conn;

  try {
    let sql = `
        SELECT fcm_token
        FROM t_fcm_token
        WHERE user_id = ?`;

    const values = [userId];

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      values,
    );

    return rows;
  } catch (error) {
    throw error;
  }
};

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
