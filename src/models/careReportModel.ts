import { FieldPacket, RowDataPacket } from 'mysql2';
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

// 모든 작업 내역 조회
// TODO: 우선 모든 카테고리 id를 한 컬럼에 넣어서 문자로 묶어서 보내는데 요구사항 수정에 따라 변경 가능함
export const findCareReports = async (
  startDate: any,
  endDate: any,
  buildingName: any,
  pageSize: any,
  offset: any,
) => {
  let conn;
  const deleteStatus = 0;
  const params = [
    deleteStatus,
    buildingName,
    startDate,
    endDate,
    pageSize,
    offset,
  ];

  try {
    let sql = `
      SELECT 
        cr.care_report_id, cr.user_id, cr.building_id, cr.care_status_id, b.building_name,
        cr.title, cr.care_content, cr.care_comment, 
        GROUP_CONCAT(crc.care_category_id ORDER BY crc.care_category_id SEPARATOR ', ') AS care_categories
      FROM t_care_report AS cr
      LEFT JOIN t_care_report_category AS crc 
        ON cr.care_report_id = crc.care_report_id
      JOIN t_building AS b
        ON cr.building_id = b.building_id
      WHERE cr.is_deleted = ?
      AND b.building_name LIKE ?
      AND cr.created_at BETWEEN ? AND ?
      GROUP BY cr.care_report_id
      ORDER BY cr.care_report_id
      LIMIT ? OFFSET ?`;

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

// 작업 상태 수정하기
export const updateCareStatus = async () => {
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
