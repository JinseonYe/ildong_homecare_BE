import { FieldPacket, RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../config/db';

// 작업 내역 등록
export const insertCareReport = async (conn: any, careReportInfo: any) => {
  const time = new Date();

  try {
    let sql = `
    INSERT INTO t_care_report (user_id, building_id, care_status_id, title, care_content, created_at)
        VALUES (?, ?, ?, ?, ? ,?)`;

    const values = [
      careReportInfo.userId,
      careReportInfo.buildingId,
      careReportInfo.careStatusId,
      careReportInfo.title,
      careReportInfo.careContent,
      time,
    ];

    const [result]: any = await conn.query(sql, values);
    return result;
  } catch (error) {
    throw error;
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
    throw error;
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
    throw err;
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
    throw error;
  }
};

// 필터별로 작업 내역 조회
// TODO: 우선 모든 카테고리 id를 한 컬럼에 넣어서 문자로 묶어서 보내는데 요구사항 수정에 따라 변경 가능함
export const findCareReports = async (
  startDate?: string,
  endDate?: string,
  buildingName?: string,
  pageSize?: number,
  offset?: number,
) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus]; // 기본 파라미터

  try {
    let sql = `
      SELECT 
        cr.care_report_id, cr.user_id, cr.building_id, cr.care_status_id, b.building_name,
        cr.title, cr.care_content, cr.care_comment, 
        GROUP_CONCAT(crc.care_category_id ORDER BY crc.care_category_id SEPARATOR ', ') AS care_categories, cr.created_at
      FROM t_care_report AS cr
      LEFT JOIN t_care_report_category AS crc 
        ON cr.care_report_id = crc.care_report_id
      JOIN t_building AS b
        ON cr.building_id = b.building_id
      WHERE cr.is_deleted = ?`;

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

    sql += ` GROUP BY cr.care_report_id ORDER BY cr.care_report_id`;

    // 페이지네이션 적용
    if (pageSize !== undefined && offset !== undefined) {
      sql += ` LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
    }

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

// 업로드된 파일 url 삽입
export const insertUploadedFile = async (
  conn: any,
  careReportId: any,
  fileName: any,
  fileUrl: any,
  createdAt: any,
) => {
  try {
    let sql = `
    INSERT INTO t_file_upload (care_report_id, file_name, file_url, created_at) 
        VALUES (?, ?, ?, ?);`;

    const [result]: any = await conn.query(sql, [
      careReportId,
      fileName,
      fileUrl,
      createdAt,
    ]);
    return result;
  } catch (error) {
    throw error;
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
    console.log('상태 수정 중 오류:', err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

// Id별로 작업 내역 조회하기
// TODO: 우선 모든 카테고리 id를 한 컬럼에 넣어서 문자로 묶어서 보내는데 요구사항 수정에 따라 변경 가능함
export const findCareReportById = async (careReportId: any) => {
  let conn;
  const deleteStatus = 0;
  const params: any[] = [deleteStatus, careReportId];

  try {
    let sql = `
      SELECT 
        cr.care_report_id, cr.user_id, cr.building_id, cr.care_status_id, 
        cr.title, cr.care_content, cr.care_comment, 
        GROUP_CONCAT(DISTINCT fu.file_name) AS file_name,
        GROUP_CONCAT(DISTINCT fu.file_url) AS file_url,
        GROUP_CONCAT(DISTINCT crc.care_category_id ORDER BY crc.care_category_id) AS care_category_ids
      FROM t_care_report AS cr
      LEFT JOIN t_care_report_category AS crc 
        ON cr.care_report_id = crc.care_report_id
      LEFT JOIN t_file_upload AS fu
        ON cr.care_report_id = fu.care_report_id
      WHERE cr.is_deleted = ?
        AND cr.care_report_id = ?
      GROUP BY cr.care_report_id
      ORDER BY cr.care_report_id;
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
