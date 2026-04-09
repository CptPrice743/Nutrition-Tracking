import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const dailyLogFields = {
	date: z.string().regex(dateRegex),
	weightKg: z.number().positive().max(500),
	caloriesConsumed: z.number().int().nonnegative(),
	proteinG: z.number().int().nonnegative(),
	carbsG: z.number().int().nonnegative(),
	fatTotalG: z.number().int().nonnegative(),
	fatSaturatedG: z.number().int().nonnegative(),
	fatUnsaturatedG: z.number().int().nonnegative(),
	fatTransG: z.number().nonnegative(),
	fiberG: z.number().int().nonnegative(),
	sugarsG: z.number().int().nonnegative(),
	sodiumMg: z.number().int().nonnegative(),
	calciumMg: z.number().int().nonnegative(),
	magnesiumMg: z.number().int().nonnegative(),
	ironMg: z.number().nonnegative(),
	zincMg: z.number().nonnegative(),
	waterLitres: z.number().nonnegative().max(20),
	dayType: z.enum(['normal', 'restaurant']),
	notes: z.string().max(1000)
};

export const dailyLogCreateSchema = z.object({
	date: dailyLogFields.date,
	weightKg: dailyLogFields.weightKg.optional(),
	caloriesConsumed: dailyLogFields.caloriesConsumed.optional(),
	proteinG: dailyLogFields.proteinG.optional(),
	carbsG: dailyLogFields.carbsG.optional(),
	fatTotalG: dailyLogFields.fatTotalG.optional(),
	fatSaturatedG: dailyLogFields.fatSaturatedG.optional(),
	fatUnsaturatedG: dailyLogFields.fatUnsaturatedG.optional(),
	fatTransG: dailyLogFields.fatTransG.optional(),
	fiberG: dailyLogFields.fiberG.optional(),
	sugarsG: dailyLogFields.sugarsG.optional(),
	sodiumMg: dailyLogFields.sodiumMg.optional(),
	calciumMg: dailyLogFields.calciumMg.optional(),
	magnesiumMg: dailyLogFields.magnesiumMg.optional(),
	ironMg: dailyLogFields.ironMg.optional(),
	zincMg: dailyLogFields.zincMg.optional(),
	waterLitres: dailyLogFields.waterLitres.optional(),
	dayType: dailyLogFields.dayType.optional(),
	notes: dailyLogFields.notes.optional()
});

export const dailyLogUpdateSchema = z
	.object({
		date: dailyLogFields.date.optional(),
		weightKg: dailyLogFields.weightKg.optional(),
		caloriesConsumed: dailyLogFields.caloriesConsumed.optional(),
		proteinG: dailyLogFields.proteinG.optional(),
		carbsG: dailyLogFields.carbsG.optional(),
		fatTotalG: dailyLogFields.fatTotalG.optional(),
		fatSaturatedG: dailyLogFields.fatSaturatedG.optional(),
		fatUnsaturatedG: dailyLogFields.fatUnsaturatedG.optional(),
		fatTransG: dailyLogFields.fatTransG.optional(),
		fiberG: dailyLogFields.fiberG.optional(),
		sugarsG: dailyLogFields.sugarsG.optional(),
		sodiumMg: dailyLogFields.sodiumMg.optional(),
		calciumMg: dailyLogFields.calciumMg.optional(),
		magnesiumMg: dailyLogFields.magnesiumMg.optional(),
		ironMg: dailyLogFields.ironMg.optional(),
		zincMg: dailyLogFields.zincMg.optional(),
		waterLitres: dailyLogFields.waterLitres.optional(),
		dayType: dailyLogFields.dayType.optional(),
		notes: dailyLogFields.notes.optional()
	})
	.strict();

export type DailyLogCreateInput = z.infer<typeof dailyLogCreateSchema>;
export type DailyLogUpdateInput = z.infer<typeof dailyLogUpdateSchema>;
