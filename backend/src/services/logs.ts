import { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';
import type { DailyLogCreateInput, DailyLogUpdateInput } from '../schemas/logs';

export class LogsServiceError extends Error {
	statusCode: number;
	code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

const parseDateOnly = (date: string): Date => new Date(`${date}T00:00:00.000Z`);

type DateRange = {
	startDate?: string;
	endDate?: string;
};

export const getLogs = async (
	userId: string,
	startDate?: string,
	endDate?: string
) => {
	const where: Prisma.DailyLogWhereInput = { userId };

	if (startDate || endDate) {
		where.date = {
			...(startDate ? { gte: parseDateOnly(startDate) } : {}),
			...(endDate ? { lte: parseDateOnly(endDate) } : {})
		};
	}

	return prisma.dailyLog.findMany({
		where,
		orderBy: { date: 'desc' }
	});
};

export const getLogByDate = async (userId: string, date: string) => {
	return prisma.dailyLog.findFirst({
		where: {
			userId,
			date: parseDateOnly(date)
		}
	});
};

export const createLog = async (userId: string, data: DailyLogCreateInput) => {
	const { date, ...rest } = data;

	try {
		return await prisma.dailyLog.create({
			data: {
				userId,
				date: parseDateOnly(date),
				...rest
			}
		});
	} catch (error: unknown) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			throw new LogsServiceError('A log for this date already exists', 409, 'CONFLICT');
		}
		throw error;
	}
};

export const updateLog = async (userId: string, date: string, data: DailyLogUpdateInput) => {
	const existingLog = await prisma.dailyLog.findFirst({
		where: {
			userId,
			date: parseDateOnly(date)
		}
	});

	if (!existingLog) {
		throw new LogsServiceError('Log not found', 404, 'NOT_FOUND');
	}

	const updateData: Prisma.DailyLogUpdateInput = {
		...data,
		...(data.date ? { date: parseDateOnly(data.date) } : {})
	};

	return prisma.dailyLog.update({
		where: { id: existingLog.id },
		data: updateData
	});
};
