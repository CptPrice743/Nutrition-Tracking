import type { NextFunction, Request, Response } from 'express';

import { updateProfileSchema } from '../schemas/users';
import { updateUser } from '../services/users';

export const updateMeController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = updateProfileSchema.parse(req.body);
		const user = await updateUser(userId, parsedBody);

		return res.status(200).json({ user });
	} catch (error) {
		return next(error);
	}
};