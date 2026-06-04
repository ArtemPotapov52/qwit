import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { CatKey } from '@/constants/colors';

export interface ActivityItem {
  id: string;
  type: 'expense_added' | 'expense_settled' | 'member_joined' | 'group_created';
  actor_name: string;
  group_id: string | null;
  group_name: string | null;
  group_cat: CatKey | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface ActivityDay {
  day: string;
  items: ActivityItem[];
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (target.getTime() === today.getTime()) return 'Сегодня';
  if (target.getTime() === yesterday.getTime()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

async function fetchActivity(userId: string): Promise<ActivityDay[]> {
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  if (!memberships?.length) return [];
  const groupIds = memberships.map(m => (m as any).group_id as string);

  // profiles!actor_id — явный FK-хинт, иначе Supabase может спутать FK через groups
  const { data, error } = await supabase
    .from('activity')
    .select('id, type, payload, created_at, group_id, actor_id, profiles!actor_id ( display_name ), groups!group_id ( name, category )')
    .in('group_id', groupIds)
    .order('created_at', { ascending: false })
    .limit(60);

  if (error) throw error;

  const items: ActivityItem[] = (data ?? []).map((row: any) => ({
    id: row.id,
    type: row.type as ActivityItem['type'],
    actor_name: row.profiles?.display_name ?? 'Пользователь',
    group_id: row.group_id ?? null,
    group_name: row.groups?.name ?? null,
    group_cat: (row.groups?.category ?? null) as CatKey | null,
    payload: row.payload ?? {},
    created_at: row.created_at,
  }));

  const grouped: Record<string, ActivityItem[]> = {};
  for (const item of items) {
    const label = dayLabel(item.created_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(item);
  }

  return Object.entries(grouped).map(([day, items]) => ({ day, items }));
}

export function useActivity() {
  const { user, guestMode } = useAuthStore();

  if (guestMode) {
    return { data: [] as ActivityDay[], isLoading: false, error: null };
  }

  return useQuery({
    queryKey: ['activity', user?.id],
    queryFn: () => fetchActivity(user!.id),
    enabled: !!user?.id,
  });
}
