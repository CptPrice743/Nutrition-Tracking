import type { NextFunction, Request, Response } from 'express';

import { weeklyAnalyticsQuerySchema } from '../schemas/analytics';
import { AnalyticsServiceError, getWeeklyAnalytics } from '../services/analytics';

export const getWeeklyAnalyticsController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { week } = weeklyAnalyticsQuerySchema.parse(req.query);
		const data = await getWeeklyAnalytics(userId, week);
		return res.status(200).json(data);
	} catch (error) {
		if (error instanceof AnalyticsServiceError) {
			return res.status(error.statusCode).json({
				error: error.message,
				code: error.code
			});
		}

		return next(error);
	}
};
