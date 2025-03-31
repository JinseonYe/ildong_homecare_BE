import * as careReportModel from '../models/careReportModel';
import * as formatting from '../utils/formatting';
import { pool } from '../config/db';
import { FieldPacket, RowDataPacket } from 'mysql2';

// 작업내역 등록하기
export const createCareReport = async (careReportInfo: any, files: any) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const createdAt = new Date();

    // 작업 내역 등록
    const result = await careReportModel.insertCareReport(conn, careReportInfo);
    if (result.affectedRows === 0) {
      throw new Error('작업 내역 삽입 실패');
    }

    const careReportId = result.insertId; // 생성된 `care_report_id`
    const careCategoryIds = careReportInfo.careCategoryIds;

    // 업로드된 파일 정보 삽입 (파일이 여러 개 있을 경우)
    if (Array.isArray(files)) {
      for (const file of files) {
        // 파일 하나씩 처리하여 삽입
        await careReportModel.insertUploadedFile(
          conn,
          careReportId,
          file.fileName,
          file.fileUrl,
          createdAt,
        );
      }
    } else {
      console.log('업로드된 파일 정보가 배열이 아닙니다.');
    }

    // 카테고리 ID 유효성 체크 후 삽입
    if (careCategoryIds?.length > 0) {
      const validCategoryIds = await careReportModel.getValidCareCategoryIds(
        conn,
        careCategoryIds,
      );

      const careCategoryIdsArray = careCategoryIds.split(',').map(Number);
      const validCategorySet = new Set(validCategoryIds);
      const invalidCategoryIds = careCategoryIdsArray.filter(
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

    let result = formatting.toCamelCase(fetchedData);

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

  const { careReportId } = careReportSearchDto;

  try {
    const fetchedData = await careReportModel.findCareReportById(careReportId);
    let result = formatting.toCamelCase(fetchedData);
    if (result) {
      return result;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
  }
};
