import { DatabaseError } from '../errors/databaseError';

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

// DB에 파일 정보 삭제
export const softDeleteDocumentInfo = async (
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
        `[Method] softDeleteDocumentInfo: ${error}`,
        error,
      );
    }
  }
};
