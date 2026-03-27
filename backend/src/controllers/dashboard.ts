import type { NextFunction, Request, Response } from 'express';

import { dashboardLayoutSchema } from '../schemas/dashboard';
import { getLayout, saveLayout } from '../services/dashboard';

export const getDashboardLayoutController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const layout = await getLayout(userId);
		return res.status(200).json({ layoutJson: layout });
	} catch (error) {
		return next(error);
	}
};

export const saveDashboardLayoutController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { layoutJson } = dashboardLayoutSchema.parse(req.body);
		const layout = await saveLayout(userId, layoutJson);
		return res.status(200).json({ layoutJson: layout });
	} catch (error) {
		return next(error);
	}
};
