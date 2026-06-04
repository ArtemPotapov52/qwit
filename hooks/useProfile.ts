import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function useProfile() {
  const { user, guestMode } = useAuthStore();

  const remoteQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async (): Promise<Profile> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id && !guestMode,
  });

  if (guestMode) {
    return {
      data: { id: user?.id ?? '', display_name: 'Dev', avatar_url: null } as Profile,
      isLoading: false,
      error: null,
    };
  }
  return remoteQuery;
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  return () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
}
