import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { AddExpenseByItemsPayload, ExpenseItemInput } from '@/types/expense';

function validateItems(items: ExpenseItemInput[], totalAmount: number): string | null {
  if (items.length === 0) return 'Добавьте хотя бы одну позицию';
  for (const item of items) {
    if (!item.title.trim()) return 'Укажите название позиции';
    const amt = parseFloat(item.amount.replace(',', '.'));
    if (isNaN(amt) || amt <= 0) return 'Сумма позиции должна быть больше нуля';
    if (item.memberIds.length === 0) return `Позиция "${item.title}" — укажите хотя бы одного участника`;
  }
  const itemsTotal = items.reduce((s, i) => s + parseFloat(i.amount.replace(',', '.')), 0);
  if (Math.abs(itemsTotal - totalAmount) > 0.01) {
    return `Сумма позиций ${itemsTotal.toFixed(2)} ≠ сумме расхода ${totalAmount.toFixed(2)}`;
  }
  return null;
}

export { validateItems };

export function useAddExpenseByItems() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (payload: AddExpenseByItemsPayload) => {
      const totalAmount = payload.items.reduce(
        (s, i) => s + parseFloat(i.amount.replace(',', '.')),
        0,
      );

      const itemsJson = payload.items.map((item, idx) => ({
        title: item.title.trim(),
        amount: parseFloat(item.amount.replace(',', '.')),
        position: idx,
        member_ids: item.memberIds,
      }));

      const { data, error } = await supabase.rpc('add_expense_by_items', {
        p_group_id: payload.groupId,
        p_title: payload.title.trim(),
        p_amount: totalAmount,
        p_paid_by: payload.paidById,
        p_items: itemsJson,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (_, { groupId }) => {
      const uid = user?.id;
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups', uid] });
      qc.invalidateQueries({ queryKey: ['activity', uid] });
      qc.invalidateQueries({ queryKey: ['stats', uid] });
    },
  });
}
