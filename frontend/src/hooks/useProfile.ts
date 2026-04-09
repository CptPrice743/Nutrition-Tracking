import { useMutation, useQueryClient } from '@tanstack/react-query';

import { usersApi } from '../lib/api';
import type { UpdateProfileInput } from '../types';
import { useAuth } from './useAuth';

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { setUserProfile } = useAuth();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const response = await usersApi.updateMe(data);
      return response.data.user;
    },
    onSuccess: async (updatedUser) => {
      setUserProfile(updatedUser);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });
};
