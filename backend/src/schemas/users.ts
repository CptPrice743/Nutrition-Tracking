import { z } from 'zod';

export const updateProfileSchema = z.object({
	displayName: z.string().min(1).max(60).optional(),
	age: z.number().int().min(11).max(120).optional(),
	gender: z.enum(['male', 'female', 'other']).optional(),
	heightCm: z.number().min(100).max(250).optional(),
	activityLevel: z.enum(['sedentary', 'light_active', 'highly_active']).optional(),
	calorieTarget: z.number().int().min(500).max(10000).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;