const SECRET_KEY = process.env.SECRET_KEY || 'your_jwt_secret'; // 환경변수 fallback 설정 이후에 도커환경으로 돌릴때 env 미포함

if (!SECRET_KEY) {
  throw new Error('[CONFIG ERROR] SECRET_KEY가 설정되지 않았습니다.');
}

export { SECRET_KEY };
