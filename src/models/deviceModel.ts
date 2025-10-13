import { DatabaseError } from '../errors/databaseError';
import { pool } from '../config/db';

// FCM 토큰 저장
export const insertDeviceInfo = async (userId: any, deviceInfo: any) => {
  let conn;
  const { deviceUUID, deviceType, osVersion, pushToken } = deviceInfo;
  const now = new Date();
  let params = [userId, deviceUUID, deviceType, osVersion, pushToken, now];

  try {
    let sql = `
        INSERT INTO t_user_device (user_id, device_uuid, device_type, os_version, push_token, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`;

    conn = await pool.getConnection();

    const [result]: any = await conn.query(sql, params);

    if (result.affectedRows === 0) {
      return false;
    }

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] insertDeviceInfo: ${error}`, error);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 디바이스 정보 조회
export const findDeviceByUUID = async (deviceUUID: any) => {
  let conn;
  const params = [deviceUUID];

  try {
    let sql = `
      SELECT * FROM t_user_device 
      WHERE device_uuid = ?
      `;

    conn = await pool.getConnection();

    const [result]: any = await conn.query(sql, params);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] findDeviceInfoByUserId: ${error}`,
        error,
      );
    }
  } finally {
    if (conn) conn.release();
  }
};

// 푸시 토큰 정보 조회
export const findPushTokenInfoByUserId = async (userId: any) => {
  let conn;
  const params = [userId];

  try {
    let sql = `
        SELECT push_token FROM t_user_device 
        WHERE user_id = ?
        `;

    conn = await pool.getConnection();

    const [result]: any = await conn.query(sql, params);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] findPushTokenInfoByUserId: ${error}`,
        error,
      );
    }
  } finally {
    if (conn) conn.release();
  }
};

// 디바이스 정보 업데이트
export const updateDeviceInfo = async (userId: any, deviceInfo: any) => {
  let conn;
  const { deviceUUID, osVersion, pushToken } = deviceInfo;
  const now = new Date();
  let params = [userId, osVersion, pushToken, now, deviceUUID];

  try {
    let sql = `
      UPDATE t_user_device 
      SET user_id = ?, os_version = ?, push_token = ?, updated_at = ?
      WHERE device_uuid = ?`;

    conn = await pool.getConnection();

    const [result]: any = await conn.query(sql, params);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] updateDeviceInfo: ${error}`, error);
    }
  } finally {
    if (conn) conn.release();
  }
};
