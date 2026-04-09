import { Router } from 'express';

import {
	createSessionController,
	deleteSessionController
} from '../controllers/auth';

const router = Router();

router.post('/auth/session', createSessionController);
router.delete('/auth/session', deleteSessionController);

export default router;
