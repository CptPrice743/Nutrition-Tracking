import { Router } from 'express';

import { getDashboardLayoutController, saveDashboardLayoutController } from '../controllers/dashboard';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/layout', getDashboardLayoutController);
router.put('/layout', saveDashboardLayoutController);

export default router;
