import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../lib/api';

export const useWeeklyAnalytics = (week: string) => {
  return useQuery({
    queryKey: ['analytics', week],
    queryFn: async () => (await analyticsApi.weekly(week)).data,
    enabled: week.length > 0
  });
};
