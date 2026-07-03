import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboard.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/stats', authenticate, authorize('ADMIN', 'RESEARCHER'), getDashboardStats);

export default router;
