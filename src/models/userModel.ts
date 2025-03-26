import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';
import { UserSearchDto } from '../interfaces/userInterface';

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
