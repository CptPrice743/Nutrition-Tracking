import { Router } from 'express';

import { getHabitLogsController, upsertHabitLogController } from '../controllers/habitLogs';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getHabitLogsController);
router.post('/', upsertHabitLogController);

export default router;
