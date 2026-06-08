import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';
import { getMemberPushTokens } from '@/hooks/usePushNotifications';
import { sendPushNotifications } from '@/lib/notifications';
import { fmt } from '@/lib/format';

export interface AddExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  paidById: string;      // group_members.id
  memberIds: string[];   // group_members.id[]
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

      // ── Отправляем уведомления должникам ──
      // Получаем user_id для каждого member_id (кроме плательщика)
      const splitMemberIds = memberIds.filter(id => id !== paidById);
      if (splitMemberIds.length > 0) {
        const { data: members } = await supabase
          .from('group_members')
          .select('id, user_id')
          .in('id', splitMemberIds)
          .not('user_id', 'is', null);

        const otherUserIds = (members ?? [])
          .map(m => m.user_id as string)
          .filter(uid => uid && uid !== user.id);

        if (otherUserIds.length > 0) {
          const tokenMap = await getMemberPushTokens(otherUserIds);
          const share = Math.round((amount / memberIds.length) * 100) / 100;
          const payerName = user.user_metadata?.display_name ?? 'Кто-то';

          const messages = otherUserIds
            .filter(uid => tokenMap[uid])
            .map(uid => ({
              to: tokenMap[uid],
              title: 'qwit · новый расход',
              body: `${payerName} добавил «${title.trim()}» — ты должен ${fmt(share, false)}`,
              data: { groupId, type: 'new_expense' },
            }));

          await sendPushNotifications(messages);
        }
      }

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
