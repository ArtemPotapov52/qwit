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

      // Гарантируем профиль (анонимный пользователь может войти раньше триггера)
      await supabase.from('profiles').upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true });

      const { data: group, error: groupErr } = await supabase
        .from('groups')
        .insert({ name, category: cat, created_by: user.id })
        .select()
        .single();
      if (groupErr) throw groupErr;

      const { error: memberErr } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id, role: 'admin' });
      if (memberErr) throw memberErr;

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
