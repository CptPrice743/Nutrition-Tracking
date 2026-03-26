import { Router } from 'express';

import { createSessionController, deleteSessionController } from '../controllers/auth';

const router = Router();

router.post('/session', createSessionController);
router.delete('/session', deleteSessionController);

export default router;
