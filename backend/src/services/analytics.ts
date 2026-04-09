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
	fatSaturatedG: number | null;
	fatUnsaturatedG: number | null;
	fiberG: number | null;
	sugarsG: number | null;
	sodiumMg: number | null;
	calciumMg: number | null;
	waterLitres: number | null;
	dayType: string | null;
};

type HabitPeriodSummary = {
	habitId: string;
	habitName: string;
	habitType: 'count' | 'boolean';
	frequencyType: string;
	scheduledDays: number[] | null;
	scheduledDates: number[] | null;
	targetValue: number | null;
	targetDirection: 'at_least' | 'at_most' | null;
	isCalorieBurning: boolean;
	dailyValues: { date: string; value: number | null; caloriesBurned: number | null }[];
	totalCaloriesBurned: number;
	completionRate: number;
	currentStreak: number;
	longestStreak: number;
	totalCompletions: number;
};

export type AnalyticsResult = {
	startDate: string;
	endDate: string;
	daysLogged: number;
	avgWeightKg: number | null;
	weightDeltaVsPrevPeriod: number | null;
	avgCaloriesConsumed: number | null;
	avgCaloriesBurned: number | null;
	avgNetCalories: number | null;
	totalPeriodDeficitSurplus: number | null;
	avgProteinG: number | null;
	avgCarbsG: number | null;
	avgFatTotalG: number | null;
	avgFatSaturatedG: number | null;
	avgFatUnsaturatedG: number | null;
	avgFatTransG: number | null;
	avgFiberG: number | null;
	avgSugarsG: number | null;
	avgSodiumMg: number | null;
	avgCalciumMg: number | null;
	avgMagnesiumMg: number | null;
	avgIronMg: number | null;
	avgZincMg: number | null;
	avgWaterLitres: number | null;
	normalDays: number;
	restaurantDays: number;
	estimatedTDEE: number | null;
	tdeeConfidenceBand: number | null;
	rollingAvgTDEE: number | null;
	baselineTDEE: number | null;
	dailyLogSummaries: DailyLogSummary[];
	habitSummaries: HabitPeriodSummary[];
};

type HabitLogWithHabit = Prisma.HabitLogGetPayload<{ include: { habit: true } }>;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const LIFESTYLE_MULTIPLIERS: Record<string, number> = {
	sedentary: 1.2,
	light_active: 1.35,
	highly_active: 1.5
};

const toDateOnlyString = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * MS_PER_DAY);

const startOfUtcDay = (date: Date): Date =>
	new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const endOfUtcDay = (date: Date): Date => {
	const dayStart = startOfUtcDay(date);
	return new Date(dayStart.getTime() + MS_PER_DAY - 1);
};

const toNumberOrNull = (value: Prisma.Decimal | number | null | undefined): number | null => {
	if (value === null || value === undefined) {
		return null;
	}
	return Number(value);
};

const roundTo = (value: number, decimals: number): number => {
	return Number(value.toFixed(decimals));
};

