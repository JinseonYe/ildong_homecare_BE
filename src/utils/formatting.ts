// 카멜케이스를 스네이크케이스로 변환하는 메소드
export const toSnakeCase = <T>(data: T): T => {
  if (Array.isArray(data)) {
    // 배열의 경우, 각 요소에 대해 재귀적으로 toSnakeCase 적용
    return data.map((item) => toSnakeCase(item)) as T;
  } else if (data !== null && typeof data === 'object') {
    // 객체의 경우, 각 키에 대해 스네이크 케이스 변환 적용
    const newObj: Record<string, any> = {};
    for (const key in data) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      newObj[snakeKey] = toSnakeCase((data as Record<string, any>)[key]); // 속성 값에 대해서도 재귀 호출
    }
    return newObj as T;
  } else if (typeof data === 'string') {
    // 문자열의 경우 스네이크 케이스 변환 적용
    return data.replace(/([A-Z])/g, '_$1').toLowerCase() as T;
  } else {
    // 배열, 객체, 문자열이 아닌 경우 변환 없이 반환
    return data;
  }
};

// 스네이크케이스를 카멜케이스로 변환하는 메소드 (특정 필드는 value 변환 제외 가능)
export const toCamelCase = <T>(data: T, excludeFields: string[] = []): T => {
  if (Array.isArray(data)) {
    // 배열의 경우, 각 요소에 대해 재귀적으로 toCamelCase 적용
    return data.map((item) => toCamelCase(item, excludeFields)) as T;
  } else if (data !== null && typeof data === 'object') {
    // Date 객체는 변환 없이 그대로 반환
    if (data instanceof Date) {
      return convertingTime(data) as T;
    }

    // 객체의 경우, 각 키에 대해 카멜 케이스 변환 적용
    const newObj: Record<string, any> = {};
    for (const key in data) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) =>
        letter.toUpperCase(),
      );

      // 제외 필드는 key는 변환하되, value는 그대로 유지
      if (excludeFields.includes(key)) {
        newObj[camelKey] = (data as Record<string, any>)[key];
      } else {
        newObj[camelKey] = toCamelCase(
          (data as Record<string, any>)[key],
          excludeFields,
        ); // 속성 값에 대해서도 재귀 호출
      }
    }
    return newObj as T;
  } else if (typeof data === 'string') {
    // 문자열의 경우 카멜 케이스 변환 적용
    return data.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()) as T;
  } else {
    // 배열, 객체, 문자열이 아닌 경우 변환 없이 반환
    return data;
  }
};

// New Date() 를 DB에서 사용할 수 있는 스트링 형식으로 변환
// ex) 2025-01-01T00:00:00.000Z -> 2025-01-01 00:00:00
export const convertingTime = (date: Date) => {
  const convertedTime = date.toISOString().slice(0, 19).replace('T', ' ');

  return convertedTime;
};
