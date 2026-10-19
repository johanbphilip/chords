import { useQuery } from '@tanstack/react-query';
import { ApiError, apiGet, getToken } from './api';

export interface Me {
  email: string;
  role: 'admin' | 'member';
}

/** The signed-in Member, or null when signed out. */
export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async (): Promise<Me | null> => {
      if (!getToken()) return null;
      try {
        return await apiGet<Me>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    retry: false,
  });
}
