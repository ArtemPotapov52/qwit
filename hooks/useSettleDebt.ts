import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { getMemberPushTokens } from '@/hooks/usePushNotifications';
import { sendPushNotifications } from '@/lib/notifications';
import { fmt } from '@/lib/format';

// Телефон участника: сначала profiles.phone, потом auth.users.phone
export function useRecipientPhone(userId: string | null) {
  return useQuery({
    queryKey: ['profile-phone', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_member_phone', { p_user_id: userId! });
      if (error) throw error;
      return (data ?? null) as string | null;
    },
    enabled: !!userId,
  });
}

export function useSavePhone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      memberId,
      phone,
    }: { userId?: string | null; memberId?: string | null; phone: string }) => {
      if (userId) {
        const { error } = await supabase
          .from('profiles')
          .update({ phone })
          .eq('id', userId);
        if (error) throw error;
      } else if (memberId) {
        // Гость — сохраняем в group_members
        const { error } = await supabase
          .from('group_members')
          .update({ guest_phone: phone })
          .eq('id', memberId);
        if (error) throw error;
      }
    },
    onSuccess: (_, { userId }) => {
      if (userId) qc.invalidateQueries({ queryKey: ['profile-phone', userId] });
    },
  });
}

export function useSettleDebt() {
  const qc = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (params: {
      groupId: string;
      fromMemberId: string;
      toMemberId: string;
      amount: number;
      paymentMethod?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_settlement', {
        p_group_id:        params.groupId,
        p_from_member:     params.fromMemberId,
        p_to_member:       params.toMemberId,
        p_amount:          params.amount,
        p_payment_method:  params.paymentMethod ?? 'sbp',
      });
      if (error) throw error;

      // ── Уведомление получателю (кредитору) ──
      const { data: toMember } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('id', params.toMemberId)
        .single();

      const toUserId = toMember?.user_id;
      const currentUser = user;

      if (toUserId && currentUser && toUserId !== currentUser.id) {
        const tokenMap = await getMemberPushTokens([toUserId]);
        const token = tokenMap[toUserId];
        if (token) {
          const senderName = currentUser.user_metadata?.display_name ?? 'Кто-то';
          await sendPushNotifications([{
            to: token,
            title: 'qwit · перевод получен',
            body: `${senderName} погасил долг ${fmt(params.amount, false)} ✓`,
            data: { groupId: params.groupId, type: 'settlement' },
          }]);
        }
      }

      return data as string;
    },
    onSuccess: (_, { groupId }) => {
      const uid = user?.id;
      qc.invalidateQueries({ queryKey: ['group', groupId] });
      qc.invalidateQueries({ queryKey: ['groups', uid] });
      qc.invalidateQueries({ queryKey: ['stats', uid] });
      qc.invalidateQueries({ queryKey: ['activity', uid] });
    },
  });
}
