import { z } from 'zod';

export const weeklyAnalyticsQuerySchema = z.object({
	week: z.string().regex(/^\d{4}-W\d{2}$/)
});
