import {
  NotFoundError,
  BadRequest,
  InternalServerError,
} from '../errors/httpError';
import * as fileModel from '../models/fileModel';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// 파일 정보 삽입
export const insertFileInfos = async (
  conn: any,
  files: any,
  targetId: any,
  tartgetType: any,
  createdAt: any,
) => {
  const fileInfos = await extractFileInfo(files);

  // 파일 정보 삽입
  for (const fileInfo of fileInfos) {
    await fileModel.insertDocumentInfo(
      conn,
      targetId,
      tartgetType,
      fileInfo,
      createdAt,
    ); // 파일 정보
  }
};

// 파일 정보 삭제
export const softDeleteDocumentInfo = async (
  conn: any,
  targetId: any,
  targetType: string,
) => {
  const isDeleted = await fileModel.softDeleteDocumentInfo(
    conn,
    targetId,
    targetType,
  ); // 파일 정보

  return isDeleted;
};

// 파일에서 파일 정보 추출
export const extractFileInfo = async (files: string[]) => {
  const fileInfoPromises = files.map(async (file) => {
    const fileName = path.basename(file);
    const fileExtension = path.extname(file);
    const filePath = path.dirname(file);
    const fileFullPath = path.format(path.parse(file));
    const serverUrl = `${process.env.SERVER_TYPE}://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}`;
    const fileUrl = `${serverUrl}/uploads/${fileName}`;
    const fileHash = await hashFile(fileFullPath);

    return {
      fileName, // 파일명 (예: "이미지.jpg")
      fileExtension, // 파일 확장자 (예: ".jpg")
      filePath, // 파일이 저장된 디렉터리 경로
      fileFullPath, // 전체 파일 경로
      fileUrl, // 파일 URL (완전한 URL)
      fileHash,
    };
  });
  const fileInfos = await Promise.all(fileInfoPromises);

  return fileInfos;
};

// 파일 내용을 해시
export const hashFile = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filePath);
    const hash = crypto.createHash('sha1');

    fileStream.on('data', (chunk) => {
      hash.update(chunk);
    });

    fileStream.on('end', () => {
      const fileHash = hash.digest('hex');
      resolve(fileHash);
    });

    fileStream.on('error', (err) => {
      reject(`파일을 읽는 도중 오류 발생: ${err.message}`);
    });
  });
};
