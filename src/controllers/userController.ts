import { Request, Response } from 'express';
import * as userService from '../services/userService';
import { UserSearchDto } from '../interfaces/userInterface';
import * as formatting from '../utils/formatting';

// 유저 프로필 업데이트
export const updateUserProfile = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const updateData = req.body;

  try {
    // userId 유효성 검사
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        success: false,
        message: '유효한 userId가 필요합니다.',
      });
    }

    // updateData 유효성 검사
    if (Object.keys(updateData).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: '수정할 데이터가 없습니다.' });
    }

    const result = await userService.updateUserProfile(userId, updateData);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '업데이트 성공',
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';

    return res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

// 유저 목록 조회
export const getUsers = async (req: Request, res: Response) => {
  try {
    // 쿼리 파라미터 추출 및 기본값 설정
    const userRole = req.query.user_role
      ? Number(req.query.user_role)
      : undefined;
    const approved = req.query.approved
      ? Number(req.query.approved)
      : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.page_size ? Number(req.query.page_size) : 10;

    // DTO 생성
    const userSearchDto: UserSearchDto = {
      userRole,
      approved,
      page,
      pageSize,
    };

    // 카멜케이스로 변환
    const convertedDto = formatting.toCamelCase(userSearchDto);

    // 서비스 레이어 호출
    const result = await userService.getUsers(convertedDto);

    // 성공 응답
    return res.status(200).json({
      success: true,
      message: '조회 성공',
      data: result.users,
      pagination: {
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.totalCount / result.pageSize),
      },
    });
  } catch (error) {
    // 에러 처리
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';
    return res.status(500).json({
      success: false,
      message: errorMessage,
    });
  }
};
