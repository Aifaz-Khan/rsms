import { Router } from 'express';
import { getSurveyAnalytics, getPrimaryScores, getFrequencyDistribution } from '../controllers/analytics.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/surveys/:surveyId', authenticate, authorize('ADMIN', 'RESEARCHER'), getSurveyAnalytics);
router.get('/primary-scores', authenticate, authorize('ADMIN', 'RESEARCHER'), getPrimaryScores);
router.get('/frequency-distribution', authenticate, authorize('ADMIN', 'RESEARCHER'), getFrequencyDistribution);

export default router;
