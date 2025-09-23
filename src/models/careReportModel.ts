import { DatabaseError } from '../errors/databaseError';
import { FieldPacket, RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db';
import { logger } from '../middlewares/loggingMiddleware';

// 작업 내역 등록
export const insertCareReport = async (conn: any, careReportInfo: any) => {
  const time = new Date();

  try {
    let sql = `
    INSERT INTO t_care_report (user_id, building_id, care_status_id, title, care_content, amount, created_at)
        VALUES (?, ?, ?, ?, ? ,?, ?)`;

    const values = [
      careReportInfo.userId,
      careReportInfo.buildingId,
      careReportInfo.careStatusId,
      careReportInfo.title,
      careReportInfo.careContent,
      careReportInfo.amount,
      time,
    ];

    const [result]: any = await conn.query(sql, values);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] insertCareReport: ${error}`, error);
    }
  }
};

// 작업 내역 카테고리 삽입
export const insertCareCategory = async (conn: any, categoryValues: any) => {
  try {
    let sql = `
    INSERT INTO t_care_report_category (care_report_id, care_category_id) 
        VALUES ?;`;

    const [result]: any = await conn.query(sql, [categoryValues]);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] insertCareCategory: ${error}`, error);
    }
  }
};

// 모든 작업 상태 조회
export const fetchAllCareStatus = async () => {
  let conn;
  const activeStatus = 1;

  try {
    let sql = `
        SELECT care_status_id, care_status_name
        FROM t_care_status
        WHERE is_active =?`;

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      activeStatus,
    );
    return rows;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] fetchAllCareStatus: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 유효한 카테고리 ID 조회
export const getValidCareCategoryIds = async (
  conn: any,
  categoryIds: number[],
) => {
  try {
    const sql = `
        SELECT care_category_id FROM t_care_category 
        WHERE care_category_id IN (?);
      `;
    const [rows]: any = await conn.query(sql, [[...categoryIds]]);

    return rows.map((row: any) => row.care_category_id);
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] getValidCareCategoryIds: ${error}`,
        error,
      );
    }
  }
};

// 필터별로 작업 내역 조회
// TODO: 우선 모든 카테고리 id를 한 컬럼에 넣어서 문자로 묶어서 보내는데 요구사항 수정에 따라 변경 가능함
export const findCareReports = async (
  userRole?: any,
  startDate?: string,
  endDate?: string,
  buildingName?: string,
  currentUserId?: any, // 현재 로그인한 사용자 ID 추가
) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus, deleteStatus, deleteStatus]; // 기본 파라미터

  try {
    let sql = `
      SELECT 
        cr.care_report_id, cr.user_id, cr.building_id, cr.care_status_id, b.building_name,
        cr.title, cr.care_content, cr.care_comment, cr.amount,
        GROUP_CONCAT(crc.care_category_id ORDER BY crc.care_category_id SEPARATOR ', ') AS care_categories,
        (SELECT f.file_name FROM t_file_upload AS f 
        WHERE f.target_id = cr.care_report_id 
          AND f.target_type = 'carereport' 
          AND f.is_deleted = ?
        ORDER BY f.created_at 
        LIMIT 1) AS file_name,
        (SELECT f.file_url FROM t_file_upload AS f 
        WHERE f.target_id = cr.care_report_id 
          AND f.target_type = 'carereport' 
          AND f.is_deleted = ?
        ORDER BY f.created_at 
        LIMIT 1) AS file_url,
        cr.created_at
      FROM t_care_report AS cr
      LEFT JOIN t_care_report_category AS crc 
        ON cr.care_report_id = crc.care_report_id
      JOIN t_building AS b
        ON cr.building_id = b.building_id
      WHERE cr.is_deleted = ?`;

    // userRole에 따른 조회 권한 설정
    logger.info(`findCareReports - userRole: ${userRole}`);
    logger.info(`findCareReports - currentUserId: ${currentUserId}`);

    if (userRole == 2) {
      // 건물주(2): 본인의 건물의 작업내역만 조회
      logger.info('건물주 조건 실행됨');
      sql += ` AND b.user_id = ?`;
      params.push(currentUserId);
    } else if (userRole == 1) {
      // 매니저(1): 본인이 등록한 작업내역만 조회
      logger.info('매니저 조건 실행됨');
      sql += ` AND cr.user_id = ?`;
      params.push(currentUserId);
    } else if (userRole == 0) {
      logger.info('어드민 조건 실행됨 - 모든 작업내역 조회');
    } else {
      logger.info(`userRole이 정의되지 않음: ${userRole}`);
    }
    // 어드민(0): 모든 작업내역 조회 (추가 조건 없음)

    // 조건이 있을 때만 추가
    if (typeof buildingName != 'undefined' && buildingName) {
      sql += ` AND b.building_name LIKE ?`;
      params.push(`%${buildingName}%`);
    }
    if (startDate && endDate) {
      sql += ` AND cr.created_at BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    } else if (startDate) {
      sql += ` AND cr.created_at >= ?`;
      params.push(startDate);
    } else if (endDate) {
      sql += ` AND cr.created_at <= ?`;
      params.push(endDate);
    }

    sql += ` GROUP BY cr.care_report_id ORDER BY cr.created_at DESC`;

    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );
    return rows;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] findCareReports: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 작업 내역 id별로 작업 상태 수정하기
