import type { NextFunction, Request, Response } from 'express';

import { sessionCreateSchema } from '../schemas/auth';
import { createSession } from '../services/auth';

export const createSessionController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { idToken } = sessionCreateSchema.parse(req.body);
		const { jwt, user } = await createSession(idToken);

		res.cookie('session', jwt, {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60 * 1000
		});

		res.status(200).json({
			user: {
				id: user.id,
				email: user.email,
				displayName: user.displayName,
				age: user.age,
				gender: user.gender,
				heightCm: user.heightCm !== null ? Number(user.heightCm) : null,
				activityLevel: user.activityLevel,
				calorieTarget: user.calorieTarget
			}
		});
	} catch (error) {
		next(error);
	}
};

export const deleteSessionController = (
	_req: Request,
	res: Response,
	next: NextFunction
): void => {
	try {
		res.clearCookie('session', {
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict'
		});

		res.status(200).json({ message: 'Logged out' });
	} catch (error) {
		next(error);
	}
};
