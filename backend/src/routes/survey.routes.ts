import { Router } from 'express';
import { getSurveys, getSurveyById, getSurveyBySlug, createSurvey, updateSurvey, deleteSurvey, duplicateSurvey, getSurveyQRCode, publishSurvey, archiveSurvey } from '../controllers/survey.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getSurveys);
router.get('/slug/:slug', getSurveyBySlug);
router.get('/:id', authenticate, getSurveyById);
router.post('/', authenticate, authorize('ADMIN', 'RESEARCHER'), createSurvey);
router.put('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), updateSurvey);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteSurvey);
router.post('/:id/duplicate', authenticate, authorize('ADMIN', 'RESEARCHER'), duplicateSurvey);
router.get('/:id/qrcode', authenticate, getSurveyQRCode);
router.patch('/:id/publish', authenticate, authorize('ADMIN', 'RESEARCHER'), publishSurvey);
router.patch('/:id/archive', authenticate, authorize('ADMIN'), archiveSurvey);

export default router;
