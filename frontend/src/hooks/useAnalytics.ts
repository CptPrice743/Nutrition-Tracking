import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../lib/api';

export const useAnalytics = ({
  startDate,
  endDate
}: {
  startDate: string;
  endDate: string;
}) => {
  const normalizedStartDate = startDate?.trim() ?? '';
  const normalizedEndDate = endDate?.trim() ?? '';

  return useQuery({
    queryKey: ['analytics', normalizedStartDate, normalizedEndDate],
    queryFn: async () =>
      (
        await analyticsApi.get({
          startDate: normalizedStartDate,
          endDate: normalizedEndDate
        })
      ).data,
    enabled: normalizedStartDate.length > 0 && normalizedEndDate.length > 0
  });
};
