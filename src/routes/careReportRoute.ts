import express from 'express';
import * as careReportController from '../controllers/careReportController';
import * as uploadMiddleware from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post(
  '/api/care-report',
  uploadMiddleware.uploadMiddleware,
  uploadMiddleware.uploadToFirebase,
  careReportController.createCareReport,
);
router.get('/api/care-status', careReportController.getAllCareStatus);
router.get('/api/care-reports', careReportController.getCareReports);

export default router;