export const updateCareStatusByReportId = async (
  careStatusId: number,
  careReportId: number,
) => {
  let conn;
  const deleteStatus = 0;
  const params = [careStatusId, deleteStatus, careReportId];

  try {
    const sql = `
      UPDATE t_care_report 
      SET care_status_id = ?
      WHERE is_deleted = ? 
      AND care_report_id = ?`;

    conn = await pool.getConnection();

    // 결과 타입을 OkPacket으로 명시
    const [result]: [ResultSetHeader, unknown] = await conn.query(sql, params);

    if (result.affectedRows === 0) {
      throw new Error('업데이트된 데이터가 없습니다.');
    }

    return result;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(
        `[Method] updateCareStatusByReportId: ${err}`,
        err,
      );
    }
  } finally {
    if (conn) conn.release();
  }
};

// Id별로 작업 내역 조회하기
// TODO: 우선 모든 카테고리 id를 한 컬럼에 넣어서 문자로 묶어서 보내는데 요구사항 수정에 따라 변경 가능함
export const findCareReportById = async (
  careReportId: any,
  targetType: any,
) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [targetType, deleteStatus, deleteStatus, careReportId];

  try {
    let sql = `
      SELECT 
        cr.care_report_id, cr.user_id, cr.building_id, b.building_name, cr.care_status_id,
        cr.title, cr.care_content, cr.care_comment, cr.amount, fu.file_name, fu.file_url,
        GROUP_CONCAT(DISTINCT crc.care_category_id ORDER BY crc.care_category_id) AS care_category_ids
      FROM t_care_report cr
      LEFT JOIN t_file_upload fu
        ON cr.care_report_id = fu.target_id
        AND fu.target_type = ? 
        AND fu.is_deleted = ?
      LEFT JOIN t_care_report_category crc
        ON cr.care_report_id = crc.care_report_id
      JOIN t_building b
        ON cr.building_id = b.building_id
      WHERE cr.is_deleted = ?
        AND cr.care_report_id = ?
      GROUP BY cr.care_report_id, fu.file_name, fu.file_url
      ORDER BY cr.care_report_id;
     `;

    conn = await pool.getConnection();
    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );

    return rows;
  } catch (err) {
    if (err instanceof Error) {
      throw new DatabaseError(`[Method] findCareReportById: ${err}`, err);
    }
  } finally {
    if (conn) conn.release();
  }
};

// 작업 내역 수정
export const updateCareReport = async (
  conn: any,
  careReportId: any,
  setQuery: any,
  values: any,
  updatedAt: any,
) => {
  const deleteStatus = 0;
  const params = [...values, updatedAt, deleteStatus, careReportId];

  try {
    const sql = `
      UPDATE t_care_report SET ${setQuery}, modified_at =?
      WHERE is_deleted = ?
      AND care_report_id = ?
    `;

    const [result]: any = await conn.query(sql, params);

    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] updateCareReport: ${error}`, error);
    }
  }
};
