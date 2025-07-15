import { Request, Response } from 'express';
import * as careReportService from '../services/careReportService';
import * as formatting from '../utils/formatting';
import * as userService from '../services/userService';
import * as pushService from '../services/pushService';
import * as deviceModel from '../models/deviceModel';

// 작업내역 등록하기
export const createCareReport = async (req: Request, res: Response) => {
  const body = req.body;
  const buildingId = req.body.buildingId;
  const userId = req.body.userId;
  const originalFiles = req.files;
  let files: string[] = [];

  if (Array.isArray(originalFiles)) {
    files = originalFiles.map((originalFile) => originalFile.path);
  } else {
    console.log('파일이 업로드되지 않았습니다.');
  }

  try {
    const result = await careReportService.createCareReport(body, files);

    if (result) {
      // 빌딩 정보 조회
      const buildingInfo = await userService.getBuildingInfo(buildingId);
      const userInfo = await userService.getUserInfo(userId);
      const admins = await userService.getAdmins();
      const buildingOwnerId = buildingInfo.user_id; // 건물주
      const buildingName = buildingInfo.building_name; // 건물명
      const userName = userInfo.user_name; // 건물명

      // 푸시 알림 시 필요한 정보들
      const title = `작업자: <${userName}> 님께서 건물명: <${buildingName}> 에 대한 작업내역이 등록하였습니다.`;
      const content = '테스트중임';

      // 푸시 대상 userId 배열
      const targetUserIds = [buildingOwnerId, ...admins.map((a) => a.user_id)];
      const pushType = 'report';

      // 푸시 알람 전송
      await pushService.sendPushProcess(
        targetUserIds,
        title,
        content,
        pushType,
      );

      return res.status(201).send({
        success: true,
        message: '작업 내역 등록을 성공했습니다.',
      });
    }
  } catch (error) {
    console.log('작업 내역 등록 실패: ', error);
    return res.status(500).send({
      success: false,
      message: '서버 오류로 작업 내역 등록 실패',
    });
  }
};

// 작업 상태 조회하기
export const getAllCareStatus = async (req: Request, res: Response) => {
  try {
    const result = await careReportService.getAllCareStatus();

    if (result) {
      return res.status(200).send({
        success: true,
        message: '작업 상태 조회를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    console.log('작업 상태 조회 실패: ', error);
    return res.status(500).send({
      success: false,
      message: '서버 오류로 작업 상태 조회 실패',
    });
  }
};

// 작업 내역 조회하기
export const getCareReports = async (req: Request, res: Response) => {
  try {
    const requestQuery = req.query;
    const requestQueryToCamel = formatting.toCamelCase(requestQuery);
    const buildingName = requestQueryToCamel.buildingName;
    const startDate = requestQueryToCamel.startDate;
    const endDate = requestQueryToCamel.endDate;
    const careReportSearchDto = {
      buildingName,
      startDate,
      endDate,
    };

    const result = await careReportService.getCareReports(careReportSearchDto);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '작업 내역 조회를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    console.log('작업 내역 조회 실패: ', error);
    return res.status(500).send({
      success: false,
      message: '서버 오류로 작업 내역 조회 실패',
    });
  }
};

// Id별로 작업 내역 조회하기
export const getCareReportById = async (req: Request, res: Response) => {
  try {
    const requestQuery = req.query;
    const requestQueryToCamel = formatting.toCamelCase(requestQuery);
    const careReportId = requestQueryToCamel.careReportId;

    if (!careReportId) {
      return res.status(400).send({
        success: false,
        message: 'careReportId는 필수 입력값입니다.',
      });
    }

    const result = await careReportService.getCareReportById(careReportId);

    if (result) {
      return res.status(200).send({
        success: true,
        message: '작업 내역 조회를 성공했습니다.',
        data: result,
      });
    }
  } catch (error) {
    console.log('작업 내역 조회 실패: ', error);
    return res.status(500).send({
      success: false,
      message: '서버 오류로 작업 내역 조회 실패',
    });
  }
};

// 작업 내역 수정하기
export const updateCareReport = async (req: Request, res: Response) => {
  try {
    const { files, fileNameUrl, ...updateData } = req.body;
    const careReportId = req.params.careReportId;
    const originalFiles = req.files;
    let filePaths: string[] = [];

    if (Array.isArray(originalFiles)) {
      filePaths = originalFiles.map((originalFile) => originalFile.path);
    } else {
      console.log('파일이 업로드되지 않았습니다.');
    }

    // 작업내역 ID 가 포함되었는지 확인
    if (!careReportId) {
      return res.status(400).send({
        success: false,
        message: '작업내역 ID가 필요합니다.',
      });
    }

    // 작업 내역 업데이트하기
    const isUpdate = await careReportService.updateCareReport(
      careReportId,
      updateData,
      filePaths,
    );

    if (isUpdate) {
      const result = await careReportService.getCareReportById(careReportId);

      if (result) {
        return res.status(200).send({
          success: true,
          message: '작업 내역 수정을 성공했습니다.',
          data: result,
        });
      }
    }
  } catch (error) {
    console.log('작업 내역 수정 실패: ', error);
    return res.status(500).send({
      success: false,
      message: '서버 오류로 작업 내역 수정 실패',
    });
  }
};
