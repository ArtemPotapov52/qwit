import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { CatKey } from '@/constants/colors';

export interface StatCategory {
  cat: CatKey;
  amount: number;
}

export interface StatGroup {
  id: string;
  cat: CatKey;
  name: string;
  amount: number;
}

export interface StatsData {
  categories: StatCategory[];
  groups: StatGroup[];
  total: number;
  periodLabel: string;
  expenseCount: number;
}

async function fetchStats(userId: string, period: 'month' | 'year'): Promise<StatsData> {
  const now = new Date();
  let fromDate: string;
  let periodLabel: string;

  if (period === 'month') {
    fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    periodLabel = now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
  } else {
    fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
    periodLabel = String(now.getFullYear());
  }

  // Load group metadata for current user's groups
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups ( id, name, category )')
    .eq('user_id', userId);

  if (!memberships?.length) {
    return { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 };
  }

  const groupInfoMap: Record<string, { name: string; cat: CatKey }> = {};
  for (const m of memberships) {
    const g = (m as any).groups;
    if (g) groupInfoMap[(m as any).group_id] = { name: g.name, cat: (g.category ?? 'home') as CatKey };
  }

  // Only count the current user's personal share (expense_splits.user_id = me)
  // This correctly attributes: if Anya paid → only Anya's split counts for Anya
  const { data: splits, error } = await supabase
    .from('expense_splits')
    .select('amount, expenses!inner( date, group_id )')
    .eq('user_id', userId)
    .gte('expenses.date', fromDate);

  if (error) throw error;
  if (!splits?.length) {
    return { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 };
  }

  const groupAmounts: Record<string, number> = {};
  let total = 0;
  for (const s of splits) {
    const exp = (s as any).expenses;
    const gid = exp?.group_id as string;
    const amt = Number((s as any).amount);
    if (!gid || !groupInfoMap[gid]) continue;
    groupAmounts[gid] = (groupAmounts[gid] ?? 0) + amt;
    total += amt;
  }

  const catAmounts: Record<string, number> = {};
  for (const [gid, amt] of Object.entries(groupAmounts)) {
    const cat = groupInfoMap[gid]?.cat ?? 'home';
    catAmounts[cat] = (catAmounts[cat] ?? 0) + amt;
  }

  const categories: StatCategory[] = Object.entries(catAmounts)
    .map(([cat, amount]) => ({ cat: cat as CatKey, amount }))
    .sort((a, b) => b.amount - a.amount);

  const groups: StatGroup[] = Object.entries(groupAmounts)
    .map(([id, amount]) => ({
      id,
      cat: groupInfoMap[id]?.cat ?? 'home',
      name: groupInfoMap[id]?.name ?? 'Группа',
      amount,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return { categories, groups, total, periodLabel, expenseCount: splits.length };
}

export function useStats(period: 'month' | 'year') {
  const { user, guestMode } = useAuthStore();

  if (guestMode) {
    const now = new Date();
    const periodLabel = period === 'month'
      ? now.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
      : String(now.getFullYear());
    return {
      data: { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 } as StatsData,
      isLoading: false,
      error: null,
    };
  }

  return useQuery({
    queryKey: ['stats', user?.id, period],
    queryFn: () => fetchStats(user!.id, period),
    enabled: !!user?.id,
  });
}
