import { Router } from 'express';
import { getParticipantToken } from '../controllers/response.controller';

const router = Router();

router.post('/token', getParticipantToken);

export default router;
