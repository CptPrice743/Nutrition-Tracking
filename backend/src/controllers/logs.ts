import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { dailyLogCreateSchema, dailyLogUpdateSchema } from '../schemas/logs';
import {
	LogsServiceError,
	createLog,
	getLogByDate,
	getLogs,
	updateLog
} from '../services/logs';

const dateParamSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

const dateRangeQuerySchema = z
	.object({
		startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
		endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
	})
	.strict();

const respondServiceError = (error: LogsServiceError, res: Response): Response => {
	return res.status(error.statusCode).json({
		error: error.message,
		code: error.code
	});
};

export const getLogsController = async (
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
		const logs = await getLogs(userId, query.startDate, query.endDate);
		return res.status(200).json(logs);
	} catch (error) {
		return next(error);
	}
};

export const createLogController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = dailyLogCreateSchema.parse(req.body);
		const createdLog = await createLog(userId, parsedBody);
		return res.status(201).json(createdLog);
	} catch (error) {
		if (error instanceof LogsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};

export const getLogByDateController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { date } = dateParamSchema.parse(req.params);
		const log = await getLogByDate(userId, date);

		if (!log) {
			return res.status(404).json({ error: 'Log not found', code: 'NOT_FOUND' });
		}

		return res.status(200).json(log);
	} catch (error) {
		return next(error);
	}
};

export const updateLogController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { date } = dateParamSchema.parse(req.params);
		const parsedBody = dailyLogUpdateSchema.parse(req.body);
		const updatedLog = await updateLog(userId, date, parsedBody);
		return res.status(200).json(updatedLog);
	} catch (error) {
		if (error instanceof LogsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};
