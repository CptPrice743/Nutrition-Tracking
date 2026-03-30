import { z } from 'zod';

export const sessionCreateSchema = z.object({
	idToken: z.string().min(1)
});

export const updateMeSchema = z.object({
	displayName: z.string().trim().max(100)
});
