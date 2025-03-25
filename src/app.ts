import express from 'express';
import cors from 'cors';
import buildingRoute from './routes/buildingRoute';
import careReportRoute from './routes/careReportRoute';
import authRoute from './routes/authRoute';
import fcmRoute from './routes/fcmRoute';
import userRoute from './routes/userRooute';

const app = express();

app.use(cors({ origin: '*' })); // 모든 요청 허용 (보안 강화 필요) ex) app.use(cors({ origin: 'https://my-mobile-app.com' }));
app.use(express.json());
app.use('/', buildingRoute);
app.use('/', careReportRoute);
app.use('/', authRoute);
app.use('/', fcmRoute);
app.use('/', userRoute);

export default app;
