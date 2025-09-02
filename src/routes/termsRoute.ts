import express from 'express';
import * as termsController from '../controllers/termsController';

const router = express.Router();

router.get('/api/terms/privacy', termsController.getTerms);

export default router;
