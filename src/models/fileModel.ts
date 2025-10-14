import { FieldPacket, RowDataPacket } from 'mysql2';
import { DatabaseError } from '../errors/databaseError';
import pool from '../config/db';

// DB에 파일 정보 삽입
export const insertDocumentInfo = async (
  conn: any,
  targetId: number,
  targetType: string,
  fileInfo: any,
  createdAt: Date,
) => {
  try {
    const params = [
      targetId,
      targetType,
      fileInfo.fileHash,
      fileInfo.fileName,
      fileInfo.fileExtension,
      fileInfo.filePath,
      fileInfo.fileFullPath,
      fileInfo.fileUrl,
      createdAt,
    ];
    const sql = `INSERT INTO t_file_upload (target_id, target_type, file_hash, file_name, file_extension, file_path, 
      file_full_path, file_url, created_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const [result]: any = await conn.query(sql, params);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(`[Method] insertDocumentInfo: ${error}`, error);
    }
  }
};

// DB에 target id로 파일 정보 삭제
export const softDeleteDocumentInfoByTargetId = async (
  conn: any,
  targetId: number,
  targetType: string,
) => {
  const deleteStatus = 1;
  try {
    const params = [deleteStatus, targetId, targetType];
    const sql = `
        UPDATE t_file_upload SET is_deleted = ? WHERE target_id = ? AND target_type =?
        `;

    const [result]: any = await conn.query(sql, params);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] softDeleteDocumentInfoByTargetId: ${error}`,
        error,
      );
    }
  }
};

// 기존 파일 조회
export const getFilesByTartgetIdAndName = async (
  targetId: any,
  targetType: any,
) => {
  const conn = await pool.getConnection();
  const deleteStatus = 0;
  const params = [deleteStatus, targetId, targetType];

  try {
    const sql = `
      SELECT file_upload_id, target_id, target_type, file_url
      FROM t_file_upload
      WHERE is_deleted = ?
      AND target_id = ?
      AND target_type = ?
    `;

    const [rows]: [RowDataPacket[], FieldPacket[]] = await conn.query(
      sql,
      params,
    );

    return rows;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] getFilesByTartgetIdAndName: ${error}`,
        error,
      );
    }
  }
};

// DB에 파일 정보 삭제
export const softDeleteDocumentInfo = async (
  conn: any,
  fileUploadId: number,
) => {
  const deleteStatus = 1;
  try {
    const params = [deleteStatus, fileUploadId];
    const sql = `
        UPDATE t_file_upload SET is_deleted = ? WHERE file_upload_id = ?
        `;

    const [result]: any = await conn.query(sql, params);
    return result;
  } catch (error) {
    if (error instanceof Error) {
      throw new DatabaseError(
        `[Method] softDeleteDocumentInfo: ${error}`,
        error,
      );
    }
  }
};
