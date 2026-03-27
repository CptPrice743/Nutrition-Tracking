import { Router } from 'express';
import multer from 'multer';

import {
	confirmCsvImportController,
	exportUserDataController,
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
router.post('/import/csv', upload.single('file'), previewCsvImportController);
router.post('/import/csv/confirm', confirmCsvImportController);

export default router;
