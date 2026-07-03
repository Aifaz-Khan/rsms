import { Router } from 'express';
import {
  getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
  addOption, updateOption, deleteOption, reorderOptions,
  setSurveyLogic, deleteSurveyLogic,
} from '../controllers/question.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getQuestions);
router.post('/', authenticate, authorize('ADMIN', 'RESEARCHER'), createQuestion);
router.put('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), updateQuestion);
router.delete('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), deleteQuestion);
router.post('/reorder', authenticate, authorize('ADMIN', 'RESEARCHER'), reorderQuestions);

router.post('/:questionId/options', authenticate, authorize('ADMIN', 'RESEARCHER'), addOption);
router.put('/:questionId/options/:optionId', authenticate, authorize('ADMIN', 'RESEARCHER'), updateOption);
router.delete('/:questionId/options/:optionId', authenticate, authorize('ADMIN', 'RESEARCHER'), deleteOption);
router.post('/:questionId/options/reorder', authenticate, authorize('ADMIN', 'RESEARCHER'), reorderOptions);

router.post('/logic', authenticate, authorize('ADMIN', 'RESEARCHER'), setSurveyLogic);
router.delete('/logic/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), deleteSurveyLogic);

export default router;
