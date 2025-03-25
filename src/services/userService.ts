import * as userModel from '../models/userModel';
import * as formatting from '../utils/formatting';

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
