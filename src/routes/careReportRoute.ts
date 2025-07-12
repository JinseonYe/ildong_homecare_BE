import express from 'express';
import * as careReportController from '../controllers/careReportController';
import * as uploadMiddleware from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post(
  '/api/care-report',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  careReportController.createCareReport,
);
router.get('/api/care-reports', careReportController.getCareReports);
router.get('/api/care-report', careReportController.getCareReportById);
router.patch(
  '/api/care-report/:careReportId',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  careReportController.updateCareReport,
);
router.get('/api/care-status', careReportController.getAllCareStatus);

export default router;
