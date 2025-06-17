import * as careReportModel from '../models/careReportModel';
import * as formatting from '../utils/formatting';
import { pool } from '../config/db';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as buildingService from '../services/buildingService';

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
    console.log(careCategoryIds);
    console.log(typeof careCategoryIds);

    // ✅ careCategoryIds 유효성 검사 및 변환
    let processedCategoryIds;
    if (typeof careCategoryIds === 'string') {
      try {
        processedCategoryIds = JSON.parse(careCategoryIds);
      } catch (e) {
        throw new Error('careCategoryIds는 유효한 배열 형식이어야 합니다.');
      }
    } else {
      processedCategoryIds = careCategoryIds;
    }

    if (!Array.isArray(processedCategoryIds)) {
      throw new Error('careCategoryIds는 배열이어야 합니다.');
    }

    console.log('careCategoryIds', processedCategoryIds);

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
    fetchedData = formatting.toCamelCase(fetchedData);

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
