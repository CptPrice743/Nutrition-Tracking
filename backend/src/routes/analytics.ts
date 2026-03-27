import { Router } from 'express';

import { getWeeklyAnalyticsController } from '../controllers/analytics';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.get('/weekly', getWeeklyAnalyticsController);

export default router;
