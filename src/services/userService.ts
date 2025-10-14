import {
  NotFoundError,
  BadRequest,
  InternalServerError,
} from '../errors/httpError';
import { pool } from '../config/db';
import * as userModel from '../models/userModel';
import * as buildingModel from '../models/buildingModel';
import * as formatting from '../utils/formatting';
import {
  UserSearchDto,
  UserSearchKeywordDto,
} from '../interfaces/userInterface';
import * as generateQuery from '../utils/generateQuery';
import * as fileService from '../services/fileService';

// 유저 프로필 업데이트
export const updateUserProfile = async (
  userId: any,
  updateData: any,
  files: any,
) => {
  let conn;

  if (!userId) {
    throw new BadRequest('User ID is required');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw new NotFoundError('No data to update');
  }

  try {
    const updatedAt = new Date();
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const { setQuery, values } = generateQuery.generateUpdateQuery(updateData);

    const result: any = await userModel.updateUserProfile(
      conn,
      userId,
      setQuery,
      values,
      updatedAt,
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError('유저 정보 수정 실패');
    }

    const targetType = 'profile';

    // 업데이트 파일이 있으면 수정
    if (Array.isArray(files) && files.length > 0) {
      // 기존 파일을 삭제하고
      await fileService.softDeleteDocumentInfo(conn, userId, targetType);

      // 새로운 업데이트 파일 삽입
      await fileService.insertFileInfos(
        conn,
        files,
        userId,
        targetType,
        updatedAt,
      );
    }

    await conn.commit(); // 성공 시 커밋

    return result;
  } catch (error) {
    if (conn) await conn.rollback(); // 에러 발생 시 롤백
    throw new InternalServerError(`${error}`);
  } finally {
    if (conn) conn.release();
  }
};

// 유저 목록 조회
export const getUsers = async (userDto: UserSearchDto) => {
  // DTO 유효성 검사
  if (!userDto) {
    throw new BadRequest('No search criteria provided');
  }

  const { userRole, approved, page, pageSize } = userDto;

  // pageSize가 undefined일 경우 기본값 10을 설정
  const validPageSize = pageSize ?? 10;

  // 페이지 번호(page)도 유효성 검사하여 기본값을 설정
  const validPage = page ?? 1;

  const offset = (validPage - 1) * validPageSize;

  // 동적 쿼리 빌더
  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (userRole !== undefined) {
    whereClauses.push('user_role = ?');
    queryParams.push(userRole);
  }

  if (approved !== undefined) {
    whereClauses.push('is_approved = ?');
    queryParams.push(approved);
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  try {
    const result = await userModel.findUsers(
      validPage,
      validPageSize,
      offset,
      whereClause,
      queryParams,
    );
    const resultToCamel = formatting.toCamelCase(result);
    return resultToCamel;
  } catch (error: unknown) {
    throw new InternalServerError(`${error}`);
  }
};

// 유저 목록 조회
export const getUsersByKeyword = async (userDto: UserSearchKeywordDto) => {
  if (!userDto || Object.keys(userDto).length === 0) {
    throw new BadRequest('No search criteria provided');
  }

  const { fields = [], keyword } = userDto;

  // 화이트리스트 체크
  const allowedFields = [
    'user_name',
    'user_email',
    'phone_number',
    'user_role',
    'is_approved',
  ];
  const searchFields = fields.filter((f) => allowedFields.includes(f));

  let whereClause = '';
  let params: any[] = [];

  // 검색 조건이 있을 때만 OR 조건 생성
  if (searchFields.length > 0 && keyword !== undefined && keyword !== '') {
    const orConditions = searchFields.map((f) => `${f} LIKE ?`).join(' OR ');
    whereClause = `WHERE (${orConditions})`;
    params = Array(searchFields.length).fill(`%${keyword}%`);
  }

  // 검색 조건이 없으면 whereClause = '' → 전체 조회
  try {
    const result = await userModel.findUsersByKeword(whereClause, params);
    return formatting.toCamelCase(result);
  } catch (error: unknown) {
    throw new InternalServerError(`${error}`);
  }
};

// id별로 유저 조회
export const getUserById = async (userId: any) => {
  // DTO 유효성 검사
  if (!userId) {
    throw new BadRequest('No search criteria provided');
  }

  try {
    const result = await userModel.findUserById(userId);
    const resultToCamel = formatting.toCamelCase(result);
    return resultToCamel;
  } catch (error: unknown) {
    throw new InternalServerError(`${error}`);
  }
};

// 건물 정보 조회
export const getBuildingInfo = async (buildingId: number) => {
  // 건물 정보 조회
  const buildingInfo = await buildingModel.fetchBuildingById(buildingId);
  if (!buildingInfo || buildingInfo.length === 0) {
    throw new NotFoundError('해당 건물 정보를 찾을 수 없습니다.');
  }

  return buildingInfo[0];
};

export const getUserInfo = async (userId: number) => {
  // 유저 정보 조회
  const userInfo = await userModel.findUserById(userId);
  if (!userInfo || userInfo.length === 0) {
    throw new NotFoundError('해당 유저 정보를 찾을 수 없습니다.');
  }

  return userInfo[0];
};

// 관리자 전체 조회
export const getAdmins = async () => {
  const adminUserRole = 0;
  // user_role이 admin인 유저 전체 조회
  const admins = await userModel.findUserByRole(adminUserRole);
  if (!admins) {
    throw new NotFoundError('관리자 정보를 찾을 수 없습니다.');
  }
  return admins;
};

// 회원 탈퇴
export const deleteUserById = async (userId: any) => {
  // DTO 유효성 검사
  if (!userId) {
    throw new BadRequest('No search criteria provided');
  }

  try {
    const result = await userModel.deleteUserById(userId);

    return result;
  } catch (error: unknown) {
    throw new InternalServerError(`${error}`);
  }
};
