import { prisma } from '../lib/prisma';
import type { HabitCreateInput, HabitUpdateInput } from '../schemas/habits';

export class HabitsServiceError extends Error {
	statusCode: number;
	code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

export const getHabits = async (userId: string) => {
	return prisma.habit.findMany({
		where: { userId },
		orderBy: { displayOrder: 'asc' }
	});
};

export const createHabit = async (userId: string, data: HabitCreateInput) => {
	const maxOrderHabit = await prisma.habit.findFirst({
		where: { userId },
		orderBy: { displayOrder: 'desc' },
		select: { displayOrder: true }
	});

	const nextDisplayOrder = (maxOrderHabit?.displayOrder ?? -1) + 1;

	return prisma.habit.create({
		data: {
			userId,
			...data,
			displayOrder: nextDisplayOrder
		}
	});
};

export const updateHabit = async (userId: string, id: string, data: HabitUpdateInput) => {
	const existingHabit = await prisma.habit.findFirst({
		where: {
			id,
			userId
		}
	});

	if (!existingHabit) {
		throw new HabitsServiceError('Habit not found', 404, 'NOT_FOUND');
	}

	return prisma.habit.update({
		where: { id: existingHabit.id },
		data
	});
};

export const archiveHabit = async (userId: string, id: string) => {
	const existingHabit = await prisma.habit.findFirst({
		where: {
			id,
			userId
		}
	});

	if (!existingHabit) {
		throw new HabitsServiceError('Habit not found', 404, 'NOT_FOUND');
	}

	return prisma.habit.update({
		where: { id: existingHabit.id },
		data: { isActive: !existingHabit.isActive }
	});
};

export const reorderHabits = async (userId: string, orderedIds: string[]) => {
	const userHabits = await prisma.habit.findMany({
		where: {
			userId,
			id: { in: orderedIds }
		},
		select: { id: true }
	});

	if (userHabits.length !== orderedIds.length) {
		throw new HabitsServiceError('One or more habits were not found', 404, 'NOT_FOUND');
	}

	await prisma.$transaction(
		orderedIds.map((habitId, index) =>
			prisma.habit.update({
				where: { id: habitId },
				data: { displayOrder: index }
			})
		)
	);

	return getHabits(userId);
};
