import { z } from 'zod';

export const dashboardLayoutSchema = z.object({
	layoutJson: z
		.array(
			z.object({
				widgetId: z.string(),
				position: z.number().int().nonnegative(),
				size: z.enum(['small', 'medium', 'large'])
			})
		)
		.max(8)
});

export type DashboardLayoutInput = z.infer<typeof dashboardLayoutSchema>;
