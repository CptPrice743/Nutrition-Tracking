import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { habitLogUpsertSchema } from '../schemas/habits';
import { HabitLogsServiceError, getHabitLogs, upsertHabitLog } from '../services/habitLogs';

const dateRangeQuerySchema = z
	.object({
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
		endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
	})
	.strict();

const respondServiceError = (error: HabitLogsServiceError, res: Response): Response => {
	return res.status(error.statusCode).json({
		error: error.message,
		code: error.code
	});
};

export const getHabitLogsController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const query = dateRangeQuerySchema.parse(req.query);
		const logs = await getHabitLogs(userId, query.startDate, query.endDate);
		return res.status(200).json(logs);
	} catch (error) {
		return next(error);
	}
};

export const upsertHabitLogController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = habitLogUpsertSchema.parse(req.body);
		const log = await upsertHabitLog(userId, parsedBody);
		return res.status(200).json(log);
	} catch (error) {
		if (error instanceof HabitLogsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};
