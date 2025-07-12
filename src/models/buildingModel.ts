import { FieldPacket, RowDataPacket } from 'mysql2';
import { pool } from '../config/db';

// 건물 정보 등록
export const insertBuildingInfo = async (conn: any, buildingInfo: any) => {
  const time = new Date();

  const { userId, buildingName, address } = buildingInfo;
  const values = [userId, buildingName, address, time];

  try {
    let sql = `
    INSERT INTO t_building (user_id, building_name, address, created_at)
        VALUES (?, ?, ?, ?)`;

    const [result]: any = await conn.query(sql, values);
    return result;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

// 건물 전체 정보 조회
export const fetchAllBuildingInfo = async () => {
  let conn;
  const deleteStatus = 0;
  const params = [deleteStatus];

  try {
    let sql = `
      SELECT b.building_id, up.user_id, up.user_name, up.user_email, up.phone_number, b.building_name, b.address, 
      fu.file_name, fu.file_url, b.created_at
      FROM t_building AS b
      JOIN t_user_profile AS up ON b.user_id = up.user_id
      LEFT JOIN t_file_upload AS fu ON b.building_id = fu.target_id
        AND fu.target_type = 'building'
      WHERE is_deleted =?
      ORDER BY b.building_id DESC
      `;

    conn = await pool.getConnection();

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );

    if (rows.length === 0) {
      throw new Error('No buildings found');
    }

    return rows;
  } catch (err) {
    throw err;
  } finally {
    if (conn) conn.release();
  }
};

// 건물 ID 별로 정보 조회
export const fetchBuildingById = async (buildingId: any) => {
  let conn;
  const deleteStatus = 0;

  try {
    const params = [deleteStatus, deleteStatus, buildingId];
    let sql = `
     SELECT b.building_id, b.user_id, b.building_name, b.address, fu.file_name, fu.file_url
      FROM t_building AS b
      LEFT JOIN t_file_upload fu
        ON b.building_id = fu.target_id
        AND fu.target_type = 'building'
        AND fu.is_deleted =?
      WHERE b.is_deleted =?
      AND b.building_id =?
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

// 건물 업데이트
export const updateBuilding = async (
  conn: any,
  buildingId: any,
  setQuery: string,
  values: any[],
  updatedAt: any,
) => {
  const deleteStatus = 0;

  try {
    const sql = `
    UPDATE t_building SET ${setQuery}, modified_at =? 
      WHERE is_deleted =? 
      AND building_id = ?`;

    values.push(updatedAt, deleteStatus, buildingId);

    const [result]: any = await conn.query(sql, values);

    return result;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// 건물 삭제
export const deleteBuilding = async (buildingId: any) => {
  let conn;
  const time = new Date();
  const deleteStatus = 1;

  try {
    const sql = `UPDATE t_building
    SET is_deleted =?, deleted_at =? 
    WHERE building_id = ?`;

    conn = await pool.getConnection();
    const [result]: any = await conn.query(sql, [
      deleteStatus,
      time,
      buildingId,
    ]);

    return result.affectedRows > 0;
  } catch (error) {
    throw error;
  } finally {
    if (conn) conn.release();
  }
};
