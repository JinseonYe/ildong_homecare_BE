import app from './app';
import http from 'http';
import dotenv from 'dotenv';
import fcmConnection from './services/fcmService';

dotenv.config();

fcmConnection();

const httpServer = http.createServer(app);

const BACKEND_PORT = parseInt(process.env.BACKEND_PORT || '51111', 10);

httpServer.listen(BACKEND_PORT, '0.0.0.0', () => {
  console.log(`HTTP Server running on port ${BACKEND_PORT}!`);
});
