import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { UserSearchDto } from '../interfaces/userInterface';

// 유저 프로필 정보 업데이트 (Model)
export const updateUserProfile = async (
  userId: any,
  setQuery: string,
  values: any[],
) => {
  let conn;
  const time = new Date();
  values.push(time, userId);

  try {
    const sql = `
      UPDATE t_user_profile SET ${setQuery}, modified_at =? 
      WHERE user_id = ?
      `;
    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      values,
    );

    return rows;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release(); // DB 연결 해제
  }
};

// 유저 목록 조회
export const findUsers = async (
  page: any,
  pageSize: any,
  offset: any,
  whereClause: string,
  queryParams: any[],
) => {
  let conn;

  try {
    conn = await pool.getConnection();

    // 사용자 조회 쿼리 (COUNT + SELECT)
    const sql = `
        SELECT SQL_CALC_FOUND_ROWS * 
        FROM t_user_profile
        ${whereClause}
        LIMIT ? OFFSET ?
      `;
    const queryParamsWithPagination = [...queryParams, pageSize, offset];

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      queryParamsWithPagination,
    );

    // 전체 카운트 조회 (FOUND_ROWS() 사용)
    const [countRows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      'SELECT FOUND_ROWS() as total',
    );
    const totalCount = countRows[0].total;

    return {
      users: rows,
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
    };
  } catch (error) {
    // error를 Error 객체로 타입 단언
    if (error instanceof Error) {
      throw new Error(`Error while fetching users: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while fetching users');
    }
  } finally {
    if (conn) conn.release();
  }
};

// id별로 유저 조회
export const findUserById = async (userId: any) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus, userId];

  try {
    conn = await pool.getConnection();

    let sql = `
        SELECT u.user_id, prof.user_email, prof.user_name, prof.phone_number, 
        prof.user_role, prof.is_approved, prof.activate_alarm
        FROM t_user_profile AS prof
        JOIN t_user AS u ON prof.user_id = u.user_id
        WHERE u.is_deleted = ?
        AND u.user_id = ?
        `;

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

// 유저 권한에 따라 유저 정보 조회
export const findUserByRole = async (userRole: any) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus, userRole];

  try {
    conn = await pool.getConnection();

    let sql = `
      SELECT up.user_id, up.user_email, up.user_name, up.phone_number, up.user_role, up.is_approved
      FROM t_user_profile AS up
      JOIN t_user AS u ON up.user_id = u.user_id
      WHERE u.is_deleted = ?
      AND up.user_role = ?
      `;

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

