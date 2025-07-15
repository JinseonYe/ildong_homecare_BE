import * as careReportModel from '../models/careReportModel';
import * as formatting from '../utils/formatting';
import { pool } from '../config/db';
import { FieldPacket, RowDataPacket } from 'mysql2';
import * as buildingService from '../services/buildingService';
import * as generateQuery from '../utils/generateQuery';
import * as userModel from '../models/userModel';
import * as deviceModel from '../models/deviceModel';
import * as pushService from '../services/pushService';
import * as fileService from '../services/fileService';

// 작업내역 등록하기
export const createCareReport = async (careReportInfo: any, files: any) => {
  let conn;
  try {
    const createdAt = new Date();
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    // 작업 내역 등록
    const result = await careReportModel.insertCareReport(conn, careReportInfo);
    if (result.affectedRows === 0) {
      throw new Error('작업 내역 삽입 실패');
    }

    const careReportId = result.insertId; // 생성된 `care_report_id`
    const careCategoryIds = careReportInfo.careCategoryIds;
    const targetType = 'carereport';

    // 파일 정보 삽입
    await fileService.insertFileInfos(
      conn,
      files,
      careReportId,
      targetType,
      createdAt,
    );

    // careCategoryIds를 배열로 변환 (문자열, 배열, 단일 값 모두 처리)
    const processedCategoryIds: any[] = ([] =
      normalizeToNumberArray(careCategoryIds));

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

/**
 * 문자열, 숫자, 배열 등 다양한 형태의 입력을 number[]로 일관되게 파싱합니다.
 * - "1,2,3" → [1, 2, 3]
 * - "[1,2,3]" → [1, 2, 3]
 * - 1 → [1]
 * - [1, 2] → [1, 2]
 * - undefined / null / "" → []
 */
export const normalizeToNumberArray = (
  input: string | number | Array<string | number> | null | undefined,
): number[] => {
  if (!input || input === '[]') return [];

  if (typeof input === 'string') {
    try {
      // JSON 배열 문자열인 경우 (예: "[1,2,3]")
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => Number(v)).filter((v) => !isNaN(v));
      }
    } catch {
      // JSON.parse 실패 시, "1,2,3" 형태로 처리
      return input
        .split(',')
        .map((id) => Number(id.trim()))
        .filter((v) => !isNaN(v));
    }
  }

  if (Array.isArray(input)) {
    return input.map((v) => Number(v)).filter((v) => !isNaN(v));
  }

  const num = Number(input);
  return isNaN(num) ? [] : [num];
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

  const { buildingName, startDate, endDate } = careReportSearchDto;

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
export const getCareReportById = async (careReportId: any) => {
  // DTO 유효성 검사
  if (!careReportId) {
    throw new Error('No search criteria provided');
  }
  const targetType = 'carereport';

  try {
    const fetchedData = await careReportModel.findCareReportById(
      careReportId,
      targetType,
    );
    let result = await formmatFetchedAllCareReport(fetchedData);

    if (!result || result.length === 0) {
      return null;
    }

    const buildingId = result[0].buildingId;

    // 유저가 건물주인지 확인 후 상태 업데이트
    // TODO 토큰으로 정보를 받아오게 되면 그 때 userId 추출해서 판단하도록 수정
    // await checkIsBuildingOwner(userId, buildingId, careReportId);

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
  const careStatusId = 2; // 열람
  careReportModel.updateCareStatusByReportId(careStatusId, careReportId);
};

// 작업 내역 수정
export const updateCareReport = async (
  careReportId: any,
  updateData: any,
  files: any,
) => {
  let conn;
  try {
    const updatedAt = new Date();
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const careStatusId = updateData.careStatusId;
    const { setQuery, values } = generateQuery.generateUpdateQuery(updateData);
    let result = await careReportModel.updateCareReport(
      conn,
      careReportId,
      setQuery,
      values,
      updatedAt,
    );

    if (result.affectedRows === 0) {
      throw new Error('작업 내역 정보 수정 실패');
    }

    const targetType = 'carereport';
    const fileDeletedResult = await fileService.softDeleteDocumentInfo(
      conn,
      careReportId,
      targetType,
    );

    // 파일 정보 수정
    await fileService.insertFileInfos(
      conn,
      files,
      careReportId,
      targetType,
      updatedAt,
    );

    if (careStatusId == 3) {
      // careStatusId가 3(승인)일 때 userRole 1(매니저), 0(관리자)에게 푸시
      // userRole 1: 매니저, userRole 0: 관리자
      const managerUserRole = 1;
      const adminUserRole = 0;
      const managers = await userModel.findUserByRole(managerUserRole);
      const admins = await userModel.findUserByRole(adminUserRole);

      // 푸시 알람 전송 정보
      const users = [...(managers || []), ...(admins || [])];
      const pushType = 'report';

      // users 배열에서 user_id만 추출해서 넘김
      await pushService.sendPushProcess(
        users.map((u) => u.user_id),
        '작업내역 승인',
        '작업내역이 승인되었습니다.',
        pushType,
      );
    }

    if (result.affectedRows > 0) {
      return true;
    } else {
      return false; // 업데이트된 행이 없음
    }
  } catch (error) {
    console.log('작업 내역 수정 실패: ', error);
  }
};
