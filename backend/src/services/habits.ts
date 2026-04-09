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

const parseSerializedSchedule = (value: string | null): number[] | null => {
	if (!value) {
		return null;
	}

	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) {
			return null;
		}

		if (!parsed.every((entry) => typeof entry === 'number')) {
			return null;
		}

		return parsed as number[];
	} catch {
		return null;
	}
};

export const getHabits = async (userId: string) => {
	const habits = await prisma.habit.findMany({
		where: { userId },
		orderBy: { displayOrder: 'asc' }
	});

	return habits.map((habit) => ({
		...habit,
		scheduledDays: parseSerializedSchedule(habit.scheduledDays),
		scheduledDates: parseSerializedSchedule(habit.scheduledDates)
	}));
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
			scheduledDays: data.scheduledDays ? JSON.stringify(data.scheduledDays) : undefined,
			scheduledDates: data.scheduledDates ? JSON.stringify(data.scheduledDates) : undefined,
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
		data: {
			...data,
			scheduledDays: data.scheduledDays ? JSON.stringify(data.scheduledDays) : undefined,
			scheduledDates: data.scheduledDates ? JSON.stringify(data.scheduledDates) : undefined
		}
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

export async function deleteHabit(userId: string, id: string): Promise<void> {
	const habit = await prisma.habit.findFirst({
		where: {
			id,
			userId
		}
	});

	if (!habit) {
		throw Object.assign(new Error('Habit not found'), { statusCode: 404 });
	}

	await prisma.habit.delete({ where: { id } });
}

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
