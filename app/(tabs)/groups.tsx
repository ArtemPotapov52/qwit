import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore, fs } from '@/store/settings';

const GROUPS = [
  { cat: 'home' as CatKey,  name: 'Квартира · Чистые пруды', sub: '4 участника',   last: 'Аня добавила «Интернет»',  amount: 4200 },
  { cat: 'plane' as CatKey, name: 'Поездка в Питер',          sub: '5 участников', last: 'Вы добавили «Airbnb»',      amount: -1850 },
  { cat: 'bowl' as CatKey,  name: 'Обеды на работе',          sub: '3 участника',  last: 'Костя добавил «Рамен»',     amount: 640 },
  { cat: 'gift' as CatKey,  name: 'День рождения Маши',       sub: '6 участников', last: 'Всё рассчитано',            amount: 0 },
];

function GroupRow({ g, scale }: { g: typeof GROUPS[number]; scale: number }) {
  const meta = CAT_META[g.cat];
  return (
    <TouchableOpacity style={s.card} activeOpacity={0.7}>
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
  const letter = (user?.phone ?? 'Т')[0]?.toUpperCase() ?? 'Т';

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
          <Text style={s.heroLabel}>ИТОГО ВАМ ДОЛЖНЫ</Text>
          <Text style={s.heroAmount}>{fmt(2990)}</Text>
          <View style={s.heroDivider} />
          <View style={s.heroRow}>
            <View style={s.heroCol}>
              <Text style={s.heroColLabel}>вам должны</Text>
              <Text style={s.heroColNum}>{fmt(4840)}</Text>
            </View>
            <View style={s.heroVertLine} />
            <View style={s.heroCol}>
              <Text style={s.heroColLabel}>вы должны</Text>
              <Text style={s.heroColNum}>{fmt(-1850)}</Text>
            </View>
          </View>
        </View>

        {/* Section */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { fontSize: fs(18, fontScale) }]}>ваши группы</Text>
          <TouchableOpacity><Text style={s.sectionAction}>Все</Text></TouchableOpacity>
        </View>
        <View style={s.list}>
          {GROUPS.map((g, i) => <GroupRow key={i} g={g} scale={fontScale} />)}
        </View>
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
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.24)', marginTop: 18, marginBottom: 16 },
  heroRow: { flexDirection: 'row' },
  heroCol: { flex: 1 },
  heroVertLine: { width: 1, backgroundColor: 'rgba(255,255,255,0.24)' },
  heroColLabel: { fontFamily: Fonts.body400, fontSize: 11.5, color: 'rgba(255,255,255,0.82)', marginBottom: 4 },
  heroColNum: { fontFamily: Fonts.body700, fontSize: 17, color: '#fff' },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink, letterSpacing: -0.9, textTransform: 'lowercase' },
  sectionAction: { fontFamily: Fonts.body600, fontSize: 13, color: Colors.accent },

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
