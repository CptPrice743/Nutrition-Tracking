import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { dashboardApi } from '../lib/api';
import type { DashboardWidgetLayout } from '../types';

export const useDashboardLayout = () => {
  return useQuery({
    queryKey: ['dashboard-layout'],
    queryFn: async () => (await dashboardApi.getLayout()).data
  });
};

export const useSaveDashboardLayout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (layoutJson: DashboardWidgetLayout[]) =>
      (await dashboardApi.saveLayout(layoutJson)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] });
    }
  });
};
