import { z } from 'zod';

export const sessionCreateSchema = z.object({
	idToken: z.string().min(1)
});
