import express from 'express';
import * as buildingController from '../controllers/buildingController';
import * as uploadMiddleware from '../middlewares/uploadMiddleware';

const router = express.Router();

router.post(
  '/api/building',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  buildingController.createBuilding,
);
router.get('/api/building', buildingController.getAllBuilding);
router.patch(
  '/api/building/:buildingId',
  uploadMiddleware.uploadToLocalMiddleware,
  uploadMiddleware.uploadToLocal,
  buildingController.updateBuilding,
);
router.delete('/api/building/:buildingId', buildingController.deleteBuilding);

export default router;
