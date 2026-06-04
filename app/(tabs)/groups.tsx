import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore, fs } from '@/store/settings';
import { useGroups, GroupItem } from '@/hooks/useGroups';
import { useProfile } from '@/hooks/useProfile';

const FREE_GROUP_LIMIT = 3;

function GroupRow({ g, scale }: { g: GroupItem; scale: number }) {
  const router = useRouter();
  const meta = CAT_META[g.cat] ?? CAT_META['home'];
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7} onPress={() => router.push(`/group/${g.id}` as any)}>
      <View style={[s.catTile, { backgroundColor: meta.bg }]}>
        <CatIcon cat={g.cat} color={meta.ink} />
      </View>
      <View style={s.cardInfo}>
        <Text style={[s.cardName, { fontSize: fs(15, scale) }]} numberOfLines={1}>{g.name}</Text>
        <Text style={[s.cardLast, { fontSize: fs(12, scale) }]} numberOfLines={1}>{g.last}</Text>
      </View>
      {g.amount === 0 ? (
        <View style={s.amtCol}>
          <Text style={[s.amtNum, { color: Colors.faint }]}>0 ₽</Text>
          <Text style={s.amtLabel}>рассчитано</Text>
        </View>
      ) : (
        <View style={s.amtCol}>
          <Text style={[s.amtNum, { color: g.amount > 0 ? Colors.pos : Colors.neg }]}>{fmt(g.amount)}</Text>
          <Text style={s.amtLabel}>{g.amount > 0 ? 'вам должны' : 'вы должны'}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function GroupsScreen() {
  const { user } = useAuthStore();
  const { fontScale } = useSettingsStore();
  const { data: profile } = useProfile();
  const { data: groups, isLoading } = useGroups();
  const letter = (profile?.display_name ?? user?.email ?? 'Я')[0]?.toUpperCase() ?? 'Я';

  const totalOwed = (groups ?? []).reduce((s, g) => g.amount > 0 ? s + g.amount : s, 0);
  const totalOwe = (groups ?? []).reduce((s, g) => g.amount < 0 ? s + g.amount : s, 0);
  const net = totalOwed + totalOwe;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { fontSize: fs(24, fontScale) }]}>qwit</Text>
        <View style={s.avatar}><Text style={s.avatarText}>{letter}</Text></View>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[s.hero, s.heroShadow]}>
          <Text style={s.heroLabel}>{net >= 0 ? 'ИТОГО ВАМ ДОЛЖНЫ' : 'ИТОГО ВЫ ДОЛЖНЫ'}</Text>
          <Text style={s.heroAmount}>{fmt(Math.abs(net), false)}</Text>
          <View style={s.heroRow}>
            <View style={s.heroCol}>
              <Text style={s.heroColLabel}>вам должны</Text>
              <Text style={s.heroColNum}>{fmt(totalOwed, false)}</Text>
            </View>
            <View style={s.heroCol}>
              <Text style={s.heroColLabel}>вы должны</Text>
              <Text style={s.heroColNum}>{fmt(Math.abs(totalOwe), false)}</Text>
            </View>
          </View>
        </View>

        {/* Section */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { fontSize: fs(18, fontScale) }]}>ваши группы</Text>
        </View>

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator color={Colors.accent} />
          </View>
        ) : !groups?.length ? (
          <View style={s.empty}>
            <Text style={s.emptyText}>Нет групп. Создайте первую — нажмите «+»</Text>
          </View>
        ) : (
          <View style={s.list}>
            {groups.map((g) => <GroupRow key={g.id} g={g} scale={fontScale} />)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.page },
  header: {
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.page,
  },
  headerTitle: { fontFamily: Fonts.brand700, fontSize: 24, color: Colors.ink, letterSpacing: -1.2 },
  avatar: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.brand600, fontSize: 15, color: Colors.accent },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },

  // Hero
  hero: {
    backgroundColor: Colors.accent, borderRadius: 18, padding: 22,
  },
  heroShadow: {
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  heroLabel: {
    fontFamily: Fonts.body600, fontSize: 12.5, color: 'rgba(255,255,255,0.82)',
    letterSpacing: 1.2, textTransform: 'uppercase',
  },
  heroAmount: {
    fontFamily: Fonts.brand700, fontSize: 40, color: '#fff', letterSpacing: -0.5,
    marginTop: 6, lineHeight: 44,
  },
  heroRow: { flexDirection: 'row', marginTop: 18 },
  heroCol: { flex: 1 },
  heroColLabel: { fontFamily: Fonts.body400, fontSize: 11.5, color: 'rgba(255,255,255,0.82)', marginBottom: 4 },
  heroColNum: { fontFamily: Fonts.body700, fontSize: 17, color: '#fff' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink, letterSpacing: -0.9, textTransform: 'lowercase' },

  // States
  center: { paddingTop: 40, alignItems: 'center' },
  empty: { paddingTop: 40, alignItems: 'center', paddingHorizontal: 24 },
  emptyText: { fontFamily: Fonts.body400, fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 22 },

  // Group card
  list: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13,
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  catTile: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1, minWidth: 0, marginRight: 8 },
  cardName: { fontFamily: Fonts.body500, fontSize: 15, color: Colors.ink, letterSpacing: -0.2, textTransform: 'lowercase' },
  cardLast: { fontFamily: Fonts.body400, fontSize: 12, color: Colors.sub, marginTop: 3 },
  amtCol: { alignItems: 'flex-end' },
  amtNum: { fontFamily: Fonts.body700, fontSize: 16, letterSpacing: -0.2 },
  amtLabel: { fontFamily: Fonts.body400, fontSize: 11, color: Colors.sub, marginTop: 2 },
});
