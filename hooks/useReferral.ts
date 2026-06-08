import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { ReferralCode, Referral, UseReferralCodeResult } from '@/types/referral';

export function useMyReferralCode() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['referral-code', user?.id],
    queryFn: async (): Promise<ReferralCode | null> => {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) return data as ReferralCode;

      // Код не найден — генерируем через RPC и возвращаем результат
      const { error: genError } = await supabase
        .rpc('generate_referral_code', { p_user_id: user!.id });
      if (genError) throw genError;

      const { data: newData, error: fetchError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (fetchError) throw fetchError;
      return newData as ReferralCode;
    },
    enabled: !!user?.id,
  });
}

export function useMyReferrals() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async (): Promise<Referral[]> => {
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Referral[]) ?? [];
    },
    enabled: !!user?.id,
  });
}

export function useApplyReferralCode() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  return useMutation({
    mutationFn: async (code: string): Promise<UseReferralCodeResult> => {
      const { data, error } = await supabase.rpc('use_referral_code', { p_code: code });
      if (error) throw error;
      return data as UseReferralCodeResult;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['referrals', user?.id] });
    },
  });
}
