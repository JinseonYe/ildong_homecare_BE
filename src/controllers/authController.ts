import { Request, Response } from 'express';
import * as authService from '../services/authService';

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
