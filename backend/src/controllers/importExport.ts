import archiver from 'archiver';
import type { NextFunction, Request, Response } from 'express';
import { PassThrough } from 'stream';
import { z } from 'zod';

import { habitImportConfirmSchema } from '../schemas/habits';
import {
	ImportExportServiceError,
	confirmHabitImport,
	confirmCsvImport,
	exportUserData,
	parseRowValidationError,
	previewHabitDefinitions,
	previewHabitLogs,
	previewCsvImport
} from '../services/importExport';

const confirmImportSchema = z.object({
	columnMapping: z.record(z.string()),
	csvBase64: z.string().optional(),
	csvData: z.string().optional(),
	conflictResolution: z.enum(['overwrite', 'skip']).optional()
});

const createTemplateZipBuffer = async (): Promise<Buffer> => {
	const output = new PassThrough();
	const archive = archiver('zip', { zlib: { level: 9 } });
	const chunks: Buffer[] = [];

	output.on('data', (chunk: Buffer) => {
		chunks.push(chunk);
	});

	const completion = new Promise<Buffer>((resolve, reject) => {
		output.on('finish', () => resolve(Buffer.concat(chunks)));
		output.on('error', reject);
		archive.on('error', reject);
	});

	const dailyLogsTemplate = `date,weight_kg,calories_consumed,protein_g,carbs_g,fat_total_g,fat_saturated_g,fat_unsaturated_g,fat_trans_g,fiber_g,sugars_g,sodium_mg,calcium_mg,magnesium_mg,iron_mg,zinc_mg,water_litres,day_type,notes\n2025-01-15,75.2,2000,150,200,70,20,40,1,25,50,1800,800,300,15,8,2.5,normal,Felt good today\n`;
	const habitLogsTemplate = `date,habit_name,value,calories_burned,notes\n2025-01-15,Morning Walk,8500,42.5,Felt energetic\n`;
	const habitDefinitionsTemplate = `name,habit_type,unit_label,frequency_type,frequency_x,frequency_y,target_value,target_direction,is_calorie_burning,calorie_unit,calorie_kcal,scheduled_days,scheduled_dates,is_active,display_order\nMorning Walk,count,steps,x_per_week,5,,10000,at_least,true,1000,50,"[0,1,2,3,4]",,true,0\n`;

	archive.pipe(output);
	archive.append(dailyLogsTemplate, { name: 'daily_logs.csv' });
	archive.append(habitLogsTemplate, { name: 'habit_logs.csv' });
	archive.append(habitDefinitionsTemplate, { name: 'habit_definitions.csv' });
	await archive.finalize();

	return completion;
};

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

		const zipBuffer = await createTemplateZipBuffer();

		res.setHeader('Content-Type', 'application/zip');
		res.setHeader('Content-Disposition', 'attachment; filename="nutrilog-template.zip"');

		return res.status(200).send(zipBuffer);
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

export const previewHabitDefinitionsController = async (
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

		const preview = await previewHabitDefinitions(userId, csvFile.buffer);
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

export const previewHabitLogsController = async (
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

		const preview = await previewHabitLogs(userId, csvFile.buffer);
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

export const confirmHabitImportController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = habitImportConfirmSchema.parse(req.body);
		const result = await confirmHabitImport(userId, parsedBody);
		return res.status(200).json(result);
	} catch (error) {
		if (error instanceof z.ZodError) {
			return res.status(400).json({
				error: 'Invalid request payload',
				code: 'VALIDATION_ERROR',
				details: error.errors
			});
		}

		if (error instanceof ImportExportServiceError) {
			return res.status(error.statusCode).json({
				error: error.message,
				code: error.code
			});
		}

		return next(error);
	}
};
