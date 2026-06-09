import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';
import { CatKey } from '@/constants/colors';

export interface GroupMember {
  id: string;              // group_members.id
  user_id: string | null;  // profiles.id, null для гостей
  role: string;
  joined_at: string;
  display_name: string | null;
  is_guest: boolean;
  guest_phone: string | null;
}

export interface GroupBalance {
  from_member_id: string;   // group_members.id
  from_user_id: string | null;
  from_name: string;
  to_member_id: string;     // group_members.id
  to_user_id: string | null;
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

function sanitizeError(e: unknown): Error {
  if (e instanceof Error) return e;
  if (e && typeof e === 'object' && 'message' in e) {
    return new Error(String((e as any).message));
  }
  return new Error(String(e));
}

async function fetchGroupDetail(groupId: string): Promise<GroupDetailFull> {
  console.log('[qwit] fetchGroupDetail start', groupId);
  try {
    const { data, error } = await supabase
      .from('groups')
      .select(`
        id, name, category, created_at,
        group_members ( id, user_id, guest_name, guest_phone, role, joined_at, profiles ( display_name ) )
      `)
      .eq('id', groupId)
      .single();
    console.log('[qwit] group query done, error:', error?.message);
    if (error) throw sanitizeError(error);

    const memberMap: Record<string, { name: string; user_id: string | null }> = {};
    const members: GroupMember[] = ((data as any).group_members ?? []).map((m: any) => {
      const isGuest = !m.user_id;
      const display_name: string | null = isGuest
        ? (m.guest_name ?? 'Гость')
        : (m.profiles?.display_name ?? null);
      memberMap[m.id] = { name: display_name ?? 'Участник', user_id: m.user_id ?? null };
      return {
        id: m.id,
        user_id: m.user_id ?? null,
        role: m.role,
        joined_at: m.joined_at,
        display_name,
        is_guest: isGuest,
        guest_phone: m.guest_phone ?? null,
      };
    });

    const [{ data: balancesData }, { data: expensesData }, { data: activityData }] = await Promise.all([
      supabase
        .from('balances')
        .select('from_member, to_member, amount')
        .eq('group_id', groupId),
      supabase
        .from('expenses')
        .select('id, title, amount, paid_by, date, created_at, profiles ( display_name )')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('activity')
        .select('id, type, payload, created_at, actor_id, profiles!actor_id ( display_name )')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const net: Record<string, number> = {};
    for (const b of balancesData ?? []) {
      const from = (b as any).from_member;
      const to   = (b as any).to_member;
      if (!from || !to) continue;
      const amount = Number(b.amount);
      if (amount <= 0) continue;
      net[from] = (net[from] ?? 0) - amount;
      net[to]   = (net[to]   ?? 0) + amount;
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
          from_member_id: d.id,
          from_user_id: memberMap[d.id]?.user_id ?? null,
          from_name: memberMap[d.id]?.name ?? 'Участник',
          to_member_id: c.id,
          to_user_id: memberMap[c.id]?.user_id ?? null,
          to_name: memberMap[c.id]?.name ?? 'Участник',
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
      paid_by_name: (e as any).profiles?.display_name ?? 'Участник',
      date: e.date,
    }));

    const history: HistoryItem[] = (activityData ?? []).map((a: any) => ({
      id: a.id,
      type: a.type,
      actor_name: a.profiles?.display_name ?? 'Участник',
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
  } catch (e) {
    console.log('[qwit] fetchGroupDetail ERROR:', e);
    throw sanitizeError(e);
  }
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
            members: [{
              id: 'local',
              user_id: 'local',
              role: 'admin',
              joined_at: new Date().toISOString(),
              display_name: 'Dev',
              is_guest: false,
              guest_phone: null,
            }],
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
