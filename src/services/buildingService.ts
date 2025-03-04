import * as buildingModel from '../models/buildingModel';
import * as formatting from '../utils/formatting';
import * as generateQuery from '../utils/generateQuery';

// 건물 등록하기
export const createBuilding = async (buildingInfo: any) => {
  try {
    const result = await buildingModel.insertBuildingInfo(buildingInfo);
    if (result.affectedRows > 0) {
      return true;
    } else {
      return false;
    }
  } catch (error) {}
};

// 건물 전체 조회 하기
export const getAllBuilding = async () => {
  try {
    let result = await buildingModel.fetchAllBuildingInfo();
    result = formatting.toCamelCase(result);
    if (result.length > 0) {
      return result;
    } else {
      return false;
    }
  } catch (error) {}
};

// 건물 ID 별로 조회 하기
export const fetchBuildingById = async (buildingId: any) => {
  try {
    let result = await buildingModel.fetchBuildingById(buildingId);
    result = formatting.toCamelCase(result);
    if (result.length > 0) {
      return result;
    } else {
      return false;
    }
  } catch (error) {}
};

// 건물 정보 업데이트하기
export const updateBuilding = async (buildingId: any, updateData: any) => {
  try {
    const { setQuery, values } = generateQuery.generateUpdateQuery(updateData);
    let result = await buildingModel.updateBuilding(
      buildingId,
      setQuery,
      values,
    );

    if (result.affectedRows > 0) {
      return true;
    } else {
      return false; // 업데이트된 행이 없음
    }
  } catch (error) {}
};

// 건물 삭제하기
export const deleteBuilding = async (buildingId: any) => {
  try {
    let result = await buildingModel.deleteBuilding(buildingId);

    if (result) {
      return true;
    } else {
      return false;
    }
  } catch (error) {}
};
