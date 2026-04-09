import { Router } from 'express';

import {
	archiveHabitController,
	createHabitController,
	deleteHabitController,
	getHabitsController,
	reorderHabitsController,
	updateHabitController
} from '../controllers/habits';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', getHabitsController);
router.post('/', createHabitController);
router.put('/:id', updateHabitController);
router.delete('/:id', deleteHabitController);
router.patch('/:id/archive', archiveHabitController);
router.post('/reorder', reorderHabitsController);

export default router;
