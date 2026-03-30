import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import {
	ImportExportServiceError,
	confirmCsvImport,
	exportUserData,
	parseRowValidationError,
	previewCsvImport
} from '../services/importExport';

const confirmImportSchema = z.object({
	columnMapping: z.record(z.string()),
	csvBase64: z.string().optional(),
	csvData: z.string().optional(),
	conflictResolution: z.enum(['overwrite', 'skip']).optional()
});

export const exportUserDataController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const zipBuffer = await exportUserData(userId);

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="nutrilog-export.zip"');
		return res.status(200).send(zipBuffer);
	} catch (error) {
		return next(error);
	}
};

export const previewCsvImportController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const csvFile = req.file;
		if (!csvFile) {
			return res.status(400).json({ error: 'CSV file is required', code: 'VALIDATION_ERROR' });
		}

		const preview = await previewCsvImport(csvFile.buffer);
		return res.status(200).json(preview);
	} catch (error) {
		if (error instanceof ImportExportServiceError) {
			return res.status(error.statusCode).json({
				error: error.message,
				code: error.code
			});
		}

		return next(error);
	}
};

export const downloadImportTemplate = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const csvTemplate = `date,weight_kg,calories_consumed,protein_g,carbs_g,fat_total_g,fat_saturated_g,fat_unsaturated_g,fat_trans_g,magnesium_mg,iron_mg,zinc_mg,water_litres,day_type,notes
2025-01-13,83.4,2080,169,205,69,22,43,0.4,330,15,10,2.5,normal,Example entry one
2025-01-14,83.2,1960,174,188,63,20,39,0.3,355,16,10.8,2.9,restaurant,Example entry two
`;

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader(
			'Content-Disposition',
			'attachment; filename="nutrilog-import-template.csv"'
		);

		return res.status(200).send(csvTemplate);
	} catch (error) {
		return next(error);
	}
};

export const confirmCsvImportController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = confirmImportSchema.parse(req.body);
		const result = await confirmCsvImport(userId, parsedBody);
		return res.status(200).json(result);
	} catch (error) {
		if (error instanceof ImportExportServiceError) {
			const rowErrors = parseRowValidationError(error);
			if (error.statusCode === 422 && rowErrors) {
				return res.status(422).json(rowErrors);
			}

			return res.status(error.statusCode).json({
				error: error.message,
				code: error.code
			});
		}

		return next(error);
	}
};
