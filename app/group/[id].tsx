import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { fmt } from '@/lib/format';
import { HistoryItem } from '@/hooks/useGroupDetail';
import { useGroupDetail, GroupMember, GroupBalance, GroupExpense } from '@/hooks/useGroupDetail';
import { useAuthStore } from '@/store/auth';
import { AddExpenseSheet } from '@/components/ui/AddExpenseSheet';
import { AddMemberSheet } from '@/components/ui/AddMemberSheet';
import { GroupSettingsSheet } from '@/components/ui/GroupSettingsSheet';

function memberLabel(n: number) {
  if (n === 1) return '1 участник';
  if (n >= 2 && n <= 4) return `${n} участника`;
  return `${n} участников`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function MemberChip({ m, isYou }: { m: GroupMember; isYou: boolean }) {
  const name = m.display_name ?? (isYou ? 'Вы' : 'Участник');
  return (
    <View style={[st.chip, isYou && st.chipYou]}>
      <View style={[st.chipAv, isYou && st.chipAvYou]}>
        <Text style={[st.chipLtr, isYou && st.chipLtrYou]}>{name[0].toUpperCase()}</Text>
      </View>
      <Text style={[st.chipName, isYou && st.chipNameYou]} numberOfLines={1}>
        {isYou ? 'Вы' : name}
      </Text>
    </View>
  );
}

function BalanceRow({ b, uid }: { b: GroupBalance; uid: string }) {
  const toYou = b.to_user_id === uid;
  const fromYou = b.from_user_id === uid;
  const label = toYou
    ? `${b.from_name} должен вам`
    : fromYou
    ? `вы должны ${b.to_name}`
    : `${b.from_name} → ${b.to_name}`;
  const color = toYou ? Colors.pos : fromYou ? Colors.neg : Colors.sub;

  const onSbp = () =>
    Alert.alert('Перевод через СБП', `Отметить ${fmt(b.amount)} как оплаченный?`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Оплачено ✓', onPress: () => Alert.alert('Готово', 'Долг помечен как оплаченный') },
    ]);

  return (
    <View style={st.balRow}>
      <View style={[st.balDot, { backgroundColor: color }]} />
      <Text style={st.balLabel} numberOfLines={1}>{label}</Text>
      <Text style={[st.balAmt, { color }]}>{fmt(b.amount, false)}</Text>
      {(toYou || fromYou) && (
        <TouchableOpacity onPress={onSbp} style={st.sbpPill} activeOpacity={0.7}>
          <Text style={st.sbpText}>СБП</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function HistoryRow({ item }: { item: HistoryItem }) {
  const isExpense = item.type === 'expense_added';
  const isMember  = item.type === 'member_joined';
  const isCreated = item.type === 'group_created';

  const time = new Date(item.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  let icon = '•';
  let title = '';
  let sub = time;

  if (isExpense) {
    const amount = Number(item.payload.amount ?? 0);
    const title_ = String(item.payload.title ?? 'трата');
    icon = '−';
    title = `${title_} · ${fmt(amount, false)}`;
    sub = `${item.actor_name} · ${time}`;
  } else if (isMember) {
    icon = '★';
    title = `${item.actor_name} вступил в группу`;
    sub = time;
  } else if (isCreated) {
    icon = '★';
    title = 'группа создана';
    sub = time;
  } else {
    title = item.type;
  }

  return (
    <View style={st.histRow}>
      <View style={[st.histIcon, isExpense && st.histIconExp, isMember && st.histIconMem]}>
        <Text style={[st.histIconText, isExpense && st.histIconTextExp]}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={st.histTitle} numberOfLines={1}>{title}</Text>
        <Text style={st.histSub}>{sub}</Text>
      </View>
    </View>
  );
}

function ExpenseRow({ e }: { e: GroupExpense }) {
  return (
    <View style={st.expRow}>
      <View style={st.expDot} />
      <View style={st.expInfo}>
        <Text style={st.expTitle} numberOfLines={1}>{e.title}</Text>
        <Text style={st.expMeta}>{e.paid_by_name} · {formatDate(e.date)}</Text>
      </View>
      <Text style={st.expAmt}>{fmt(e.amount, false)}</Text>
    </View>
  );
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: group, isLoading, error } = useGroupDetail(id ?? '');
  const [expOpen, setExpOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);
  const [settOpen, setSettOpen] = useState(false);

  const isLocal = (id ?? '').startsWith('local-');
  const uid = user?.id ?? '';

  const totalSpent = (group?.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const myBalance = (group?.balances ?? []).reduce((s, b) => {
    if (b.to_user_id === uid) return s + b.amount;
    if (b.from_user_id === uid) return s - b.amount;
    return s;
  }, 0);

  return (
    <SafeAreaView style={st.page} edges={['top']}>
      {/* ── Header ── */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={st.iconBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={Colors.ink} strokeWidth={2.2}
              strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={st.headerTitle} numberOfLines={1}>
          {isLoading ? '...' : group?.name ?? 'Группа'}
        </Text>
        <TouchableOpacity onPress={() => setSettOpen(true)} style={st.iconBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM19 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
              fill={Colors.sub} stroke={Colors.sub} strokeWidth={0.5}/>
          </Svg>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={st.center}><ActivityIndicator color={Colors.accent} /></View>
      ) : error ? (
        <View style={st.center}>
          <Text style={st.errText}>Не удалось загрузить группу</Text>
          <TouchableOpacity onPress={() => router.back()} style={st.retryBtn}>
            <Text style={st.retryText}>Назад</Text>
          </TouchableOpacity>
        </View>
      ) : group ? (
        <>
          {/* ScrollView с отступом под FAB */}
          <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Hero ── */}
            <View style={[st.hero, st.heroShadow]}>
              <Text style={st.heroName} numberOfLines={1}>{group.name}</Text>
              <Text style={st.heroSub}>{memberLabel(group.members.length)}</Text>
              <View style={st.heroStats}>
                <View style={st.heroStat}>
                  <Text style={st.heroStatLabel}>потрачено</Text>
                  <Text style={st.heroStatNum}>{fmt(totalSpent, false)}</Text>
                </View>
                <View style={st.heroStat}>
                  <Text style={st.heroStatLabel}>ваш баланс</Text>
                  <Text style={[st.heroStatNum, myBalance > 0 ? st.pos : myBalance < 0 ? st.neg : null]}>
                    {myBalance === 0 ? '0 ₽' : fmt(myBalance)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Участники ── */}
            <View style={st.sectionRow}>
              <Text style={st.sectionTitle}>участники</Text>
              {!isLocal && (
                <TouchableOpacity onPress={() => setMemOpen(true)} style={st.addLink} activeOpacity={0.7}>
                  <Svg width={12} height={12} viewBox="0 0 20 20">
                    <Path d="M10 4v12M4 10h12" stroke={Colors.accent} strokeWidth={2.4} strokeLinecap="round"/>
                  </Svg>
                  <Text style={st.addLinkText}>добавить</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
              {group.members.map(m => (
                <MemberChip key={m.user_id} m={m} isYou={m.user_id === uid} />
              ))}
            </ScrollView>

            {/* ── Долги ── */}
            <Text style={[st.sectionTitle, { marginBottom: 12 }]}>кто кому должен</Text>
            <View style={st.card}>
              {group.balances.length === 0 ? (
                <Text style={st.emptyRow}>нет расчётов</Text>
              ) : group.balances.map((b, i) => (
                <View key={`${b.from_user_id}-${b.to_user_id}`}>
                  {i > 0 && <View style={st.divider} />}
                  <BalanceRow b={b} uid={uid} />
                </View>
              ))}
            </View>

            {/* ── Расходы ── */}
            <Text style={[st.sectionTitle, { marginBottom: 12 }]}>расходы</Text>
            <View style={st.card}>
              {group.expenses.length === 0 ? (
                <Text style={st.emptyRow}>Нет расходов — нажмите кнопку ниже</Text>
              ) : group.expenses.map((e, i) => (
                <View key={e.id}>
                  {i > 0 && <View style={st.divider} />}
                  <ExpenseRow e={e} />
                </View>
              ))}
            </View>

            {/* ── История ── */}
            <Text style={[st.sectionTitle, { marginBottom: 12 }]}>история</Text>
            <View style={[st.card, { marginBottom: 0 }]}>
              {(group.history ?? []).length === 0 ? (
                <Text style={st.emptyRow}>нет событий</Text>
              ) : (group.history ?? []).map((item, i) => (
                <View key={item.id}>
                  {i > 0 && <View style={st.divider} />}
                  <HistoryRow item={item} />
                </View>
              ))}
            </View>

          </ScrollView>

          {/* ── FAB «Добавить расход» ── */}
          <View style={st.fabWrap}>
            <TouchableOpacity onPress={() => setExpOpen(true)} style={st.fab} activeOpacity={0.85}>
              <Svg width={18} height={18} viewBox="0 0 20 20">
                <Path d="M10 4v12M4 10h12" stroke="#fff" strokeWidth={2.4} strokeLinecap="round"/>
              </Svg>
              <Text style={st.fabText}>Добавить расход</Text>
            </TouchableOpacity>
          </View>

          <AddExpenseSheet
            open={expOpen}
            onClose={() => setExpOpen(false)}
            groupId={id ?? ''}
            members={group.members}
            onCreated={() => setExpOpen(false)}
          />
          {!isLocal && (
            <AddMemberSheet
              open={memOpen}
              onClose={() => setMemOpen(false)}
              groupId={id ?? ''}
            />
          )}
          <GroupSettingsSheet
            open={settOpen}
            onClose={() => setSettOpen(false)}
            groupId={id ?? ''}
            groupName={group.name}
            isAdmin={group.members.find(m => m.user_id === uid)?.role === 'admin'}
            onLeft={() => router.replace('/(tabs)/groups' as any)}
          />
        </>
      ) : null}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.page },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12,
    backgroundColor: Colors.page,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  headerTitle: {
    fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink,
    letterSpacing: -0.7, flex: 1, textAlign: 'center', marginHorizontal: 8,
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 100 }, // отступ под FAB
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errText: { fontFamily: Fonts.body400, fontSize: 14, color: Colors.neg },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.surface },
  retryText: { fontFamily: Fonts.body600, fontSize: 14, color: Colors.sub },

  // ── Hero ──
  hero: {
    backgroundColor: Colors.accent, borderRadius: 18, padding: 20, marginBottom: 24,
  },
  heroShadow: {
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  heroName: {
    fontFamily: Fonts.brand700, fontSize: 22, color: '#fff',
    letterSpacing: -0.8, textTransform: 'lowercase',
  },
  heroSub: {
    fontFamily: Fonts.body400, fontSize: 13, color: 'rgba(255,255,255,0.65)',
    marginTop: 4, marginBottom: 20,
  },
  heroStats: { flexDirection: 'row', gap: 32 },
  heroStat: {},
  heroStatLabel: { fontFamily: Fonts.body400, fontSize: 11.5, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  heroStatNum: { fontFamily: Fonts.body700, fontSize: 18, color: '#fff' },
  pos: { color: '#7EECC4' },
  neg: { color: '#FF9090' },

  // ── Sections ──
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink, letterSpacing: -0.9, textTransform: 'lowercase' },
  addLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addLinkText: { fontFamily: Fonts.body600, fontSize: 13.5, color: Colors.accent },

  // ── Chips ──
  chips: { gap: 8, paddingBottom: 22 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  chipYou: { backgroundColor: Colors.accentSoft },
  chipAv: { width: 24, height: 24, borderRadius: 999, backgroundColor: Colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  chipAvYou: { backgroundColor: Colors.accent },
  chipLtr: { fontFamily: Fonts.brand700, fontSize: 11, color: Colors.accent },
  chipLtrYou: { color: '#fff' },
  chipName: { fontFamily: Fonts.body500, fontSize: 13, color: Colors.ink, maxWidth: 80 },
  chipNameYou: { color: Colors.accent },

  // ── Card ──
  card: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 22,
  },
  divider: { height: 1, backgroundColor: Colors.hairline, marginLeft: 16 },
  emptyRow: { fontFamily: Fonts.body400, fontSize: 13.5, color: Colors.faint, textAlign: 'center', paddingVertical: 20 },

  // ── Balance ──
  balRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  balDot: { width: 8, height: 8, borderRadius: 99, flexShrink: 0 },
  balLabel: { flex: 1, fontFamily: Fonts.body400, fontSize: 13.5, color: Colors.ink },
  balAmt: { fontFamily: Fonts.body700, fontSize: 15 },
  sbpPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: Colors.accentSoft, marginLeft: 4 },
  sbpText: { fontFamily: Fonts.body700, fontSize: 11.5, color: Colors.accent },

  // ── Expense ──
  expRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 13 },
  expDot: {
    width: 10, height: 10, borderRadius: 99, flexShrink: 0,
    backgroundColor: Colors.accentSoft, borderWidth: 2, borderColor: Colors.accent,
  },
  expInfo: { flex: 1, minWidth: 0 },
  expTitle: { fontFamily: Fonts.body600, fontSize: 14, color: Colors.ink },
  expMeta: { fontFamily: Fonts.body400, fontSize: 12, color: Colors.sub, marginTop: 1 },
  expAmt: { fontFamily: Fonts.body700, fontSize: 15, color: Colors.ink },

  // ── History ──
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  histIcon: {
    width: 30, height: 30, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1, borderColor: Colors.line,
  },
  histIconExp: { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
  histIconMem: { backgroundColor: '#E6F6EE', borderColor: '#0E9F6E' },
  histIconText: { fontFamily: Fonts.brand700, fontSize: 13, color: Colors.sub },
  histIconTextExp: { color: Colors.accent },
  histTitle: { fontFamily: Fonts.body500, fontSize: 13.5, color: Colors.ink },
  histSub: { fontFamily: Fonts.body400, fontSize: 11.5, color: Colors.faint, marginTop: 2 },

  // ── FAB ──
  fabWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 18, paddingBottom: 28, paddingTop: 12,
    backgroundColor: 'transparent',
  },
  fab: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 18, paddingVertical: 16,
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.35, shadowRadius: 30, elevation: 10,
  },
  fabText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
});
