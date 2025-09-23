import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/authService';
import * as authModel from '../models/authModel';
import * as authMiddleware from '../middlewares/authMiddleware';
import * as deviceService from '../services/deviceService';
import * as userModel from '../models/userModel';
import { logger } from '../middlewares/loggingMiddleware';

// 회원가입 API
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const signupInfo = { ...req.body };
  const originalFiles = req.files;
  let files: string[] = [];

  if (Array.isArray(originalFiles)) {
    files = originalFiles.map((originalFile) => originalFile.path);
  } else {
    logger.info('파일이 업로드되지 않았습니다.');
  }

  try {
    const userCreationResult = await authService.createUserWithTransaction(
      signupInfo,
      files,
    );

    // 회원 생성
    if (userCreationResult.success) {
      return res.status(201).send({
        success: true,
        message: '회원가입 성공',
      });
    } else {
      return res.status(400).send({
        success: false,
        message: '회원가입에 실패했습니다.',
      });
    }
  } catch (error) {
    next(error);
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';

    return res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

// Email 중복 확인 API
export const verifyEmailDuplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userEmail: any = req.query.userEmail;
  try {
    const isUserEmailAvailable = await authService.isUserEmailAvailable(
      userEmail,
    );

    if (!isUserEmailAvailable) {
      return res.status(400).send({
        success: false,
        message: '이미 존재하는 Email 입니다.',
      });
    } else {
      return res.status(200).send({
        success: true,
        message: '사용할 수 있는 Email입니다.',
      });
    }
  } catch (error) {
    next(error);
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';

    return res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

// 로그인 API
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { userEmail, password, deviceInfo } = req.body;

  try {
    // 이메일이 일치하는 사용자가 있는지 확인
    const user = await authService.findUserByIdService(userEmail);

    if (!user) {
      return res
        .status(400)
        .send({ success: false, message: '사용자를 찾을 수 없습니다.' });
    }

    const { userId, userName, password: storedHashedPassword } = user[0]; // 비밀번호 해시와 사용자 이름 가져오기

    // 비밀번호가 일치하는지 확인
    const isMatch = await authService.comparePassword(
      password,
      storedHashedPassword,
    );
    if (!isMatch) {
      return res
        .status(400)
        .send({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    // 로그인한 유저별 디바이스 정보 관리
    let deviceId = '';
    if (deviceInfo) {
      const isDeviceInfoProcessed = await deviceService.processDeviceInfo(
        userId,
        deviceInfo,
      );

      if (!isDeviceInfoProcessed) {
        return res.status(400).send({
          success: false,
          message: '디바이스 정보 처리에 실패했습니다.',
        });
      }
      deviceId = deviceInfo.deviceUUID || '';
    }

    const userInfo = await userModel.findUserById(userId);
    if (!userInfo || userInfo.length === 0) {
      return res.status(400).send({
        success: false,
        message: '유저 정보를 찾을 수 없습니다.',
      });
    }
    const userRole = userInfo[0].user_role;

    const secretKey = process.env.SECRET_KEY ?? '';
    const R_secretKey = process.env.R_SECRET_KEY ?? '';
    const token = authMiddleware.createToken(
      { userId, userName, userEmail },
      secretKey,
      '1d',
    );
    const refreshToken = authMiddleware.createToken(
      { userId, userName, userEmail },
      R_secretKey,
      '30d',
    );

    res.setHeader('authorization', `Bearer ${token}`);
    res.setHeader('refresh', `Bearer ${refreshToken}`);

    authModel.insertOrUpdateRefreshToken(refreshToken, userId, deviceId); // db에 리프레시토큰 upsert

    return res.status(200).send({
      success: true,
      message: '로그인 성공',
      data: {
        userId,
        userName,
        userRole,
      },
    });
  } catch (error) {
    next(error);
  }
};
