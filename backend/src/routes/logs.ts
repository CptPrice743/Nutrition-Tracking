import { Router } from 'express';

import {
	createLogController,
	getLogByDateController,
	getLogsController,
	updateLogController
} from '../controllers/logs';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getLogsController);
router.post('/', createLogController);
router.get('/:date', getLogByDateController);
router.put('/:date', updateLogController);

export default router;
