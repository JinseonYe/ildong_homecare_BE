import { Request, Response } from 'express';
import * as userService from '../services/userService';

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
