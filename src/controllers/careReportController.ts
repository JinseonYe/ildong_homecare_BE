import { Request, Response } from 'express';
import * as careReportService from '../services/careReportService';
import * as formatting from '../utils/formatting';

// 작업내역 등록하기
export const createCareReport = async (req: Request, res: Response) => {
  const body = req.body;
  const originalFiles = req.files;
  let files: string[] = [];

  console.log('originalFiles', originalFiles);

  if (Array.isArray(originalFiles)) {
    files = originalFiles.map((originalFile) => originalFile.path);
  } else {
    console.log('파일이 업로드되지 않았습니다.');
  }

  try {
    const result = await careReportService.createCareReport(body, files);

    if (result) {
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
    const userId = requestQueryToCamel.userId;
    const careReportSearchDto = {
      careReportId,
      userId,
    };

    if (!careReportId || !userId) {
      return res.status(400).send({
        success: false,
        message: 'careReportId와 userId는 필수 입력값입니다.',
      });
    }

    const result = await careReportService.getCareReportById(
      careReportSearchDto,
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
