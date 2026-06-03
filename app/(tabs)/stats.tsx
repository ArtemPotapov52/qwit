import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';

const STAT_CATS: { cat: CatKey; amount: number }[] = [
  { cat: 'home',  amount: 14200 },
  { cat: 'bowl',  amount: 9300 },
  { cat: 'cart',  amount: 6800 },
  { cat: 'plane', amount: 4900 },
  { cat: 'car',   amount: 2100 },
  { cat: 'gift',  amount: 900 },
];

const GROUP_STATS = [
  { cat: 'home' as CatKey,  name: 'Квартира · Чистые пруды', a: 14200 },
  { cat: 'plane' as CatKey, name: 'Поездка в Питер', a: 11700 },
  { cat: 'bowl' as CatKey,  name: 'Обеды на работе', a: 9300 },
];

export default function StatsScreen() {
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const total = STAT_CATS.reduce((s, c) => s + c.amount, 0);
  const max = Math.max(...STAT_CATS.map(c => c.amount));

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>статистика</Text>
        <Text style={s.headerMonth}>Май 2026</Text>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Segmented */}
        <View style={s.segmented}>
          {(['month', 'year'] as const).map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[s.segBtn, period === p && s.segBtnActive]} activeOpacity={0.8}>
              <Text style={[s.segLabel, period === p && s.segLabelActive]}>{p === 'month' ? 'Месяц' : 'Год'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary card */}
        <View style={[s.card, s.summaryCard]}>
          <View style={s.donutWrap}>
            {/* Simplified donut */}
            <View style={s.donutOuter}>
              <View style={s.donutInner}>
                <Text style={s.donutSmall}>трат</Text>
                <Text style={s.donutNum}>{STAT_CATS.length}</Text>
              </View>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryLabel}>Потрачено в мае</Text>
            <Text style={s.summaryTotal}>{fmt(total, false)}</Text>
            <Text style={s.summaryDelta}>−12% к апрелю</Text>
          </View>
        </View>

        {/* By category */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>по категориям</Text>
        </View>
        <View style={[s.card, { padding: 18, gap: 16 }]}>
          {STAT_CATS.map((c, i) => {
            const meta = CAT_META[c.cat];
            const pct = Math.round((c.amount / total) * 100);
            return (
              <View key={i} style={s.barRow}>
                <View style={[s.barIcon, { backgroundColor: meta.bg }]}>
                  <CatIcon cat={c.cat} color={meta.ink} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.barLabelRow}>
                    <Text style={s.barLabel}>{meta.label}</Text>
                    <Text style={s.barAmount}>{fmt(c.amount, false)}</Text>
                  </View>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${(c.amount / max) * 100}%`, backgroundColor: meta.ink }]} />
                  </View>
                </View>
                <Text style={s.barPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        {/* By group */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>по группам</Text>
        </View>
        <View style={[s.card, { padding: 6 }]}>
          {GROUP_STATS.map((g, i) => {
            const meta = CAT_META[g.cat];
            return (
              <View key={i} style={[s.groupRow, i < GROUP_STATS.length - 1 && s.groupRowBorder]}>
                <View style={[s.groupIcon, { backgroundColor: meta.bg }]}>
                  <CatIcon cat={g.cat} color={meta.ink} size={17} />
                </View>
                <Text style={s.groupName} numberOfLines={1}>{g.name}</Text>
                <Text style={s.groupAmount}>{fmt(g.a, false)}</Text>
              </View>
            );
          })}
        </View>

        {/* Premium */}
        <View style={s.premiumBlock}>
          <View style={{ flex: 1 }}>
            <Text style={s.premiumTitle}>Полная аналитика в Premium</Text>
            <Text style={s.premiumSub}>Прогноз трат, экспорт и история без лимита</Text>
          </View>
          <View style={s.premiumBtn}>
            <Text style={s.premiumBtnText}>199 ₽/мес</Text>
          </View>
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
  headerMonth: { fontFamily: Fonts.body600, fontSize: 13, color: Colors.accent },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  card: {
    backgroundColor: Colors.surface, borderRadius: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: { marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink, letterSpacing: -0.9, textTransform: 'lowercase' },

  // Segmented
  segmented: {
    flexDirection: 'row', gap: 4, padding: 4, backgroundColor: Colors.surface, borderRadius: 999,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segBtnActive: { backgroundColor: Colors.accent },
  segLabel: { fontFamily: Fonts.body500, fontSize: 13.5, color: Colors.sub },
  segLabelActive: { fontFamily: Fonts.body700, color: '#fff' },

  // Summary
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, marginTop: 14 },
  donutWrap: { flexShrink: 0 },
  donutOuter: {
    width: 92, height: 92, borderRadius: 999,
    backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  donutInner: {
    width: 66, height: 66, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  donutSmall: { fontFamily: Fonts.body400, fontSize: 9.5, color: Colors.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  donutNum: { fontFamily: Fonts.brand700, fontSize: 13, color: Colors.ink },
  summaryLabel: { fontFamily: Fonts.body400, fontSize: 12.5, color: Colors.sub },
  summaryTotal: { fontFamily: Fonts.brand700, fontSize: 30, color: Colors.ink, letterSpacing: -0.8, marginTop: 2 },
  summaryDelta: { fontFamily: Fonts.body600, fontSize: 12.5, color: Colors.pos, marginTop: 4 },

  // Bar
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  barLabel: { fontFamily: Fonts.body500, fontSize: 13, color: Colors.ink },
  barAmount: { fontFamily: Fonts.body700, fontSize: 13.5, color: Colors.ink },
  barTrack: { height: 7, borderRadius: 999, backgroundColor: Colors.accentSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barPct: { fontFamily: Fonts.body400, fontSize: 12, color: Colors.faint, width: 32, textAlign: 'right' },

  // Group row
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  groupRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  groupIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupName: { flex: 1, fontFamily: Fonts.body500, fontSize: 13.5, color: Colors.ink, textTransform: 'lowercase' },
  groupAmount: { fontFamily: Fonts.body700, fontSize: 14, color: Colors.ink },

  // Premium
  premiumBlock: {
    marginTop: 20, borderRadius: 18, padding: 18, backgroundColor: Colors.ink,
    flexDirection: 'row', alignItems: 'center', gap: 14,
  },
  premiumTitle: { fontFamily: Fonts.brand700, fontSize: 15, color: '#fff', letterSpacing: -0.4 },
  premiumSub: { fontFamily: Fonts.body400, fontSize: 12.5, color: 'rgba(255,255,255,0.6)', marginTop: 3, lineHeight: 18 },
  premiumBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: Colors.accent },
  premiumBtnText: { fontFamily: Fonts.body700, fontSize: 13, color: '#fff' },
});
