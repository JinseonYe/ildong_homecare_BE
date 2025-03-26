import * as userModel from '../models/userModel';
import * as formatting from '../utils/formatting';
import { UserSearchDto } from '../interfaces/userInterface';

// 유저 프로필 업데이트
export const updateUserProfile = async (userId: any, updateData: any) => {
  if (!userId) {
    throw new Error('User ID is required');
  }

  if (!updateData || Object.keys(updateData).length === 0) {
    throw new Error('No data to update');
  }

  try {
    // 데이터 스네이크 케이스 변환
    const updateDataToSnake = formatting.toSnakeCase(updateData);

    // `modified_at` 추가
    updateDataToSnake.modified_at = new Date();

    // SQL 필드 및 값 준비
    const fields = Object.keys(updateDataToSnake)
      .map((key) => `${key} = ?`)
      .join(', ');
    const values = Object.values(updateDataToSnake);

    const result = await userModel.updateUserProfile(userId, fields, values);
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
    return result;
  } catch (error: unknown) {
    // error를 Error 객체로 타입 단언
    if (error instanceof Error) {
      throw new Error(`Error while fetching users: ${error.message}`);
    } else {
      throw new Error('An unknown error occurred while fetching users');
    }
  }
};
