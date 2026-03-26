import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const habitBaseObjectSchema = z.object({
	name: z.string().min(1).max(60),
	habitType: z.enum(['count', 'boolean']),
	unitLabel: z.string().max(30).optional(),
	frequencyType: z.enum([
		'daily',
		'weekly',
		'monthly',
		'x_per_week',
		'x_per_month',
		'x_in_y_days'
	]),
	frequencyX: z.number().int().positive().optional(),
	frequencyY: z.number().int().positive().optional(),
	targetValue: z.number().nonnegative().optional(),
	targetDirection: z.enum(['at_least', 'at_most']).optional(),
	isCalorieBurning: z.boolean().default(false),
	calorieUnit: z.number().positive().optional(),
	calorieKcal: z.number().positive().optional()
});

export const habitCreateSchema = habitBaseObjectSchema.superRefine((data, ctx) => {
	if (data.isCalorieBurning && (!data.calorieUnit || !data.calorieKcal)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'calorieUnit and calorieKcal are required when isCalorieBurning is true',
			path: ['isCalorieBurning']
		});
	}
});

export const habitUpdateSchema = habitBaseObjectSchema
	.partial()
	.superRefine((data, ctx) => {
		if (data.isCalorieBurning === true) {
			if (!data.calorieUnit || !data.calorieKcal) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'calorieUnit and calorieKcal are required when isCalorieBurning is true',
					path: ['isCalorieBurning']
				});
			}
		}
	});

export const habitLogUpsertSchema = z.object({
	habitId: z.string().uuid(),
	logDate: z.string().regex(dateRegex),
	value: z.number().nonnegative(),
	notes: z.string().max(300).optional()
});

export const reorderSchema = z.object({
	orderedIds: z.array(z.string().uuid())
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
export type HabitLogUpsertInput = z.infer<typeof habitLogUpsertSchema>;
