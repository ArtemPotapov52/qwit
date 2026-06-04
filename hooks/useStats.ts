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

  // Net spending formula:
  // 1. Expenses I paid − reimbursements received from others (settled splits to me)
  // 2. + My own settled splits to others (I paid back my debt → real money out)
  // Unsettled debts I owe don't count yet — money hasn't left my wallet.

  const [
    { data: paidExpenses, error },
    { data: mySettledDebts },
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, group_id, amount')
      .eq('paid_by', userId)
      .gte('date', fromDate),
    supabase
      .from('expense_splits')
      .select('amount, expenses!inner( group_id, date, paid_by )')
      .eq('user_id', userId)
      .eq('settled', true)
      .neq('expenses.paid_by', userId)
      .gte('expenses.date', fromDate),
  ]);

  if (error) throw error;

  const paidIds = (paidExpenses ?? []).map((e: any) => e.id as string);

  // Reimbursements received (others settled their splits on my expenses)
  const { data: settledSplits } = paidIds.length > 0
    ? await supabase
        .from('expense_splits')
        .select('expense_id, amount')
        .in('expense_id', paidIds)
        .neq('user_id', userId)
        .eq('settled', true)
    : { data: [] };

  const reimbursedMap: Record<string, number> = {};
  for (const s of settledSplits ?? []) {
    const eid = (s as any).expense_id as string;
    reimbursedMap[eid] = (reimbursedMap[eid] ?? 0) + Number((s as any).amount);
  }

  const groupAmounts: Record<string, number> = {};
  let total = 0;

  // Part 1: expenses I paid, net of reimbursements
  for (const e of paidExpenses ?? []) {
    const gid = (e as any).group_id as string;
    if (!groupInfoMap[gid]) continue;
    const net = Number((e as any).amount) - (reimbursedMap[(e as any).id] ?? 0);
    if (net <= 0) continue;
    groupAmounts[gid] = (groupAmounts[gid] ?? 0) + net;
    total += net;
  }

  // Part 2: my settled debts to others (закинул долг → реальная трата)
  for (const s of mySettledDebts ?? []) {
    const exp = (s as any).expenses;
    const gid = exp?.group_id as string;
    if (!gid || !groupInfoMap[gid]) continue;
    const amt = Number((s as any).amount);
    groupAmounts[gid] = (groupAmounts[gid] ?? 0) + amt;
    total += amt;
  }

  const expenseCount = (paidExpenses?.length ?? 0) + (mySettledDebts?.length ?? 0);

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

  if (!total) return { categories: [], groups: [], total: 0, periodLabel, expenseCount: 0 };

  return { categories, groups, total, periodLabel, expenseCount };
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
