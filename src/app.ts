import express from 'express';
import cors from 'cors';
import buildingRoute from './routes/buildingRoute';
import careReportRoute from './routes/careReportRoute';
import authRoute from './routes/authRoute';
import pushRoute from './routes/pushRoute';
import userRoute from './routes/userRoute';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

// ES 모듈에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors({ origin: '*' })); // 모든 요청 허용 (보안 강화 필요) ex) app.use(cors({ origin: 'https://my-mobile-app.com' }));
app.use(express.json());

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'))); // 파일 저장 경로
app.use('/', buildingRoute);
app.use('/', careReportRoute);
app.use('/', authRoute);
app.use('/', pushRoute);
app.use('/', userRoute);

export default app;
