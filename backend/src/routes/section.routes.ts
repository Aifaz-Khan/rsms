import { Router } from 'express';
import { getSections, createSection, updateSection, deleteSection, reorderSections } from '../controllers/section.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/', authenticate, getSections);
router.post('/', authenticate, authorize('ADMIN', 'RESEARCHER'), createSection);
router.put('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), updateSection);
router.delete('/:id', authenticate, authorize('ADMIN', 'RESEARCHER'), deleteSection);
router.post('/reorder', authenticate, authorize('ADMIN', 'RESEARCHER'), reorderSections);

export default router;
