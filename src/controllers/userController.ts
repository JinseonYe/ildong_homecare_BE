import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import {
  UserSearchDto,
  UserSearchKeywordDto,
} from '../interfaces/userInterface';
import * as formatting from '../utils/formatting';
import { NotFoundError } from '../errors/httpError';
import { logger } from '../middlewares/loggingMiddleware';

// 유저 프로필 업데이트
export const updateUserProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { files, fileNameUrl, ...updateData } = req.body;
  const { userId } = req.params;
  const originalFiles = req.files;
  let filePaths: string[] = [];

  if (Array.isArray(originalFiles)) {
    filePaths = originalFiles.map((originalFile) => originalFile.path);
  } else {
    logger.info('파일이 업로드되지 않았습니다.');
  }

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

    const result = await userService.updateUserProfile(
      userId,
      updateData,
      filePaths,
    );

    const fetchedData = await userService.getUserById(userId);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '업데이트 성공',
        data: fetchedData,
      });
    }
  } catch (error) {
    next(error);
  }
};

// 유저 목록 조회
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 쿼리 파라미터 추출 및 기본값 설정
    const userRole = req.query.userRole
      ? Number(req.query.userRole)
      : undefined;
    const approved = req.query.approved
      ? Number(req.query.approved)
      : undefined;
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 10;

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

    if (result) {
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
    } else {
      return res.status(404).json({
        success: false,
        message: '조회 결과가 없습니다.',
        data: [],
        pagination: null,
      });
    }
  } catch (error) {
    next(error);
  }
};

// 유저 목록 조회
export const getUsersByKeyword = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const fieldsQuery = req.query.fields ? String(req.query.fields) : '';
    const fieldsArray = fieldsQuery
      .split(',')
      .map((f) => f.trim()) // 공백 제거
      .filter((f) => f !== ''); // 빈 문자열 제거

    const keyword = req.query.keyword ? String(req.query.keyword) : undefined;

    const userSearchDto: UserSearchKeywordDto = {
      fields: fieldsArray.length > 0 ? fieldsArray : undefined,
      keyword,
    };

    const result = await userService.getUsersByKeyword(userSearchDto);

    if (result) {
      return res.status(200).json({
        success: true,
        message: '조회 성공',
        data: result,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: '조회 결과가 없습니다.',
        data: [],
      });
    }
  } catch (error) {
    next(error);
  }
};

// id별로 유저 조회
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    // 쿼리 파라미터 추출 및 기본값 설정
    let userId = req.query.userId;
    // 카멜케이스로 변환
    userId = formatting.toCamelCase(userId);

    const result = await userService.getUserById(userId);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '회원 조회를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

// 회원 탈퇴 (관리자 또는 로그인 사용자 기준)
export const deleteUserById = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userId } = req.params;

  try {
    // userId 유효성 검사
    if (!userId || isNaN(Number(userId))) {
      return res.status(400).json({
        success: false,
        message: '유효한 userId가 필요합니다.',
      });
    }

    const deleted = await userService.deleteUserById(Number(userId));

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '삭제할 사용자를 찾을 수 없습니다.',
      });
    }

    return res.status(200).json({
      success: true,
      message: '회원 탈퇴가 완료되었습니다.',
    });
  } catch (error) {
    next(error);
  }
};
