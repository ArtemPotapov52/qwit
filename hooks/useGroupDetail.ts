import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';
import { CatKey } from '@/constants/colors';

export interface GroupMember {
  user_id: string;
  role: string;
  joined_at: string;
  display_name: string | null;
}

export interface GroupBalance {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  title: string;
  amount: number;
  paid_by_id: string | null;
  paid_by_name: string;
  date: string;
}

export interface HistoryItem {
  id: string;
  type: string;
  actor_name: string;
  payload: Record<string, unknown>;
  created_at: string;
  split_count: number;
}

export interface GroupDetailFull {
  id: string;
  name: string;
  category: CatKey;
  created_at: string;
  members: GroupMember[];
  balances: GroupBalance[];
  expenses: GroupExpense[];
  history: HistoryItem[];
}

async function fetchGroupDetail(groupId: string): Promise<GroupDetailFull> {
  const { data, error } = await supabase
    .from('groups')
    .select(`
      id, name, category, created_at,
      group_members ( user_id, role, joined_at, profiles ( display_name ) )
    `)
    .eq('id', groupId)
    .single();
  if (error) throw error;

  const memberMap: Record<string, string> = {};
  const members: GroupMember[] = ((data as any).group_members ?? []).map((m: any) => {
    const display_name: string | null = m.profiles?.display_name ?? null;
    memberMap[m.user_id] = display_name ?? 'Пользователь';
    return { user_id: m.user_id, role: m.role, joined_at: m.joined_at, display_name };
  });

  const [{ data: balancesData }, { data: expensesData }, { data: activityData }] = await Promise.all([
    supabase
      .from('balances')
      .select('from_user, to_user, amount')
      .eq('group_id', groupId),
    supabase
      .from('expenses')
      .select('id, title, amount, paid_by, date, profiles ( display_name )')
      .eq('group_id', groupId)
      .order('date', { ascending: false })
      .limit(30),
    supabase
      .from('activity')
      .select('id, type, payload, created_at, actor_id, profiles!actor_id ( display_name )')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);


  // Debt simplification: net out all pairwise balances, then greedily settle
  const net: Record<string, number> = {};
  for (const b of balancesData ?? []) {
    const amount = Number(b.amount);
    if (amount <= 0) continue;
    net[(b as any).from_user] = (net[(b as any).from_user] ?? 0) - amount;
    net[(b as any).to_user]   = (net[(b as any).to_user]   ?? 0) + amount;
  }
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.005)
    .map(([id, bal]) => ({ id, bal }))
    .sort((a, b) => b.bal - a.bal);
  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.005)
    .map(([id, bal]) => ({ id, bal }))
    .sort((a, b) => a.bal - b.bal);

  const balances: GroupBalance[] = [];
  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.bal, -d.bal);
    if (amount > 0.005) {
      balances.push({
        from_user_id: d.id,
        from_name: memberMap[d.id] ?? 'Пользователь',
        to_user_id: c.id,
        to_name: memberMap[c.id] ?? 'Пользователь',
        amount: Math.round(amount * 100) / 100,
      });
    }
    c.bal -= amount;
    d.bal += amount;
    if (c.bal < 0.005) ci++;
    if (d.bal > -0.005) di++;
  }

  const expenses: GroupExpense[] = (expensesData ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    paid_by_id: e.paid_by ?? null,
    paid_by_name: (e as any).profiles?.display_name ?? 'Пользователь',
    date: e.date,
  }));

  const history: HistoryItem[] = (activityData ?? []).map((a: any) => ({
    id: a.id,
    type: a.type,
    actor_name: a.profiles?.display_name ?? 'Пользователь',
    payload: a.payload ?? {},
    created_at: a.created_at,
    split_count: 0,
  }));

  return {
    id: data.id,
    name: data.name,
    category: ((data as any).category ?? 'home') as CatKey,
    created_at: data.created_at,
    members,
    balances,
    expenses,
    history,
  };
}

export function useGroupDetail(groupId: string) {
  const { guestMode } = useAuthStore();
  const { groups } = useLocalGroupsStore();

  const remoteQuery = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroupDetail(groupId),
    enabled: !!groupId && !guestMode && !groupId.startsWith('local-'),
  });

  if (guestMode || groupId.startsWith('local-')) {
    const local = groups.find(g => g.id === groupId);
    return {
      data: local
        ? ({
            id: local.id,
            name: local.name,
            category: local.cat,
            created_at: new Date().toISOString(),
            members: [{ user_id: 'local', role: 'admin', joined_at: new Date().toISOString(), display_name: 'Dev' }],
            balances: [],
            history: [],
            expenses: (local.expenses ?? []).map(e => ({
              id: e.id,
              title: e.title,
              amount: e.amount,
              paid_by_id: null,
              paid_by_name: e.paid_by_name,
              date: e.date,
            })),
          } as GroupDetailFull)
        : null,
      isLoading: false,
      error: null,
    };
  }

  return remoteQuery;
}

export function useInvalidateGroupDetail() {
  const qc = useQueryClient();
  return (groupId: string) => qc.invalidateQueries({ queryKey: ['group', groupId] });
}
