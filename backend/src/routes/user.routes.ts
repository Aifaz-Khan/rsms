import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser, toggleUserStatus } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', authenticate, authorize('ADMIN'), getUsers);
router.post('/', authenticate, authorize('ADMIN'), createUser);
router.put('/:id', authenticate, authorize('ADMIN'), updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), deleteUser);
router.patch('/:id/toggle-status', authenticate, authorize('ADMIN'), toggleUserStatus);

export default router;
