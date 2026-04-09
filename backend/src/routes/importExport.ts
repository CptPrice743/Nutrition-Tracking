import { Router } from 'express';
import multer from 'multer';

import {
	confirmHabitImportController,
	confirmCsvImportController,
	downloadImportTemplate,
	exportUserDataController,
	previewHabitDefinitionsController,
	previewHabitLogsController,
	previewCsvImportController
} from '../controllers/importExport';
import { requireAuth } from '../middleware/auth';

const router = Router();

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
	fileFilter: (_req, file, cb) => {
		if (file.originalname.toLowerCase().endsWith('.csv')) {
			cb(null, true);
			return;
		}
		cb(new Error('Only .csv files are allowed'));
	}
});

router.use(requireAuth);

router.get('/export', exportUserDataController);
router.get('/import/template', requireAuth, downloadImportTemplate);
router.post('/import/csv', upload.single('file'), previewCsvImportController);
router.post('/import/csv/confirm', confirmCsvImportController);
router.post('/import/habits/definitions/preview', upload.single('file'), previewHabitDefinitionsController);
router.post('/import/habits/logs/preview', upload.single('file'), previewHabitLogsController);
router.post('/import/habits/confirm', confirmHabitImportController);

export default router;
