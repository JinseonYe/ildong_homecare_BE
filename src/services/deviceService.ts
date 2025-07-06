import * as deviceModel from '../models/deviceModel';
import * as formatting from '../utils/formatting';

// TODO: userId 대신 refreshtoken 받아서 유저 토큰이랑 비교할지 보고 수정완료하기
// 디바이스 정보 관리
export const processDeviceInfo = async (userId: any, deviceInfo: any) => {
  let result = false;
  const { deviceUUID, deviceType, osVersion, pushToken } = deviceInfo;
  try {
    // 유효성 검사
    if (!userId || !deviceUUID || !deviceType || !osVersion || !pushToken) {
      return false;
    }

    // 디바이스 정보 삽입 전 기존 디바이스 정보 조회
    let existDeviceInfo = await deviceModel.findDeviceInfoByUserId(
      userId,
      deviceUUID,
    );
    existDeviceInfo = formatting.toCamelCase(existDeviceInfo);

    // 만약 기존 디바이스 정보가 있다면
    if (existDeviceInfo.length > 0) {
      // 기존 디바이스 정보에 푸시 토큰만 업데이트
      result = await deviceModel.updateDeviceInfo(userId, deviceInfo);

      // 만약 기존 디바이스 정보가 없다면
    } else {
      // 디바이스 정보 삽입
      result = await deviceModel.insertDeviceInfo(userId, deviceInfo);
    }

    return result;
  } catch (error) {
    throw error;
  }
};
