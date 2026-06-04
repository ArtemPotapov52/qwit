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

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id, groups ( id, name, category )')
    .eq('user_id', userId);

  if (!memberships?.length) {
    return { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 };
  }

  const groupIds = memberships.map(m => (m as any).group_id as string);
  const groupInfoMap: Record<string, { name: string; cat: CatKey }> = {};
  for (const m of memberships) {
    const g = (m as any).groups;
    if (g) groupInfoMap[(m as any).group_id] = { name: g.name, cat: (g.category ?? 'home') as CatKey };
  }

  const { data: expenses, error } = await supabase
    .from('expenses')
    .select('group_id, amount')
    .in('group_id', groupIds)
    .gte('date', fromDate);

  if (error) throw error;
  if (!expenses?.length) {
    return { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 };
  }

  const groupAmounts: Record<string, number> = {};
  let total = 0;
  for (const e of expenses) {
    const gid = (e as any).group_id as string;
    const amt = Number((e as any).amount);
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

  return { categories, groups, total, periodLabel, expenseCount: expenses.length };
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
