// DB에 파일 정보 삽입
export const insertDocumentInfo = async (
  conn: any,
  targetId: number,
  targetType: string,
  fileInfo: any,
  createdAt: Date,
) => {
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
  await conn.query(sql, params);
};
