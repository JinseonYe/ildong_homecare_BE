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
      const admins = await userService.getAdmins()
      const buildingOwnerId = buildingInfo.user_id; // 건물주
      const buildingName = buildingInfo.building_name; // 건물명
      const userName = userInfo.user_name; // 건물명

      const title = `작업자: <${userName}> 님께서 건물명: <${buildingName}> 에 대한 작업내역이 등록하였습니다.`
      const content = "테스트중임"

      // 푸시 대상 userId 배열
      const targetUserIds = [buildingOwnerId, ...admins.map(a => a.user_id)];
      // FCM 토큰 수집
      let allTokens: string[] = [];
      for (const userId of targetUserIds) {
        const tokens = await deviceModel.findPushTokenInfoByUserId(userId);
        if (tokens && tokens.length > 0) {
          allTokens.push(...tokens.map((t: any) => t.push_token || t.pushToken));
        }
      }
      // 중복 제거
      allTokens = [...new Set(allTokens)].filter(Boolean);
      if (allTokens.length > 0) {
        await pushService.sendFCMNotification(
          allTokens,
          title,
          content
        );
      }
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
    const page = requestQueryToCamel.page;
    const pageSize = requestQueryToCamel.pageSize;
    const startDate = requestQueryToCamel.startDate;
    const endDate = requestQueryToCamel.endDate;
    const careReportSearchDto = {
      buildingName,
      page,
      pageSize,
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

    const result = await careReportService.getCareReportById(
      careReportId,
    );

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

export const updateCareReport = async (req: Request, res: Response) => {
  try {
    const updateData = req.body;
    const careReportId = req.params.careReportId;

    // 작업내역 ID 가 포함되었는지 확인
    if (!careReportId) {
      return res.status(400).send({
        success: false,
        message: '작업내역 ID가 필요합니다.',
      });
    }

    const isUpdate = await careReportService.updateCareReport(careReportId, updateData);

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