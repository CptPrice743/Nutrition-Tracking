import { Router } from 'express';

import {
	createSessionController,
	deleteSessionController,
	updateMeController
} from '../controllers/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/auth/session', createSessionController);
router.delete('/auth/session', deleteSessionController);
router.put('/users/me', requireAuth, updateMeController);

export default router;
