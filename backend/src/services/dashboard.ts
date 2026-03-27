import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

type WidgetSize = 'small' | 'medium' | 'large';

export type DashboardWidgetLayout = {
	widgetId: string;
	position: number;
	size: WidgetSize;
};

const defaultLayout: DashboardWidgetLayout[] = [
	{ widgetId: 'calories-today', position: 0, size: 'large' },
	{ widgetId: 'weight-trend', position: 1, size: 'medium' },
	{ widgetId: 'macro-donut', position: 2, size: 'medium' },
	{ widgetId: 'water-ring', position: 3, size: 'small' }
];

export const getLayout = async (userId: string): Promise<DashboardWidgetLayout[]> => {
	const layout = await prisma.dashboardLayout.findFirst({
		where: { userId }
	});

	if (!layout) {
		return defaultLayout;
	}

	return layout.layoutJson as unknown as DashboardWidgetLayout[];
};

export const saveLayout = async (
	userId: string,
	layoutJson: DashboardWidgetLayout[]
): Promise<DashboardWidgetLayout[]> => {
	const saved = await prisma.dashboardLayout.upsert({
		where: { userId },
		update: {
			layoutJson: layoutJson as unknown as Prisma.JsonArray
		},
		create: {
			userId,
			layoutJson: layoutJson as unknown as Prisma.JsonArray
		}
	});

	return saved.layoutJson as unknown as DashboardWidgetLayout[];
};
