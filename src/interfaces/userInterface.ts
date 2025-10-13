// DTO 인터페이스 정의
export interface UserSearchDto {
  userRole?: number;
  approved?: number;
  page?: number;
  pageSize?: number;
}

// DTO keyword 인터페이스 정의
export interface UserSearchKeywordDto {
  fields?: string[]; // 검색 대상 컬럼 배열
  keyword?: string; // 검색어
}
