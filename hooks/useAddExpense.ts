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
        .from('expenses')
        .insert({ group_id: groupId, paid_by: paidById, title: title.trim(), amount })
        .select()
        .single();
      if (expErr) throw expErr;

      const share = Math.round((amount / memberIds.length) * 100) / 100;
      const splits = memberIds.map(uid => ({
        expense_id: expense.id,
        user_id: uid,
        amount: share,
        settled: false,
      }));
      const { error: splitErr } = await supabase.from('expense_splits').insert(splits);
      if (splitErr) throw splitErr;

      await supabase.rpc('recalculate_balances', { p_group_id: groupId });

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