const averageRaw = (values: number[]): number | null => {
	if (values.length === 0) {
		return null;
	}
	return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const averageRounded = (values: number[], decimals: number): number | null => {
	const avg = averageRaw(values);
	return avg === null ? null : roundTo(avg, decimals);
};

const parseScheduledValues = (value: string | null): number[] | null => {
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

const normalizeHabitType = (habitType: string): 'count' | 'boolean' => {
	return habitType === 'boolean' ? 'boolean' : 'count';
};

const isCompletion = (
	habitType: 'count' | 'boolean',
	value: Prisma.Decimal | number | null | undefined
): boolean => {
	const numericValue = toNumberOrNull(value);
	if (numericValue === null) {
		return false;
	}

	if (habitType === 'boolean') {
		return numericValue >= 1;
	}

	return numericValue > 0;
};

const isScheduledDay = (
	frequencyType: string,
	scheduledDays: number[] | null,
	scheduledDates: number[] | null,
	date: Date
): boolean => {
	if (
		frequencyType === 'daily' ||
		frequencyType === 'weekly' ||
		frequencyType === 'monthly' ||
		frequencyType === 'x_in_y_days'
	) {
		return true;
	}

	if (frequencyType === 'x_per_week') {
		if (!scheduledDays || scheduledDays.length === 0) {
			return true;
		}
		const weekdayIndex = (date.getUTCDay() + 6) % 7;
		return scheduledDays.includes(weekdayIndex);
	}

	if (frequencyType === 'x_per_month') {
		if (!scheduledDates || scheduledDates.length === 0) {
			return true;
		}
		return scheduledDates.includes(date.getUTCDate());
	}

	return true;
};

const buildPeriodDateStrings = (start: Date, end: Date): string[] => {
	const dates: string[] = [];
	for (let cursor = startOfUtcDay(start); cursor.getTime() <= startOfUtcDay(end).getTime(); cursor = addDays(cursor, 1)) {
		dates.push(toDateOnlyString(cursor));
	}
	return dates;
};

const buildCaloriesBurnedByDate = (
	habitLogs: Array<{ logDate: Date; caloriesBurned: Prisma.Decimal | null }>
): Map<string, number> => {
	const burnedByDate = new Map<string, number>();
	for (const habitLog of habitLogs) {
		const dateKey = toDateOnlyString(habitLog.logDate);
		const existing = burnedByDate.get(dateKey) ?? 0;
		const burned = toNumberOrNull(habitLog.caloriesBurned) ?? 0;
		burnedByDate.set(dateKey, existing + burned);
	}
	return burnedByDate;
};

const computeEstimatedTDEEForRange = (
	dailyLogs: DailyLog[],
	habitLogs: Array<{ logDate: Date; caloriesBurned: Prisma.Decimal | null }>,
	periodDays: number
): number | null => {
	const consumedValues = dailyLogs
		.map((log) => log.caloriesConsumed)
		.filter((value): value is number => value !== null);
	const avgCaloriesConsumedRaw = averageRaw(consumedValues);

	const burnedByDate = buildCaloriesBurnedByDate(habitLogs);
	const avgCaloriesBurnedRaw = averageRaw(Array.from(burnedByDate.values()));

	if (avgCaloriesConsumedRaw === null || avgCaloriesBurnedRaw === null || periodDays <= 0) {
		return null;
	}

	const avgNetCaloriesRaw = avgCaloriesConsumedRaw - avgCaloriesBurnedRaw;
	const weightEntries = dailyLogs
		.map((log) => ({ date: log.date, weight: toNumberOrNull(log.weightKg) }))
		.filter((entry): entry is { date: Date; weight: number } => entry.weight !== null)
		.sort((left, right) => left.date.getTime() - right.date.getTime());

	if (weightEntries.length < 2) {
		return null;
	}

	const weightChangeKg = weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight;
	return roundTo(avgNetCaloriesRaw - (weightChangeKg * 7700) / periodDays, 1);
};

const mifflinBMR = (gender: string, weightKg: number, heightCm: number, age: number): number => {
	const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
	if (gender === 'male') {
		return Math.round(base + 5);
	}
	if (gender === 'female') {
		return Math.round(base - 161);
	}
	return Math.round(base - 78);
};

const fetchPeriodLogs = async (userId: string, startDay: Date, endDay: Date) => {
	const [dailyLogs, habitLogs] = await Promise.all([
		prisma.dailyLog.findMany({
			where: {
				userId,
				date: {
					gte: startOfUtcDay(startDay),
					lte: endOfUtcDay(endDay)
				}
			},
			orderBy: { date: 'asc' }
		}),
		prisma.habitLog.findMany({
			where: {
				userId,
				logDate: {
					gte: startOfUtcDay(startDay),
					lte: endOfUtcDay(endDay)
				}
			},
			orderBy: { logDate: 'asc' }
		})
	]);

	return { dailyLogs, habitLogs };
};

export const getAnalytics = async (
	userId: string,
	startDate: string,
	endDate: string
): Promise<AnalyticsResult> => {
	const start = new Date(`${startDate}T00:00:00.000Z`);
	const end = new Date(`${endDate}T23:59:59.999Z`);

	if (start.getTime() > end.getTime()) {
		throw new Error('startDate cannot be after endDate');
	}

	const [dailyLogs, habitLogs, habits, userProfile] = await Promise.all([
		prisma.dailyLog.findMany({
			where: { userId, date: { gte: start, lte: end } },
			orderBy: { date: 'asc' }
		}),
		prisma.habitLog.findMany({
			where: { userId, logDate: { gte: start, lte: end } },
			include: { habit: true },
			orderBy: { logDate: 'asc' }
		}),
		prisma.habit.findMany({
			where: { userId },
			orderBy: { displayOrder: 'asc' }
		}),
		prisma.user.findUnique({
			where: { id: userId },
			select: {
				age: true,
				gender: true,
				heightCm: true,
				activityLevel: true
			}
		})
	]);

	const periodDayStrings = buildPeriodDateStrings(start, end);
	const periodDays = periodDayStrings.length;
	const burnedByDate = buildCaloriesBurnedByDate(habitLogs);

	const avgWeightRaw = averageRaw(
		dailyLogs
			.map((log) => toNumberOrNull(log.weightKg))
			.filter((value): value is number => value !== null)
	);

	const avgCaloriesConsumedRaw = averageRaw(
		dailyLogs
			.map((log) => log.caloriesConsumed)
			.filter((value): value is number => value !== null)
	);
	const avgCaloriesBurnedRaw = averageRaw(Array.from(burnedByDate.values()));
	const avgNetCaloriesRaw =
		avgCaloriesConsumedRaw !== null && avgCaloriesBurnedRaw !== null
			? avgCaloriesConsumedRaw - avgCaloriesBurnedRaw
			: null;

	const periodDeficitSurplusValues = dailyLogs
		.filter((log) => log.caloriesConsumed !== null)
		.map((log) => {
			const dateKey = toDateOnlyString(log.date);
			const burned = burnedByDate.get(dateKey) ?? 0;
			return (log.caloriesConsumed as number) - burned;
		});

	const totalPeriodDeficitSurplus =
		periodDeficitSurplusValues.length > 0
			? roundTo(
					periodDeficitSurplusValues.reduce((sum, value) => sum + value, 0),
					1
			  )
			: null;

	const weightEntries = dailyLogs
		.map((log) => ({ date: log.date, weight: toNumberOrNull(log.weightKg) }))
		.filter((entry): entry is { date: Date; weight: number } => entry.weight !== null)
		.sort((left, right) => left.date.getTime() - right.date.getTime());

	const estimatedTDEE =
		weightEntries.length >= 2 && avgNetCaloriesRaw !== null
			? roundTo(
					avgNetCaloriesRaw -
						((weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight) * 7700) /
							periodDays,
					1
			  )
			: null;

	const previousStartDay = addDays(startOfUtcDay(start), -periodDays);
	const previousEndDay = addDays(startOfUtcDay(end), -periodDays);
	const previousPeriodDailyLogs = await prisma.dailyLog.findMany({
		where: {
			userId,
			date: {
				gte: startOfUtcDay(previousStartDay),
				lte: endOfUtcDay(previousEndDay)
			}
		},
		select: { weightKg: true }
	});
	const prevAvgWeightRaw = averageRaw(
		previousPeriodDailyLogs
			.map((log) => toNumberOrNull(log.weightKg))
			.filter((value): value is number => value !== null)
	);
	const weightDeltaVsPrevPeriod =
		avgWeightRaw !== null && prevAvgWeightRaw !== null
			? roundTo(avgWeightRaw - prevAvgWeightRaw, 2)
			: null;

	const rollingEndDay = startOfUtcDay(new Date(`${endDate}T00:00:00.000Z`));
	const rollingChunkTdees = await Promise.all(
		[0, 1, 2, 3].map(async (chunkIndex) => {
			const chunkEnd = addDays(rollingEndDay, -7 * chunkIndex);
			const chunkStart = addDays(chunkEnd, -6);
			const { dailyLogs: chunkDailyLogs, habitLogs: chunkHabitLogs } = await fetchPeriodLogs(
				userId,
				chunkStart,
				chunkEnd
			);
			return computeEstimatedTDEEForRange(chunkDailyLogs, chunkHabitLogs, 7);
		})
	);
	const validRollingTdees = rollingChunkTdees.filter((value): value is number => value !== null);
	const rollingAvgTDEE =
		validRollingTdees.length >= 2 ? roundTo(validRollingTdees.reduce((sum, value) => sum + value, 0) / validRollingTdees.length, 1) : null;

	const baselineTDEE = (() => {
		if (!userProfile) {
			return null;
		}

		const age = userProfile.age;
		const gender = userProfile.gender;
		const heightCm = userProfile.heightCm;
		const activityLevel = userProfile.activityLevel;
		if (age === null || gender === null || heightCm === null || activityLevel === null || avgWeightRaw === null) {
			return null;
		}

		const multiplier = LIFESTYLE_MULTIPLIERS[activityLevel] ?? 1.2;
		const bmr = mifflinBMR(gender, avgWeightRaw, Number(heightCm), age);
		return Math.round(bmr * multiplier);
	})();

	const dailyLogSummaries: DailyLogSummary[] = dailyLogs.map((log) => {
		const dateKey = toDateOnlyString(log.date);
		const caloriesBurned = roundTo(burnedByDate.get(dateKey) ?? 0, 1);
		const netCalories =
			log.caloriesConsumed !== null ? roundTo(log.caloriesConsumed - caloriesBurned, 1) : null;

		return {
			date: dateKey,
			weightKg: toNumberOrNull(log.weightKg),
			caloriesConsumed: log.caloriesConsumed,
			caloriesBurned,
			netCalories,
			proteinG: log.proteinG,
			carbsG: log.carbsG,
			fatTotalG: log.fatTotalG,
			fatSaturatedG: log.fatSaturatedG,
			fatUnsaturatedG: log.fatUnsaturatedG,
			fiberG: log.fiberG,
			sugarsG: log.sugarsG,
			sodiumMg: log.sodiumMg,
			calciumMg: log.calciumMg,
			waterLitres: toNumberOrNull(log.waterLitres),
			dayType: log.dayType
		};
	});

	const rangeHabitLogByHabitDate = new Map<string, HabitLogWithHabit>();
	for (const habitLog of habitLogs) {
		rangeHabitLogByHabitDate.set(`${habitLog.habitId}:${toDateOnlyString(habitLog.logDate)}`, habitLog);
	}

	const todayStart = startOfUtcDay(new Date());
	const todayDateString = toDateOnlyString(todayStart);

	let historicalHabitLogs: HabitLog[] = [];
	if (habits.length > 0) {
		const earliestHabitCreatedAt = habits
			.map((habit) => startOfUtcDay(habit.createdAt).getTime())
			.reduce((min, current) => Math.min(min, current), Number.MAX_SAFE_INTEGER);

		historicalHabitLogs = await prisma.habitLog.findMany({
			where: {
				userId,
				logDate: {
					gte: new Date(earliestHabitCreatedAt),
					lte: endOfUtcDay(todayStart)
				}
			},
			orderBy: { logDate: 'asc' }
		});
	}

	const historicalHabitLogByHabitDate = new Map<string, HabitLog>();
	for (const habitLog of historicalHabitLogs) {
		historicalHabitLogByHabitDate.set(
			`${habitLog.habitId}:${toDateOnlyString(habitLog.logDate)}`,
			habitLog
		);
	}

	const habitSummaries: HabitPeriodSummary[] = habits.map((habit) => {
		const habitType = normalizeHabitType(habit.habitType);
		const scheduledDays = parseScheduledValues(habit.scheduledDays);
		const scheduledDates = parseScheduledValues(habit.scheduledDates);
		const createdDay = startOfUtcDay(habit.createdAt);

		const dailyValues = periodDayStrings.map((dateString) => {
			const log = rangeHabitLogByHabitDate.get(`${habit.id}:${dateString}`);
			return {
				date: dateString,
				value: log ? toNumberOrNull(log.value) : null,
				caloriesBurned: log ? toNumberOrNull(log.caloriesBurned) : null
			};
		});

		const totalCaloriesBurned = roundTo(
			dailyValues.reduce((sum, item) => sum + (item.caloriesBurned ?? 0), 0),
			1
		);

		const isCompletedOnDate = (date: Date): boolean => {
			const dateKey = toDateOnlyString(date);
			const log = historicalHabitLogByHabitDate.get(`${habit.id}:${dateKey}`);
			return isCompletion(habitType, log?.value);
		};

		let currentStreak = 0;
		for (let offset = 0; offset < 365; offset += 1) {
			const date = addDays(todayStart, -offset);
			if (date.getTime() < createdDay.getTime()) {
				break;
			}

			if (!isScheduledDay(habit.frequencyType, scheduledDays, scheduledDates, date)) {
				continue;
			}

			if (isCompletedOnDate(date)) {
				currentStreak += 1;
			} else {
				break;
			}
		}

		let longestStreak = 0;
		let runningStreak = 0;
		for (
			let cursor = new Date(createdDay);
			cursor.getTime() <= todayStart.getTime();
			cursor = addDays(cursor, 1)
		) {
			if (!isScheduledDay(habit.frequencyType, scheduledDays, scheduledDates, cursor)) {
				continue;
			}

			if (isCompletedOnDate(cursor)) {
				runningStreak += 1;
				if (runningStreak > longestStreak) {
					longestStreak = runningStreak;
				}
			} else {
				runningStreak = 0;
			}
		}

		let totalScheduledDaysInPeriod = 0;
		let completedScheduledDaysInPeriod = 0;

		for (const dateString of periodDayStrings) {
			if (dateString > todayDateString) {
				continue;
			}

			const date = new Date(`${dateString}T00:00:00.000Z`);
			if (date.getTime() < createdDay.getTime()) {
				continue;
			}

			if (!isScheduledDay(habit.frequencyType, scheduledDays, scheduledDates, date)) {
				continue;
			}

			totalScheduledDaysInPeriod += 1;
			if (isCompletedOnDate(date)) {
				completedScheduledDaysInPeriod += 1;
			}
		}

		const completionRate =
			totalScheduledDaysInPeriod > 0
				? roundTo((completedScheduledDaysInPeriod / totalScheduledDaysInPeriod) * 100, 1)
				: 0;

		const totalCompletions = dailyValues.filter((entry) => {
			if (habitType === 'boolean') {
				return entry.value !== null && entry.value >= 1;
			}
			return entry.value !== null && entry.value > 0;
		}).length;

		return {
			habitId: habit.id,
			habitName: habit.name,
			habitType,
			frequencyType: habit.frequencyType,
			scheduledDays,
			scheduledDates,
			targetValue: toNumberOrNull(habit.targetValue),
			targetDirection:
				habit.targetDirection === 'at_least' || habit.targetDirection === 'at_most'
					? habit.targetDirection
					: null,
			isCalorieBurning: habit.isCalorieBurning,
			dailyValues,
			totalCaloriesBurned,
			completionRate,
			currentStreak,
			longestStreak,
			totalCompletions
		};
	});

	return {
		startDate,
		endDate,
		daysLogged: dailyLogs.length,
		avgWeightKg: avgWeightRaw === null ? null : roundTo(avgWeightRaw, 2),
		weightDeltaVsPrevPeriod,
		avgCaloriesConsumed: avgCaloriesConsumedRaw === null ? null : roundTo(avgCaloriesConsumedRaw, 1),
		avgCaloriesBurned: avgCaloriesBurnedRaw === null ? null : roundTo(avgCaloriesBurnedRaw, 1),
		avgNetCalories: avgNetCaloriesRaw === null ? null : roundTo(avgNetCaloriesRaw, 1),
		totalPeriodDeficitSurplus,
		avgProteinG: averageRounded(
			dailyLogs.map((log) => log.proteinG).filter((value): value is number => value !== null),
			1
		),
		avgCarbsG: averageRounded(
			dailyLogs.map((log) => log.carbsG).filter((value): value is number => value !== null),
			1
		),
		avgFatTotalG: averageRounded(
			dailyLogs.map((log) => log.fatTotalG).filter((value): value is number => value !== null),
			1
		),
		avgFatSaturatedG: averageRounded(
			dailyLogs
				.map((log) => log.fatSaturatedG)
				.filter((value): value is number => value !== null),
			1
		),
		avgFatUnsaturatedG: averageRounded(
			dailyLogs
				.map((log) => log.fatUnsaturatedG)
				.filter((value): value is number => value !== null),
			1
		),
		avgFatTransG: averageRounded(
			dailyLogs
				.map((log) => toNumberOrNull(log.fatTransG))
				.filter((value): value is number => value !== null),
			1
		),
		avgFiberG: averageRounded(
			dailyLogs.map((log) => log.fiberG).filter((value): value is number => value !== null),
			1
		),
		avgSugarsG: averageRounded(
			dailyLogs.map((log) => log.sugarsG).filter((value): value is number => value !== null),
			1
		),
		avgSodiumMg: averageRounded(
			dailyLogs.map((log) => log.sodiumMg).filter((value): value is number => value !== null),
			1
		),
		avgCalciumMg: averageRounded(
			dailyLogs.map((log) => log.calciumMg).filter((value): value is number => value !== null),
			1
		),
		avgMagnesiumMg: averageRounded(
			dailyLogs.map((log) => log.magnesiumMg).filter((value): value is number => value !== null),
			1
		),
		avgIronMg: averageRounded(
			dailyLogs
				.map((log) => toNumberOrNull(log.ironMg))
				.filter((value): value is number => value !== null),
			1
		),
		avgZincMg: averageRounded(
			dailyLogs
				.map((log) => toNumberOrNull(log.zincMg))
				.filter((value): value is number => value !== null),
			1
		),
		avgWaterLitres: averageRounded(
			dailyLogs
				.map((log) => toNumberOrNull(log.waterLitres))
				.filter((value): value is number => value !== null),
			1
		),
		normalDays: dailyLogs.filter((log) => log.dayType === 'normal').length,
		restaurantDays: dailyLogs.filter((log) => log.dayType === 'restaurant').length,
		estimatedTDEE,
		tdeeConfidenceBand: estimatedTDEE === null ? null : roundTo(estimatedTDEE * 0.1, 1),
		rollingAvgTDEE,
		baselineTDEE,
		dailyLogSummaries,
		habitSummaries
	};
};
