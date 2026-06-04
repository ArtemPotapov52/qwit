import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useLocalGroupsStore } from '@/store/localGroups';
import { CatKey } from '@/constants/colors';

export interface GroupItem {
  id: string;
  cat: CatKey;
  name: string;
  sub: string;
  last: string;
  amount: number;
}

function memberLabel(count: number): string {
  if (count === 1) return '1 участник';
  if (count >= 2 && count <= 4) return `${count} участника`;
  return `${count} участников`;
}

async function fetchGroups(userId: string): Promise<GroupItem[]> {
  const { data: memberships, error } = await supabase
    .from('group_members')
    .select('group_id, groups(id, name, category, created_at)')
    .eq('user_id', userId);

  if (error) throw error;
  if (!memberships?.length) return [];

  const groups = memberships
    .map((m) => (m as any).groups)
    .filter((g: any) => g?.id != null);
  if (!groups.length) return [];
  const groupIds = groups.map((g: any) => g.id as string);

  const [{ data: allMembers }, { data: balances }, { data: activities }] = await Promise.all([
    supabase.from('group_members').select('group_id').in('group_id', groupIds),
    supabase
      .from('balances')
      .select('group_id, from_user, to_user, amount')
      .in('group_id', groupIds),
    supabase
      .from('activity')
      .select('group_id, type, payload, created_at')
      .in('group_id', groupIds)
      .order('created_at', { ascending: false }),
  ]);

  const countMap: Record<string, number> = {};
  for (const m of allMembers ?? []) {
    countMap[(m as any).group_id] = (countMap[(m as any).group_id] ?? 0) + 1;
  }

  const balanceMap: Record<string, number> = {};
  for (const b of balances ?? []) {
    const b_ = b as any;
    if (b_.to_user === userId) balanceMap[b_.group_id] = (balanceMap[b_.group_id] ?? 0) + Number(b_.amount);
    if (b_.from_user === userId) balanceMap[b_.group_id] = (balanceMap[b_.group_id] ?? 0) - Number(b_.amount);
  }

  const lastMap: Record<string, string> = {};
  for (const a of activities ?? []) {
    const a_ = a as any;
    if (!lastMap[a_.group_id]) {
      if (a_.type === 'expense_added') {
        lastMap[a_.group_id] = `Добавлено «${a_.payload?.title ?? 'трата'}»`;
      } else if (a_.type === 'member_joined') {
        lastMap[a_.group_id] = 'Новый участник';
      } else if (a_.type === 'group_created') {
        lastMap[a_.group_id] = 'Группа создана';
      }
    }
  }

  return groups.map((g: any) => ({
    id: g.id,
    cat: (g.category ?? 'home') as CatKey,
    name: g.name,
    sub: memberLabel(countMap[g.id] ?? 1),
    last: lastMap[g.id] ?? 'Нет расходов',
    amount: Math.round((balanceMap[g.id] ?? 0) * 100) / 100,
  }));
}

export function useGroups() {
  const { user, guestMode } = useAuthStore();
  const { groups, loaded, load } = useLocalGroupsStore();

  useEffect(() => {
    if (guestMode && !loaded) load();
  }, [guestMode]);

  const remoteQuery = useQuery({
    queryKey: ['groups', user?.id],
    queryFn: () => fetchGroups(user!.id),
    enabled: !!user?.id && !guestMode,
  });

  if (guestMode) {
    return { data: groups as GroupItem[], isLoading: !loaded, error: null };
  }
  return remoteQuery;
}
