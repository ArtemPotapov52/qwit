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

export async function searchUsersByPartial(query: string): Promise<FoundUser[]> {
  if (query.trim().length < 3) return [];
  const { data, error } = await supabase
    .rpc('search_profiles', { query: query.trim().toLowerCase() });
  if (error || !data) return [];
  return (data as { id: string; display_name: string | null }[]).map(row => ({
    id: row.id,
    display_name: row.display_name ?? null,
    code: userCodeFromId(row.id),
  }));
}

// Добавить зарегистрированного пользователя по его profiles.id
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

// Добавить гостя (без регистрации) — только имя и опционально телефон
export function useAddGuestMember(groupId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone?: string }) => {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          guest_name: name.trim(),
          guest_phone: phone?.trim() || null,
          role: 'member',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      const uid = useAuthStore.getState().user?.id;
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups', uid] });
    },
  });
}
