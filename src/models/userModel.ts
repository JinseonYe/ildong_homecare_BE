import { DatabaseError } from '../errors/databaseError';
import { FieldPacket, ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { UserSearchDto } from '../interfaces/userInterface';

// 유저 프로필 정보 업데이트 (Model)
export const updateUserProfile = async (
  conn: any,
  userId: any,
  setQuery: string,
  values: any[],
  updatedAt: any,
) => {
  values.push(updatedAt, userId);

  try {
    const sql = `
      UPDATE t_user_profile SET ${setQuery}, modified_at =? 
      WHERE user_id = ?
      `;

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      values,
    );

    return rows;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] updateUserProfile: ${error}`, error);
    }
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
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] findUsers: ${error}`, error);
    }
  } finally {
    if (conn) conn.release();
  }
};

// id별로 유저 조회
export const findUserById = async (userId: any) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus, deleteStatus, userId];

  try {
    let sql = `
        SELECT u.user_id, prof.user_email, prof.user_name, prof.phone_number, 
        prof.user_role, prof.is_approved, prof.activate_alarm, fu.file_name, fu.file_url
        FROM t_user_profile AS prof
        JOIN t_user AS u ON prof.user_id = u.user_id
        LEFT JOIN t_file_upload AS fu ON prof.user_id = fu.target_id
          AND fu.target_type = 'profile'
          AND fu.is_deleted = ?
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
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] findUserById: ${err}`, err);
    }
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
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] findUserByRole: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 유저 id 에 따라 유저 권한 조회
export const findUserRoleByUserId = async (userId: any) => {
  let conn;
  const params: any[] = [userId];

  try {
    let sql = `
      SELECT user_role
      FROM t_user_profile
      WHERE user_id =?
      `;

    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );
    return rows;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] findUserRoleByUserId: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 회원 탈퇴
export const deleteUserById = async (userId: any) => {
  let conn;
  const deleteStatus = 1;
  const now = new Date();
  const params = [deleteStatus, now, userId];

  try {
    const sql = `
      UPDATE t_user
      SET is_deleted = ?, deleted_at = ?
      WHERE user_id = ? 
      `;

    conn = await pool.getConnection();

    const [result]: [ResultSetHeader, unknown] = await conn.query(sql, params);

    if (result.affectedRows === 0) {
      throw new Error('업데이트된 데이터가 없습니다.');
    }

    return result.affectedRows > 0;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] deleteUserById: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};
