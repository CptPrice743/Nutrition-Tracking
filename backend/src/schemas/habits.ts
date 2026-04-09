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
	scheduledDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
	scheduledDates: z.array(z.number().int().min(1).max(31)).max(31).optional(),
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

export const habitImportRowSchema = z.object({
	name: z.string().min(1).max(60),
	habit_type: z.enum(['count', 'boolean']),
	unit_label: z.string().max(30).optional(),
	frequency_type: z.enum([
		'daily',
		'weekly',
		'monthly',
		'x_per_week',
		'x_per_month',
		'x_in_y_days'
	]),
	frequency_x: z.coerce.number().int().positive().optional(),
	frequency_y: z.coerce.number().int().positive().optional(),
	target_value: z.coerce.number().nonnegative().optional(),
	target_direction: z.enum(['at_least', 'at_most']).optional(),
	is_calorie_burning: z.enum(['true', 'false']).transform((v) => v === 'true'),
	calorie_unit: z.coerce.number().positive().optional(),
	calorie_kcal: z.coerce.number().positive().optional(),
	scheduled_days: z.string().optional(),
	scheduled_dates: z.string().optional(),
	is_active: z.enum(['true', 'false']).transform((v) => v === 'true').default('true' as never),
	display_order: z.coerce.number().int().nonnegative().optional()
});

export const habitLogImportRowSchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	habit_name: z.string().min(1),
	value: z.coerce.number().nonnegative(),
	calories_burned: z.coerce.number().nonnegative().optional(),
	notes: z.string().max(300).optional()
});

export const habitImportConfirmSchema = z.object({
	definitionsData: z.string().optional(),
	logsData: z.string().optional(),
	conflictResolutions: z
		.array(
			z.object({
				habitName: z.string(),
				resolution: z.enum(['link', 'create_new', 'overwrite'])
			})
		)
		.default([])
});

export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type HabitUpdateInput = z.infer<typeof habitUpdateSchema>;
export type HabitLogUpsertInput = z.infer<typeof habitLogUpsertSchema>;
export type HabitImportRowInput = z.infer<typeof habitImportRowSchema>;
export type HabitLogImportRowInput = z.infer<typeof habitLogImportRowSchema>;
export type HabitImportConfirmInput = z.infer<typeof habitImportConfirmSchema>;
