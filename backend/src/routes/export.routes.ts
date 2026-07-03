import { Router } from 'express';
import { exportCSV, exportExcel } from '../controllers/export.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/surveys/:surveyId/csv', authenticate, authorize('ADMIN', 'RESEARCHER'), exportCSV);
router.get('/surveys/:surveyId/excel', authenticate, authorize('ADMIN', 'RESEARCHER'), exportExcel);

export default router;
