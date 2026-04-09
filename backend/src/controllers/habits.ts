import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

import { habitCreateSchema, habitUpdateSchema, reorderSchema } from '../schemas/habits';
import {
	HabitsServiceError,
	archiveHabit,
	createHabit,
	deleteHabit,
	getHabits,
	reorderHabits,
	updateHabit
} from '../services/habits';

const idParamSchema = z.object({
	id: z.string().uuid()
});

const respondServiceError = (error: HabitsServiceError, res: Response): Response => {
	return res.status(error.statusCode).json({
		error: error.message,
		code: error.code
	});
};

export const getHabitsController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const habits = await getHabits(userId);
		return res.status(200).json(habits);
	} catch (error) {
		return next(error);
	}
};

export const createHabitController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const parsedBody = habitCreateSchema.parse(req.body);
		const habit = await createHabit(userId, parsedBody);
		return res.status(201).json(habit);
	} catch (error) {
		if (error instanceof HabitsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};

export const updateHabitController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { id } = idParamSchema.parse(req.params);
		const parsedBody = habitUpdateSchema.parse(req.body);
		const habit = await updateHabit(userId, id, parsedBody);
		return res.status(200).json(habit);
	} catch (error) {
		if (error instanceof HabitsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};

export const archiveHabitController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { id } = idParamSchema.parse(req.params);
		const habit = await archiveHabit(userId, id);
		return res.status(200).json(habit);
	} catch (error) {
		if (error instanceof HabitsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};

export const deleteHabitController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		await deleteHabit(userId, req.params.id);
		return res.status(200).json({ message: 'Habit deleted' });
	} catch (error) {
		return next(error);
	}
};

export const reorderHabitsController = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void | Response> => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
		}

		const { orderedIds } = reorderSchema.parse(req.body);
		const habits = await reorderHabits(userId, orderedIds);
		return res.status(200).json(habits);
	} catch (error) {
		if (error instanceof HabitsServiceError) {
			return respondServiceError(error, res);
		}
		return next(error);
	}
};
