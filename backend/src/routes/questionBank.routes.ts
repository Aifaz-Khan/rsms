import { Router } from 'express';
import { getQuestionBank, addToQuestionBank, deleteFromQuestionBank } from '../controllers/questionBank.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, getQuestionBank);
router.post('/', authenticate, authorize('ADMIN', 'RESEARCHER'), addToQuestionBank);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteFromQuestionBank);

export default router;
