import type { NextFunction, Request, Response } from 'express';

import { getAnalytics } from '../services/analytics';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const getAnalyticsController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
		const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;

		if (!startDate || !endDate || !dateRegex.test(startDate) || !dateRegex.test(endDate)) {
			return res.status(400).json({
				error: 'startDate and endDate are required in YYYY-MM-DD format'
			});
		}

		const data = await getAnalytics(userId, startDate, endDate);
		return res.status(200).json(data);
	} catch (error) {
		return next(error);
	}
};
