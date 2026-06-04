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

export interface GroupDetailFull {
  id: string;
  name: string;
  category: CatKey;
  created_at: string;
  members: GroupMember[];
  balances: GroupBalance[];
  expenses: GroupExpense[];
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

  const [{ data: balancesData }, { data: expensesData }] = await Promise.all([
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
  ]);

  const balances: GroupBalance[] = (balancesData ?? [])
    .filter((b: any) => Number(b.amount) > 0)
    .map((b: any) => ({
      from_user_id: b.from_user,
      from_name: memberMap[b.from_user] ?? 'Пользователь',
      to_user_id: b.to_user,
      to_name: memberMap[b.to_user] ?? 'Пользователь',
      amount: Math.round(Number(b.amount) * 100) / 100,
    }));

  const expenses: GroupExpense[] = (expensesData ?? []).map((e: any) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    paid_by_id: e.paid_by ?? null,
    paid_by_name: (e as any).profiles?.display_name ?? 'Пользователь',
    date: e.date,
  }));

  return {
    id: data.id,
    name: data.name,
    category: ((data as any).category ?? 'home') as CatKey,
    created_at: data.created_at,
    members,
    balances,
    expenses,
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
