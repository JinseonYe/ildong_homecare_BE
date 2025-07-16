import { Request, Response, NextFunction } from 'express';
import * as buildingService from '../services/buildingService';

// 건물 등록하기
export const createBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const buildingInfo = req.body;
  const originalFiles = req.files;
  let files: string[] = [];

  if (Array.isArray(originalFiles)) {
    files = originalFiles.map((originalFile) => originalFile.path);
  } else {
    console.log('파일이 업로드되지 않았습니다.');
  }

  try {
    const result = await buildingService.createBuilding(buildingInfo, files);

    if (result) {
      return res.status(201).send({
        success: true,
        message: '건물 등록을 성공했습니다.',
      });
    }
  } catch (error) {
    next(error);
  }
};

// 건물 전체 조회하기
export const getAllBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await buildingService.getAllBuilding();

    if (result) {
      return res.status(200).send({
        success: true,
        message: '건물 전체 조회를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

// 건물 정보 업데이트하기
export const updateBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { files, fileNameUrl, ...updateData } = req.body;
  const buildingId = req.params.buildingId;
  const originalFiles = req.files;
  let filePaths: string[] = [];
  let result;

  if (Array.isArray(originalFiles)) {
    filePaths = originalFiles.map((originalFile) => originalFile.path);
  } else {
    console.log('파일이 업로드되지 않았습니다.');
  }

  try {
    // 건믈 ID 가 포함되었는지 확인
    if (!buildingId) {
      return res.status(400).send({
        success: false,
        message: '건물 ID가 필요합니다.',
      });
    }

    // 건물 정보 업데이트하기
    const isUpdate = await buildingService.updateBuilding(
      buildingId,
      updateData,
      filePaths,
    );

    // 업데이트 성공 시 id별로 건물 정보 조회 데이터 반환
    // TODO: 전체 건물 정보 조회할지 id별로 건물 조회할지 상의 후 수정
    if (isUpdate) {
      result = await buildingService.fetchBuildingById(buildingId);
    } else {
      return res.status(400).send({
        success: false,
        message: '업데이트할 건물 정보가 존재하는지 확인하세요.',
      });
    }

    if (result) {
      return res.status(200).send({
        success: true,
        message: '건물 업데이트를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    next(error);
  }
};

// 건물 삭제하기
export const deleteBuilding = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const buildingId = req.params.buildingId;

  try {
    const result = await buildingService.deleteBuilding(buildingId);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '건물을 성공적으로 삭제했습니다.',
      });
    }
  } catch (error) {
    next(error);
  }
};
