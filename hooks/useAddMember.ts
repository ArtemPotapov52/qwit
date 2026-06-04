import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

export interface FoundUser {
  id: string;
  display_name: string | null;
  code: string;
}

export function userCodeFromId(id: string): string {
  return (id.split('-').pop() ?? id.slice(-12)).toUpperCase();
}

// Возвращает до 5 пользователей, чей UUID содержит введённую строку
export async function searchUsersByPartial(query: string): Promise<FoundUser[]> {
  if (query.trim().length < 3) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name')
    .ilike('id', `%${query.toLowerCase()}%`)
    .limit(5);
  if (error || !data) return [];
  return (data as { id: string; display_name: string | null }[]).map(row => ({
    id: row.id,
    display_name: row.display_name ?? null,
    code: userCodeFromId(row.id),
  }));
}

export function useAddMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { user } = useAuthStore.getState();
      if (!user?.id) throw new Error('Не авторизован');

      const { error } = await supabase
        .from('group_members')
        .insert({ group_id: groupId, user_id: userId, role: 'member' });
      if (error) {
        if (error.code === '23505') throw new Error('Пользователь уже в группе');
        throw error;
      }

      // Записываем в ленту
      await supabase
        .from('activity')
        .insert({ group_id: groupId, actor_id: userId, type: 'member_joined', payload: {} });
    },
    onSuccess: () => {
      const uid = useAuthStore.getState().user?.id;
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['activity', uid] });
      qc.invalidateQueries({ queryKey: ['groups', uid] });
    },
  });
}
