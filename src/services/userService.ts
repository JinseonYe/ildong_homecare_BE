import * as userModel from '../models/userModel';
import * as buildingModel from '../models/buildingModel';
import * as formatting from '../utils/formatting';
import { UserSearchDto } from '../interfaces/userInterface';
import * as generateQuery from '../utils/generateQuery';

// 유저 프로필 업데이트
export const updateUserProfile = async (userId: any, updateData: any) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw new Error('No data to update');
  }

  try {
    const { setQuery, values } = generateQuery.generateUpdateQuery(updateData);

    const result = await userModel.updateUserProfile(userId, setQuery, values);
    return result;
  } catch (error) {
    throw error;
  }
};

// 유저 목록 조회
export const getUsers = async (userDto: UserSearchDto) => {
  // DTO 유효성 검사
  if (!userDto) {
    throw new Error('No search criteria provided');
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
    // error를 Error 객체로 타입 단언
    if (error instanceof Error) {
      throw new Error(`Error while fetching users: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while fetching users');
    }
  }
};

// id별로 유저 조회
export const getUserById = async (userDto: any) => {
  // DTO 유효성 검사
  if (!userDto) {
    throw new Error('No search criteria provided');
  }

  const { userId } = userDto;

  try {
    const result = await userModel.findUserById(userId);
    const resultToCamel = formatting.toCamelCase(result);
    return resultToCamel;
  } catch (error: unknown) {
    // error를 Error 객체로 타입 단언
    if (error instanceof Error) {
      throw new Error(`Error while fetching users: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while fetching users');
    }
  }
};

// 건물 정보 조회
export const getBuildingInfo = async (buildingId: number) => {
  // 건물 정보 조회
  const buildingInfo = await buildingModel.fetchBuildingById(buildingId);
  if (!buildingInfo || buildingInfo.length === 0) {
    throw new Error('해당 건물 정보를 찾을 수 없습니다.');
  }

  return buildingInfo[0];
};

export const getUserInfo = async (userId: number) => {
    // 유저 정보 조회
    const userInfo = await userModel.findUserById(userId);
    if (!userInfo || userInfo.length === 0) {
      throw new Error('해당 유저 정보를 찾을 수 없습니다.');
    }
  
    return userInfo[0];
}

// 관리자 전체 조회
export const getAdmins = async () => {
  const adminUserRole = 0
  // user_role이 admin인 유저 전체 조회
  const admins = await userModel.findUserByRole(adminUserRole)
    if (!admins) {
    throw new Error('관리자 정보를 찾을 수 없습니다.');
  }
  return admins;
};
