import type { DailyLog, Habit, HabitLog, Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

type DailyLogSummary = {
	date: string;
	weightKg: number | null;
	caloriesConsumed: number | null;
	caloriesBurned: number | null;
	netCalories: number | null;
	proteinG: number | null;
	carbsG: number | null;
	fatTotalG: number | null;
	waterLitres: number | null;
};

type HabitWeeklySummary = {
	habitId: string;
	habitName: string;
	habitType: 'count' | 'boolean';
	targetValue: number | null;
	targetDirection: 'at_least' | 'at_most' | null;
	dailyValues: { date: string; value: number | null }[];
	totalCaloriesBurned: number;
};

export type WeeklyAnalytics = {
	weekLabel: string;
	startDate: string;
	endDate: string;
	daysLogged: number;
	avgWeightKg: number | null;
	weightDeltaVsPrevWeek: number | null;
	avgCaloriesConsumed: number | null;
	avgCaloriesBurned: number | null;
	avgNetCalories: number | null;
	totalWeeklyDeficitSurplus: number | null;
	avgProteinG: number | null;
	avgCarbsG: number | null;
	avgFatTotalG: number | null;
	avgFatSaturatedG: number | null;
	avgFatUnsaturatedG: number | null;
	avgFatTransG: number | null;
	avgMagnesiumMg: number | null;
	avgIronMg: number | null;
	avgZincMg: number | null;
	avgWaterLitres: number | null;
	normalDays: number;
	restaurantDays: number;
	estimatedTDEE: number | null;
	tdeeConfidenceBand: number | null;
	rollingAvgTDEE: number | null;
	dailyLogs: DailyLogSummary[];
	habitSummaries: HabitWeeklySummary[];
};

export class AnalyticsServiceError extends Error {
	statusCode: number;
	code: string;

	constructor(message: string, statusCode: number, code: string) {
		super(message);
		this.statusCode = statusCode;
		this.code = code;
	}
}

type WeekRange = {
	weekLabel: string;
	start: Date;
	end: Date;
};

type WeekCoreMetrics = {
	avgWeightKg: number | null;
	avgCaloriesConsumed: number | null;
	avgCaloriesBurned: number | null;
	avgNetCalories: number | null;
	totalWeeklyDeficitSurplus: number | null;
	estimatedTDEE: number | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toDateOnlyString = (date: Date): string => {
	return date.toISOString().slice(0, 10);
};

const addDays = (date: Date, days: number): Date => {
	return new Date(date.getTime() + days * MS_PER_DAY);
};

const toNumberOrNull = (value: Prisma.Decimal | number | null | undefined): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	return Number(value);
};

const average = (values: number[]): number | null => {
	if (values.length === 0) {
		return null;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const parseWeekLabel = (weekLabel: string): WeekRange => {
	const match = /^(\d{4})-W(\d{2})$/.exec(weekLabel);
	if (!match) {
		throw new AnalyticsServiceError('Invalid week format. Expected YYYY-Www', 400, 'VALIDATION_ERROR');
	}

	const year = Number(match[1]);
	const week = Number(match[2]);
	if (week < 1 || week > 53) {
		throw new AnalyticsServiceError('Invalid week number', 400, 'VALIDATION_ERROR');
	}

	const jan4 = new Date(Date.UTC(year, 0, 4));
	const jan4Day = jan4.getUTCDay() || 7;
	const week1Monday = addDays(jan4, -(jan4Day - 1));
	const start = addDays(week1Monday, (week - 1) * 7);
	const end = addDays(start, 6);

	const normalized = formatWeekLabel(start);
	if (normalized !== weekLabel) {
		throw new AnalyticsServiceError('Invalid ISO week for provided year', 400, 'VALIDATION_ERROR');
	}

	return { weekLabel, start, end };
};

const formatWeekLabel = (date: Date): string => {
	const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
	const day = utcDate.getUTCDay() || 7;
	const thursday = addDays(utcDate, 4 - day);
	const weekYear = thursday.getUTCFullYear();
	const jan1 = new Date(Date.UTC(weekYear, 0, 1));
	const dayOfYear = Math.floor((thursday.getTime() - jan1.getTime()) / MS_PER_DAY) + 1;
	const week = Math.ceil(dayOfYear / 7);
	return `${weekYear}-W${String(week).padStart(2, '0')}`;
};

const buildWeekDayStrings = (startDate: Date): string[] => {
	return Array.from({ length: 7 }, (_, index) => toDateOnlyString(addDays(startDate, index)));
};

const calculateWeekCoreMetrics = (dailyLogs: DailyLog[], habitLogs: HabitLog[]): WeekCoreMetrics => {
	const burnedByDate = new Map<string, number>();

	for (const habitLog of habitLogs) {
		const dateKey = toDateOnlyString(habitLog.logDate);
		const existing = burnedByDate.get(dateKey) ?? 0;
		const burned = toNumberOrNull(habitLog.caloriesBurned) ?? 0;
		burnedByDate.set(dateKey, existing + burned);
	}

	const avgWeightKg = average(
		dailyLogs
			.map((log) => toNumberOrNull(log.weightKg))
			.filter((value): value is number => value !== null)
	);

	const consumedValues = dailyLogs
		.map((log) => log.caloriesConsumed)
		.filter((value): value is number => value !== null);
	const avgCaloriesConsumed = average(consumedValues);

	const burnedPerLoggedDay = dailyLogs.map((log) => burnedByDate.get(toDateOnlyString(log.date)) ?? 0);
	const avgCaloriesBurned = dailyLogs.length > 0 ? average(burnedPerLoggedDay) : null;

	const netValues = dailyLogs
		.filter((log) => log.caloriesConsumed !== null)
		.map((log) => {
			const consumed = log.caloriesConsumed as number;
			const burned = burnedByDate.get(toDateOnlyString(log.date)) ?? 0;
			return consumed - burned;
		});
	const avgNetCalories = average(netValues);

	const totalWeeklyDeficitSurplus =
		netValues.length > 0 ? netValues.reduce((sum, value) => sum + value, 0) : null;

	const weightEntries = dailyLogs
		.map((log) => ({ date: log.date, weight: toNumberOrNull(log.weightKg) }))
		.filter((entry): entry is { date: Date; weight: number } => entry.weight !== null)
		.sort((a, b) => a.date.getTime() - b.date.getTime());

	let estimatedTDEE: number | null = null;
	if (weightEntries.length >= 2 && avgNetCalories !== null) {
		const weightStart = weightEntries[0].weight;
		const weightEnd = weightEntries[weightEntries.length - 1].weight;
		const weightChangeKg = weightEnd - weightStart;
		estimatedTDEE = avgNetCalories - (weightChangeKg * 7700) / 7;
	}

	return {
		avgWeightKg,
		avgCaloriesConsumed,
		avgCaloriesBurned,
		avgNetCalories,
		totalWeeklyDeficitSurplus,
		estimatedTDEE
	};
};

const getWeekData = async (userId: string, start: Date, end: Date) => {
	const startDate = toDateOnlyString(start);
	const endDate = toDateOnlyString(end);
	const rangeStart = new Date(`${startDate}T00:00:00.000Z`);
	const rangeEnd = new Date(`${endDate}T23:59:59.999Z`);

	const [dailyLogs, habitLogs] = await Promise.all([
		prisma.dailyLog.findMany({
			where: {
				userId,
				date: {
					gte: rangeStart,
					lte: rangeEnd
				}
			},
			orderBy: { date: 'asc' }
		}),
		prisma.habitLog.findMany({
			where: {
				userId,
				logDate: {
					gte: rangeStart,
					lte: rangeEnd
				}
			},
			orderBy: { logDate: 'asc' }
		})
	]);

	return { dailyLogs, habitLogs };
};

const buildDailySummaries = (dailyLogs: DailyLog[], habitLogs: HabitLog[]): DailyLogSummary[] => {
	const burnedByDate = new Map<string, number>();

	for (const habitLog of habitLogs) {
		const dateKey = toDateOnlyString(habitLog.logDate);
		const existing = burnedByDate.get(dateKey) ?? 0;
		const burned = toNumberOrNull(habitLog.caloriesBurned) ?? 0;
		burnedByDate.set(dateKey, existing + burned);
	}

	return dailyLogs.map((log) => {
		const date = toDateOnlyString(log.date);
		const caloriesBurned = burnedByDate.get(date) ?? 0;
		const caloriesConsumed = log.caloriesConsumed;
		const netCalories = caloriesConsumed !== null ? caloriesConsumed - caloriesBurned : null;

		return {
			date,
			weightKg: toNumberOrNull(log.weightKg),
			caloriesConsumed,
			caloriesBurned,
			netCalories,
			proteinG: log.proteinG,
			carbsG: log.carbsG,
			fatTotalG: log.fatTotalG,
			waterLitres: toNumberOrNull(log.waterLitres)
		};
	});
};

const buildHabitSummaries = (
	habits: Habit[],
	habitLogs: HabitLog[],
	weekDayStrings: string[]
): HabitWeeklySummary[] => {
	const habitLogMap = new Map<string, HabitLog>();
	const caloriesBurnedByHabit = new Map<string, number>();

	for (const habitLog of habitLogs) {
		const date = toDateOnlyString(habitLog.logDate);
		habitLogMap.set(`${habitLog.habitId}:${date}`, habitLog);

		const existing = caloriesBurnedByHabit.get(habitLog.habitId) ?? 0;
		const burned = toNumberOrNull(habitLog.caloriesBurned) ?? 0;
		caloriesBurnedByHabit.set(habitLog.habitId, existing + burned);
	}

	return habits.map((habit) => {
		const dailyValues = weekDayStrings.map((date) => {
			const key = `${habit.id}:${date}`;
			const log = habitLogMap.get(key);
			return {
				date,
				value: log ? toNumberOrNull(log.value) : null
			};
		});

		return {
			habitId: habit.id,
			habitName: habit.name,
			habitType: habit.habitType === 'boolean' ? 'boolean' : 'count',
			targetValue: toNumberOrNull(habit.targetValue),
			targetDirection:
				habit.targetDirection === 'at_least' || habit.targetDirection === 'at_most'
					? habit.targetDirection
					: null,
			dailyValues,
			totalCaloriesBurned: caloriesBurnedByHabit.get(habit.id) ?? 0
		};
	});
};

export const getWeeklyAnalytics = async (
	userId: string,
	weekLabel: string
): Promise<WeeklyAnalytics> => {
	const { start, end } = parseWeekLabel(weekLabel);
	const previousWeekStart = addDays(start, -7);
	const previousWeekEnd = addDays(end, -7);

	const [currentWeekData, previousWeekData, habits] = await Promise.all([
		getWeekData(userId, start, end),
		getWeekData(userId, previousWeekStart, previousWeekEnd),
		prisma.habit.findMany({
			where: { userId },
			orderBy: { displayOrder: 'asc' }
		})
	]);

	const currentMetrics = calculateWeekCoreMetrics(
		currentWeekData.dailyLogs,
		currentWeekData.habitLogs
	);
	const previousMetrics = calculateWeekCoreMetrics(
		previousWeekData.dailyLogs,
		previousWeekData.habitLogs
	);

	const weightDeltaVsPrevWeek =
		currentMetrics.avgWeightKg !== null && previousMetrics.avgWeightKg !== null
			? currentMetrics.avgWeightKg - previousMetrics.avgWeightKg
			: null;

	const rollingWeekStarts = [0, 1, 2, 3].map((offset) => addDays(start, -7 * offset));
	const rollingWeekData = await Promise.all(
		rollingWeekStarts.map((weekStart) => getWeekData(userId, weekStart, addDays(weekStart, 6)))
	);

	const rollingTdees = rollingWeekData
		.map((data) => calculateWeekCoreMetrics(data.dailyLogs, data.habitLogs).estimatedTDEE)
		.filter((value): value is number => value !== null);

	const rollingAvgTDEE = rollingTdees.length >= 2 ? average(rollingTdees) : null;

	const dailyLogs = buildDailySummaries(currentWeekData.dailyLogs, currentWeekData.habitLogs);
	const habitSummaries = buildHabitSummaries(
		habits,
		currentWeekData.habitLogs,
		buildWeekDayStrings(start)
	);

	const normalDays = currentWeekData.dailyLogs.filter((log) => log.dayType === 'normal').length;
	const restaurantDays = currentWeekData.dailyLogs.filter(
		(log) => log.dayType === 'restaurant'
	).length;

	return {
		weekLabel,
		startDate: toDateOnlyString(start),
		endDate: toDateOnlyString(end),
		daysLogged: currentWeekData.dailyLogs.length,
		avgWeightKg: currentMetrics.avgWeightKg,
		weightDeltaVsPrevWeek,
		avgCaloriesConsumed: currentMetrics.avgCaloriesConsumed,
		avgCaloriesBurned: currentMetrics.avgCaloriesBurned,
		avgNetCalories: currentMetrics.avgNetCalories,
		totalWeeklyDeficitSurplus: currentMetrics.totalWeeklyDeficitSurplus,
		avgProteinG: average(
			currentWeekData.dailyLogs
				.map((log) => log.proteinG)
				.filter((value): value is number => value !== null)
		),
		avgCarbsG: average(
			currentWeekData.dailyLogs
				.map((log) => log.carbsG)
				.filter((value): value is number => value !== null)
		),
		avgFatTotalG: average(
			currentWeekData.dailyLogs
				.map((log) => log.fatTotalG)
				.filter((value): value is number => value !== null)
		),
		avgFatSaturatedG: average(
			currentWeekData.dailyLogs
				.map((log) => log.fatSaturatedG)
				.filter((value): value is number => value !== null)
		),
		avgFatUnsaturatedG: average(
			currentWeekData.dailyLogs
				.map((log) => log.fatUnsaturatedG)
				.filter((value): value is number => value !== null)
		),
		avgFatTransG: average(
			currentWeekData.dailyLogs
				.map((log) => toNumberOrNull(log.fatTransG))
				.filter((value): value is number => value !== null)
		),
		avgMagnesiumMg: average(
			currentWeekData.dailyLogs
				.map((log) => log.magnesiumMg)
				.filter((value): value is number => value !== null)
		),
		avgIronMg: average(
			currentWeekData.dailyLogs
				.map((log) => toNumberOrNull(log.ironMg))
				.filter((value): value is number => value !== null)
		),
		avgZincMg: average(
			currentWeekData.dailyLogs
				.map((log) => toNumberOrNull(log.zincMg))
				.filter((value): value is number => value !== null)
		),
		avgWaterLitres: average(
			currentWeekData.dailyLogs
				.map((log) => toNumberOrNull(log.waterLitres))
				.filter((value): value is number => value !== null)
		),
		normalDays,
		restaurantDays,
		estimatedTDEE: currentMetrics.estimatedTDEE,
		tdeeConfidenceBand:
			currentMetrics.estimatedTDEE !== null ? currentMetrics.estimatedTDEE * 0.1 : null,
		rollingAvgTDEE,
		dailyLogs,
		habitSummaries
	};
};
