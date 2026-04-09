import { Router } from 'express';

import { updateMeController } from '../controllers/users';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);
router.put('/me', updateMeController);

export default router;