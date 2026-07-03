import { Router } from 'express';
import { getSurveyAnalytics } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/surveys/:surveyId', authenticate, authorize('ADMIN', 'RESEARCHER'), getSurveyAnalytics);

export default router;
