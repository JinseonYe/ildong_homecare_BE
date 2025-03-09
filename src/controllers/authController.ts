import { Request, Response } from 'express';
import * as authService from '../services/authService';
import * as authModel from '../models/authModel';
import * as authMiddleware from '../middlewares/authMiddleware';

// 회원가입 API
export const register = async (req: Request, res: Response) => {
  const signupInfo = { ...req.body };

  try {
    const userCreationResult = await authService.createUserWithTransaction(
      signupInfo,
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
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';

    return res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

// Email 중복 확인 API
export const verifyEmailDuplication = async (req: Request, res: Response) => {
  const userEmail = req.body.userEmail;
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
    const errorMessage =
      error instanceof Error ? error.message : '서버 오류가 발생했습니다.';

    return res.status(500).send({
      success: false,
      message: errorMessage,
    });
  }
};

// 로그인 API
export const login = async (req: Request, res: Response) => {
  const { userEmail, password } = req.body;

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

    authModel.insertRefreshToken(refreshToken, userId); // db에 리프레시토큰 저장

    return res.status(200).send({
      success: true,
      message: '로그인 성공',
      data: {
        userId,
        userName,
      },
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .send({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};
