import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';

export const useWeeklyAnalytics = (week: string) => {
  const normalizedWeek = week?.trim() ?? '';

  return useQuery({
    queryKey: ['analytics', normalizedWeek],
    queryFn: async () => {
      const response = await analyticsApi.weekly(normalizedWeek);
      return response.data;
    },
    enabled: normalizedWeek.length > 0,
  });
};
