import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { logsApi } from '../lib/api';
import type { CreateDailyLogInput, UpdateDailyLogInput } from '../types';

export const useLogs = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['logs', params],
    queryFn: async () => (await logsApi.list(params)).data
  });
};

export const useLogByDate = (date: string) => {
  return useQuery({
    queryKey: ['log', date],
    queryFn: async () => {
      try {
        return (await logsApi.getByDate(date)).data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
          return null;
        }

        throw error;
      }
    },
    enabled: date.length > 0
  });
};

export const useCreateLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDailyLogInput) => (await logsApi.create(data)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
    }
  });
};

export const useUpdateLog = (date: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateDailyLogInput) => (await logsApi.update(date, data)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['logs'] });
      void queryClient.invalidateQueries({ queryKey: ['log', date] });
    }
  });
};
