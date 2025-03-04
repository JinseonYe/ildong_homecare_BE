import express from 'express';
import * as buildingController from '../controllers/buildingController';

const router = express.Router();

router.post('/api/building', buildingController.createBuilding);
router.get('/api/building', buildingController.getAllBuilding);
router.patch('/api/building/:buildingId', buildingController.updateBuilding);
router.delete('/api/building/:buildingId', buildingController.deleteBuilding);

export default router;
