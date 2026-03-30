import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../lib/api';
import type { WeeklyAnalytics } from '../types';

const extractWeeklyAnalyticsPayload = (
  payload: WeeklyAnalytics | { data?: WeeklyAnalytics }
): WeeklyAnalytics => {
  if (payload && typeof payload === 'object' && 'data' in payload && payload.data) {
    return payload.data;
  }

  return payload as WeeklyAnalytics;
};

export const useWeeklyAnalytics = (week: string) => {
  const normalizedWeek = week.trim();

  return useQuery({
    queryKey: ['analytics', normalizedWeek],
    queryFn: async () => {
      const response = await analyticsApi.weekly(normalizedWeek);
      return extractWeeklyAnalyticsPayload(response.data);
    },
    enabled: normalizedWeek.length > 0
  });
};
