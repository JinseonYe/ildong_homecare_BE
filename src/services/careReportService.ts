import * as careReportModel from '../models/careReportModel';
import * as formatting from '../utils/formatting';
import { pool } from '../config/db';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as buildingService from '../services/buildingService';
import { toCamelCase } from '../utils/formatting';

// 작업내역 등록하기
export const createCareReport = async (careReportInfo: any, files: any) => {
  let conn;
  try {
    const createdAt = new Date();
    const userId = Number(careReportInfo.userId);
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    // 작업 내역 등록
    const result = await careReportModel.insertCareReport(conn, careReportInfo);
    if (result.affectedRows === 0) {
      throw new Error('작업 내역 삽입 실패');
    }

    const careReportId = result.insertId; // 생성된 `care_report_id`
    const careCategoryIds = careReportInfo.careCategoryIds;
    const fileInfos = await extractFileInfo(files);

    // 파일 정보 삽입
    for (const fileInfo of fileInfos) {
      await careReportModel.insertDocumentInfo(
        conn,
        userId,
        fileInfo,
        careReportId,
        createdAt,
      ); // 파일 정보
    }

    // careCategoryIds를 배열로 변환 (문자열, 배열, 단일 값 모두 처리)
    let processedCategoryIds: number[] = [];

    if (careCategoryIds) {
      if (typeof careCategoryIds === 'string') {
        // "1,3" 형태의 문자열을 배열로 변환
        if (careCategoryIds.includes(',')) {
          processedCategoryIds = careCategoryIds
            .split(',')
            .map((id) => Number(id.trim()));
        } else {
          // 단일 값인 경우
          processedCategoryIds = [Number(careCategoryIds)];
        }
      } else if (Array.isArray(careCategoryIds)) {
        // 이미 배열인 경우
        processedCategoryIds = careCategoryIds.map((id) => Number(id));
      } else {
        // 단일 숫자인 경우
        processedCategoryIds = [Number(careCategoryIds)];
      }
    }

    // 카테고리 ID 유효성 체크 후 삽입
    if (processedCategoryIds?.length > 0) {
      const validCategoryIds = await careReportModel.getValidCareCategoryIds(
        conn,
        processedCategoryIds,
      );

      // const careCategoryIdsArray = careCategoryIds.split(',').map(Number);
      const validCategorySet = new Set(validCategoryIds);
      const invalidCategoryIds = processedCategoryIds.filter(
        // 유효하지 않은 ID 찾기
        (id: any) => !validCategorySet.has(id),
      );

      if (invalidCategoryIds.length > 0) {
        throw new Error(
          `존재하지 않는 카테고리 ID: ${invalidCategoryIds.join(', ')}`,
        );
      }

      // 유효한 카테고리 ID만 삽입
      const categoryValues = validCategoryIds.map((categoryId: number) => [
        careReportId,
        categoryId,
      ]);

      await careReportModel.insertCareCategory(conn, categoryValues);
    }

    await conn.commit(); // 성공 시 커밋
    return true;
  } catch (error) {
    if (conn) await conn.rollback(); // 에러 발생 시 롤백
    throw error;
  } finally {
    if (conn) conn.release();
  }
};

// 작업 상태 조회하기
export const getAllCareStatus = async () => {
  try {
    let result = await careReportModel.fetchAllCareStatus();
    result = formatting.toCamelCase(result);
    if (result.length > 0) {
      return result;
    } else {
      return false;
    }
  } catch (error) {}
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

// 작업 내역 조회하기
export const getCareReports = async (careReportSearchDto: any) => {
  // DTO 유효성 검사
  if (!careReportSearchDto) {
    throw new Error('No search criteria provided');
  }

  const { buildingName, page, pageSize, startDate, endDate } =
    careReportSearchDto;

  // 타입을 숫자로 바꾸면서 기본값 설정도 해줌
  const pageToNumber = page ? Number(page) : 1;
  const pageSizeToNumber = pageSize ? Number(pageSize) : 10;

  const offset = (pageToNumber - 1) * pageSizeToNumber;

  let buildingNameWithlikePattern;

  // buildingName이 있을 때만
  if (typeof buildingName != 'undefined' && buildingName) {
    buildingNameWithlikePattern = `%${buildingName}%`;
  }

  try {
    const fetchedData = await careReportModel.findCareReports(
      startDate,
      endDate,
      buildingNameWithlikePattern,
      pageSizeToNumber,
      offset,
    );

    let result = formatting.toCamelCase(fetchedData, ['file_name', 'file_url']);

    if (result) {
      return result;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
};

// Id별로 작업 내역 조회하기
export const getCareReportById = async (careReportSearchDto: any) => {
  // DTO 유효성 검사
  if (!careReportSearchDto) {
    throw new Error('No search criteria provided');
  }

  const { careReportId, userId } = careReportSearchDto;

  try {
    const fetchedData = await careReportModel.findCareReportById(careReportId);
    let result = await formmatFetchedAllCareReport(fetchedData);

    if (!result || result.length === 0) {
      return null;
    }

    const buildingId = result[0].buildingId;

    // 유저가 건물주인지 확인 후 상태 업데이트
    await checkIsBuildingOwner(userId, buildingId, careReportId);

    return result;
  } catch (error) {
    console.log(error);
  }
};

// 작업 내역 조회된 데이터 포맷팅하기
export const formmatFetchedAllCareReport = async (
  fetchedData: RowDataPacket[],
) => {
  try {
    const reportMap = new Map<number, any>();

    // 데이터를 카멜 케이스로 변환
    fetchedData = formatting.toCamelCase(fetchedData, [
      'file_name',
      'file_url',
    ]);

    console.log('fetchedData', fetchedData);

    fetchedData.forEach(
      ({ careReportId, fileName, fileUrl, careCategoryId, ...row }) => {
        // careReportId가 없으면 새로 생성
        if (!reportMap.has(careReportId)) {
          reportMap.set(careReportId, {
            ...row,
            careReportId,
            files: new Map<string, any>(), // 파일 중복을 위한 Map 사용
          });
        }

        const report = reportMap.get(careReportId);

        // 파일 정보 추가 (중복 방지)
        if (fileName && fileUrl) {
          const fileKey = `${fileName}-${fileUrl}`;
          if (!report.files.has(fileKey)) {
            report.files.set(fileKey, { fileName, fileUrl });
          }
        }
      },
    );

    // Set을 배열로 변환 후 반환
    const result = Array.from(reportMap.values()).map((report) => ({
      ...report,
      files: Array.from(report.files.values()), // Map에서 values만 추출
    }));

    return result;
  } catch (error) {
    console.log(error);
  }
};

// 조회하는 유저가 건물주인지 확인
export const checkIsBuildingOwner = async (
  userId: any,
  buildingId: any,
  careReportId: any,
) => {
  try {
    const building = await buildingService.fetchBuildingById(buildingId);

    if (!building || building.length === 0) {
      throw new Error(`건물 ID ${buildingId}에 해당하는 정보가 없습니다.`);
    }

    const buildingOwnerId = building[0].userId;

    // 건물주 확인
    if (buildingOwnerId == userId) {
      await updateCareStatusByReportId(careReportId); // 비동기 처리에 대해 await 사용
    } else {
      console.log('사용자는 건물주가 아닙니다.');
    }
  } catch (err) {
    console.log('건물주 확인 중 오류:', err);
  }
};

// id별로 작업 내역 상태 수정
export const updateCareStatusByReportId = async (careReportId: any) => {
  const careStatusId = 3; // 완료
  careReportModel.updateCareStatusByReportId(careStatusId, careReportId);
};
