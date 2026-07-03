import { Router } from 'express';
import { getParticipantToken, startResponse, saveAnswers, submitResponse, getResponses, getResponseById, deleteResponse } from '../controllers/response.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Participant routes (no auth required)
router.post('/token', getParticipantToken);
router.post('/start', startResponse);
router.post('/save', saveAnswers);
router.post('/submit', submitResponse);

// Admin routes
router.get('/', authenticate, authorize('ADMIN', 'RESEARCHER'), getResponses);
router.get('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), getResponseById);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteResponse);

export default router;
