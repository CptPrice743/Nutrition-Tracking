import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { habitLogsApi, habitsApi } from '../lib/api';
import type { CreateHabitInput, UpdateHabitInput, UpsertHabitLogInput } from '../types';

export const useHabits = () => {
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => (await habitsApi.list()).data
  });
};

export const useCreateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateHabitInput) => (await habitsApi.create(payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });
};

export const useUpdateHabit = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateHabitInput) => (await habitsApi.update(id, payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });
};

export const useArchiveHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => (await habitsApi.archive(id)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });
};

export const useReorderHabits = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => (await habitsApi.reorder(orderedIds)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });
};

export const useUpsertHabitLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertHabitLogInput) => (await habitLogsApi.upsert(payload)).data,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['habit-logs'] });
    }
  });
};
