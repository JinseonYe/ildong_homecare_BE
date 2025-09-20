import {
  NotFoundError,
  BadRequest,
  InternalServerError,
} from '../errors/httpError';
import { pool } from '../config/db';
import * as buildingModel from '../models/buildingModel';
import * as formatting from '../utils/formatting';
import * as generateQuery from '../utils/generateQuery';
import * as fileService from '../services/fileService';

// 건물 등록하기
export const createBuilding = async (buildingInfo: any, files: any) => {
  let conn;
  try {
    const createdAt = new Date();
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const result = await buildingModel.insertBuildingInfo(conn, buildingInfo);
    if (result.affectedRows === 0) {
      throw new NotFoundError('작업 내역 삽입 실패');
    }

    const buildingId = result.insertId; // 생성된 `building_id`
    const targetType = 'building';

    // 파일 정보 삽입
    await fileService.insertFileInfos(
      conn,
      files,
      buildingId,
      targetType,
      createdAt,
    );

    await conn.commit(); // 성공 시 커밋
    return true;
  } catch (error) {
    if (conn) await conn.rollback(); // 에러 발생 시 롤백
    throw new InternalServerError(`${error}`);
  } finally {
    if (conn) conn.release();
  }
};

// 건물 전체 조회 하기
export const getAllBuilding = async () => {
  try {
    let result = await buildingModel.fetchAllBuildingInfo();
    if (result && result.length > 0) {
      result = formatting.toCamelCase(result);
      return result;
    } else {
      return false;
    }
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};

// 건물 ID 별로 조회 하기
export const fetchBuildingById = async (buildingId: any) => {
  try {
    let result = await buildingModel.fetchBuildingById(buildingId);
    if (result && result.length > 0) {
      result = formatting.toCamelCase(result);
      return result;
    } else {
      return false;
    }
  } catch (error) {
    throw new InternalServerError(`${error}`);
  }
};

// 건물 정보 업데이트하기
export const updateBuilding = async (
  buildingId: any,
  updateData: any,
  files: any,
) => {
  let conn;

  try {
    const updatedAt = new Date();
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작

    const { setQuery, values } = generateQuery.generateUpdateQuery(updateData);
    let result = await buildingModel.updateBuilding(
      conn,
      buildingId,
      setQuery,
      values,
      updatedAt,
    );

    if (result.affectedRows === 0) {
      throw new NotFoundError('건물 정보 수정 실패');
    }

    const targetType = 'building';
    const fileDeletedResult = await fileService.softDeleteDocumentInfo(
      conn,
      buildingId,
      targetType,
    );

    // 파일 정보 수정
    await fileService.insertFileInfos(
      conn,
      files,
      buildingId,
      targetType,
      updatedAt,
    );

    await conn.commit(); // 성공 시 커밋
    return true;
  } catch (error) {
    if (conn) await conn.rollback(); // 에러 발생 시 롤백
    throw new InternalServerError(`${error}`);
  } finally {
    if (conn) conn.release();
  }
};

// 건물 삭제하기
export const deleteBuilding = async (buildingId: any) => {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.beginTransaction(); // 트랜잭션 시작
    let result = await buildingModel.deleteBuilding(conn, buildingId);

    if (!result) {
      throw new NotFoundError('건물 정보 삭제 실패');
    }

    const targetType = 'building';
    const fileDeletedResult = await fileService.softDeleteDocumentInfo(
      conn,
      buildingId,
      targetType,
    );

    await conn.commit(); // 성공 시 커밋
    return true;
  } catch (error) {
    if (conn) await conn.rollback(); // 에러 발생 시 롤백
    throw new InternalServerError(`${error}`);
  } finally {
    if (conn) conn.release();
  }
};
