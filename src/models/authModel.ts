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

// 이메일과 일치하는 사용자가 있는지 확인
export const findUserById = async (userEmail: string) => {
  let conn;
  const deleteStatus = 0;
  try {
    const sql = `
        SELECT t_user.user_code, prof.user_name, pwd.password, ul.user_level, prof.company_code
        FROM t_user 
        JOIN t_user_profile AS prof ON t_user.user_code = prof.user_code 
        JOIN t_auth_password AS pwd ON t_user.user_code = pwd.user_code
        JOIN t_user_level AS ul ON t_user.user_code = ul.user_code
        WHERE t_user.user_email = ?
        AND t_user.is_deleted =?`;
    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(sql, [
      userEmail,
      deleteStatus,
    ]);
    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// DB에 인증코드 삽입
export const insertAuthCode = async (
  userEmail: string,
  authCode: string,
  createdAt: Date,
  expiresAt: Date,
) => {
  let conn;
  try {
    const sql =
      'INSERT INTO t_user_email_auth_code (user_email, email_auth_code, created_at, expires_at) VALUES (?, ?, ?, ?)';
    conn = await pool.getConnection();
    await conn.query(sql, [userEmail, authCode, createdAt, expiresAt]);
  } catch (error) {
    console.error('Error inserting auth code:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// DB에서 이메일이 일치하는 만료되지 않은 가장 최근의 인증코드와 상태를 반환
export const getLatestAuthCode = async (
  userEmail: string | undefined,
): Promise<string | null> => {
  let conn;

  try {
    const sql = `
        SELECT email_auth_code FROM t_user_email_auth_code
        WHERE user_email = ? AND expires_at > NOW()
        ORDER BY created_at DESC
        LIMIT 1
      `;
    conn = await pool.getConnection();

    // 쿼리 결과의 타입을 RowDataPacket[]로 명시
    const [rows]: [RowDataPacket[], any] = await conn.query(sql, [userEmail]);

    if (rows.length > 0) {
      const emailAuthCode = rows[0].email_auth_code;
      return emailAuthCode; // 가장 최근의 인증코드를 반환
    } else {
      return null; // 만료되지 않은 인증코드가 없는 경우 null 반환
    }
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// auth_code_status 를 1로(인증 완료) 변경
export const updateAuthCodeToUsedAndVerifiedTime = async (
  userEmail: string,
  authCode: string,
) => {
  let conn;
  const updateStatus = 1;
  const verifiedAt = new Date();
  try {
    const sql =
      'UPDATE t_user_email_auth_code SET auth_code_status = ?, verified_at = ? WHERE user_email = ? AND email_auth_code = ?';
    conn = await pool.getConnection();
    conn.query(sql, [updateStatus, verifiedAt, userEmail, authCode]);
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// refreshToken 저장
export const insertRefreshToken = async (
  refreshToken: string,
  userCode: number,
) => {
  let conn;
  const currentTime = new Date();
  try {
    const sql =
      'INSERT INTO t_token_user (refresh_token, user_code, created_at) VALUES (?, ?, ?)';
    conn = await pool.getConnection();
    conn.query(sql, [refreshToken, userCode, currentTime]);
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

export const checkIfEmailVerified = async (userCode: number) => {
  let conn;
  try {
    const sql =
      'SELECT is_email_approval FROM t_user_approve WHERE user_code =?';
    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(sql, [
      userCode,
    ]);

    return rows.length > 0 ? rows[0].is_email_approval : null;
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// is_email_approval 을 1로(승인 완료) 변경
export const updateEmailAppoval = async (userEmail: string) => {
  let conn;
  const updateStatus = 1;
  const deleteStatus = 0;
  const time = new Date();
  try {
    const sql = `
        UPDATE t_user_approve AS ua
        JOIN t_user AS u ON ua.user_code = u.user_code
        SET ua.is_email_approval = ? , ua.email_approval_at =?
        WHERE u.user_email = ? 
          AND u.is_deleted = ?;`;

    conn = await pool.getConnection();
    conn.query(sql, [updateStatus, time, userEmail, deleteStatus]);
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// companyName으로 companyCode 찾기
export const findCompanycodeByCompanyName = async (companyName: string) => {
  let conn;
  try {
    const sql = `
        SELECT company_code
        FROM t_company_info
        WHERE company_name = ?;`;
    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(sql, [
      companyName,
    ]);
    return rows.length > 0 ? rows[0].company_code : null;
  } catch (error) {
    console.error('Error occurred:', error);
    throw error;
  } finally {
    if (conn) conn.release();
  }
};
