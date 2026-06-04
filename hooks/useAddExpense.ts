import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';

export interface AddExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  paidById: string;
  memberIds: string[];
}

export function useAddExpense() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, title, amount, paidById, memberIds }: AddExpenseInput) => {
      const { user, guestMode, displayName } = useAuthStore.getState();

      if (guestMode) {
        useLocalGroupsStore.getState().addExpense(groupId, title, amount, displayName ?? 'Dev');
        return { id: `exp-${Date.now()}`, group_id: groupId, title, amount };
      }

      if (!user?.id) throw new Error('Не авторизован');

      const { data: expense, error: expErr } = await supabase
        .rpc('add_expense', {
          p_group_id: groupId,
          p_title: title.trim(),
          p_amount: amount,
          p_paid_by: paidById,
          p_member_ids: memberIds,
        });
      if (expErr) throw expErr;

      return expense;
    },
    onSuccess: (_, vars) => {
      const userId = useAuthStore.getState().user?.id;
      qc.invalidateQueries({ queryKey: ['group', vars.groupId] });
      qc.invalidateQueries({ queryKey: ['groups', userId] });
      qc.invalidateQueries({ queryKey: ['activity', userId] });
      qc.invalidateQueries({ queryKey: ['stats', userId] });
    },
  });
}
