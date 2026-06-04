import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';
import { CatKey } from '@/constants/colors';

interface CreateGroupInput {
  cat: CatKey;
  name: string;
}

export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cat, name }: CreateGroupInput) => {
      const { user, guestMode } = useAuthStore.getState();

      if (guestMode) {
        return useLocalGroupsStore.getState().addGroup(cat, name);
      }

      if (!user?.id) throw new Error('Не авторизован');

      // Используем SECURITY DEFINER функцию — обходит RLS
      const { data: group, error: groupErr } = await supabase
        .rpc('create_group', { p_name: name, p_category: cat, p_user_id: user.id });
      if (groupErr) throw groupErr;

      return group;
    },
    onSuccess: () => {
      const { user, guestMode } = useAuthStore.getState();
      if (!guestMode) {
        queryClient.invalidateQueries({ queryKey: ['groups', user?.id] });
      }
    },
  });
}
