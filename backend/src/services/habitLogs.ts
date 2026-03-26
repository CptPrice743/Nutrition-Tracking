import { prisma } from '../lib/prisma';
import type { HabitLogUpsertInput } from '../schemas/habits';

export class HabitLogsServiceError extends Error {
	statusCode: number;
	code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

const parseDateOnly = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

export const upsertHabitLog = async (userId: string, data: HabitLogUpsertInput) => {
	const habit = await prisma.habit.findFirst({
		where: {
			id: data.habitId,
			userId
		}
	});

	if (!habit) {
		throw new HabitLogsServiceError('Habit not found', 404, 'NOT_FOUND');
	}

	const caloriesBurned =
		habit.isCalorieBurning && habit.calorieUnit && habit.calorieKcal
			? (data.value / Number(habit.calorieUnit)) * Number(habit.calorieKcal)
			: 0;

	return prisma.habitLog.upsert({
		where: {
			userId_habitId_logDate: {
				userId,
				habitId: data.habitId,
				logDate: parseDateOnly(data.logDate)
			}
		},
		update: {
			value: data.value,
			notes: data.notes,
			caloriesBurned
		},
		create: {
			userId,
			habitId: data.habitId,
			logDate: parseDateOnly(data.logDate),
			value: data.value,
			notes: data.notes,
			caloriesBurned
		}
	});
};

export const getHabitLogs = async (userId: string, startDate?: string, endDate?: string) => {
	return prisma.habitLog.findMany({
		where: {
			userId,
			...(startDate || endDate
				? {
						logDate: {
							...(startDate ? { gte: parseDateOnly(startDate) } : {}),
							...(endDate ? { lte: parseDateOnly(endDate) } : {})
						}
					}
				: {})
		},
		orderBy: { logDate: 'desc' }
	});
};
