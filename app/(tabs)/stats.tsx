import { useState, useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors, ThemeColors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';
import { useStats } from '@/hooks/useStats';

export default function StatsScreen() {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const [period, setPeriod] = useState<'month' | 'year'>('month');
  const { data, isLoading } = useStats(period);

  const total = data?.total ?? 0;
  const categories = data?.categories ?? [];
  const groups = data?.groups ?? [];
  const max = categories.length ? Math.max(...categories.map(c => c.amount)) : 1;

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>статистика</Text>
        {data?.periodLabel ? <Text style={s.headerMonth}>{data.periodLabel}</Text> : null}
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.segmented}>
          {(['month', 'year'] as const).map(p => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[s.segBtn, period === p && s.segBtnActive]} activeOpacity={0.8}>
              <Text style={[s.segLabel, period === p && s.segLabelActive]}>{p === 'month' ? 'Месяц' : 'Год'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={s.center}><ActivityIndicator color={C.accent} /></View>
        ) : (
          <>
            <View style={[s.card, s.summaryCard]}>
              <View style={s.donutWrap}>
                <View style={s.donutOuter}>
                  <View style={s.donutInner}>
                    <Text style={s.donutSmall}>трат</Text>
                    <Text style={s.donutNum}>{data?.expenseCount ?? 0}</Text>
                  </View>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryLabel}>{period === 'month' ? 'Потрачено за месяц' : 'Потрачено за год'}</Text>
                <Text style={s.summaryTotal}>{fmt(total, false)}</Text>
                {total === 0 && <Text style={s.summaryEmpty}>Нет расходов в этом периоде</Text>}
              </View>
            </View>

            {categories.length > 0 && (
              <>
                <View style={s.sectionHeader}><Text style={s.sectionTitle}>по категориям</Text></View>
                <View style={[s.card, { padding: 18, gap: 16 }]}>
                  {categories.map((c) => {
                    const meta = CAT_META[c.cat as CatKey] ?? CAT_META['home'];
                    const pct = total > 0 ? Math.round((c.amount / total) * 100) : 0;
                    return (
                      <View key={c.cat} style={s.barRow}>
                        <View style={[s.barIcon, { backgroundColor: meta.bg }]}>
                          <CatIcon cat={c.cat as CatKey} color={meta.ink} size={18} />
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
              </>
            )}

            {groups.length > 0 && (
              <>
                <View style={s.sectionHeader}><Text style={s.sectionTitle}>по группам</Text></View>
                <View style={[s.card, { padding: 6 }]}>
                  {groups.map((g, i) => {
                    const meta = CAT_META[g.cat as CatKey] ?? CAT_META['home'];
                    return (
                      <View key={g.id} style={[s.groupRow, i < groups.length - 1 && s.groupRowBorder]}>
                        <View style={[s.groupIcon, { backgroundColor: meta.bg }]}>
                          <CatIcon cat={g.cat as CatKey} color={meta.ink} size={17} />
                        </View>
                        <Text style={s.groupName} numberOfLines={1}>{g.name}</Text>
                        <Text style={s.groupAmount}>{fmt(g.amount, false)}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {categories.length === 0 && groups.length === 0 && (
              <View style={s.center}>
                <Text style={s.emptyTitle}>Нет данных</Text>
                <Text style={s.emptyBody}>Добавьте расходы в группах, чтобы увидеть статистику</Text>
              </View>
            )}
          </>
        )}

        <View style={s.premiumBlock}>
          <View style={{ flex: 1 }}>
            <Text style={s.premiumTitle}>Полная аналитика в Premium</Text>
            <Text style={s.premiumSub}>Прогноз трат, экспорт и история без лимита</Text>
          </View>
          <TouchableOpacity onPress={() => Alert.alert('Скоро!', 'Следи за обновлениями')} style={s.premiumBtn} activeOpacity={0.8}>
            <Text style={s.premiumBtnText}>199 ₽/мес</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  header: {
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.page,
  },
  headerTitle: { fontFamily: Fonts.brand700, fontSize: 24, color: C.ink, letterSpacing: -1.2 },
  headerMonth: { fontFamily: Fonts.body600, fontSize: 13, color: C.accent, textTransform: 'capitalize' },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: { marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: C.ink, letterSpacing: -0.9, textTransform: 'lowercase' },
  segmented: {
    flexDirection: 'row', gap: 4, padding: 4, backgroundColor: C.surface, borderRadius: 999,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  segBtnActive: { backgroundColor: C.accent },
  segLabel: { fontFamily: Fonts.body500, fontSize: 13.5, color: C.sub },
  segLabelActive: { fontFamily: Fonts.body700, color: '#fff' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 18, padding: 20, marginTop: 14 },
  donutWrap: { flexShrink: 0 },
  donutOuter: { width: 92, height: 92, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  donutInner: { width: 66, height: 66, borderRadius: 999, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  donutSmall: { fontFamily: Fonts.body400, fontSize: 9.5, color: C.faint, textTransform: 'uppercase', letterSpacing: 0.5 },
  donutNum: { fontFamily: Fonts.brand700, fontSize: 13, color: C.ink },
  summaryLabel: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.sub },
  summaryTotal: { fontFamily: Fonts.brand700, fontSize: 30, color: C.ink, letterSpacing: -0.8, marginTop: 2 },
  summaryEmpty: { fontFamily: Fonts.body400, fontSize: 12, color: C.faint, marginTop: 4 },
  center: { paddingVertical: 40, alignItems: 'center', gap: 8 },
  emptyTitle: { fontFamily: Fonts.brand700, fontSize: 17, color: C.ink, letterSpacing: -0.5, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.body400, fontSize: 13.5, color: C.sub, textAlign: 'center', lineHeight: 20, maxWidth: 260 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  barIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  barLabel: { fontFamily: Fonts.body500, fontSize: 13, color: C.ink },
  barAmount: { fontFamily: Fonts.body700, fontSize: 13.5, color: C.ink },
  barTrack: { height: 7, borderRadius: 999, backgroundColor: C.accentSoft, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  barPct: { fontFamily: Fonts.body400, fontSize: 12, color: C.faint, width: 32, textAlign: 'right' },
  groupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12 },
  groupRowBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  groupIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  groupName: { flex: 1, fontFamily: Fonts.body500, fontSize: 13.5, color: C.ink, textTransform: 'lowercase' },
  groupAmount: { fontFamily: Fonts.body700, fontSize: 14, color: C.ink },
  premiumBlock: { marginTop: 20, borderRadius: 18, padding: 18, backgroundColor: C.ink, flexDirection: 'row', alignItems: 'center', gap: 14 },
  premiumTitle: { fontFamily: Fonts.brand700, fontSize: 15, color: C.page, letterSpacing: -0.4 },
  premiumSub: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.sub, marginTop: 3, lineHeight: 18 },
  premiumBtn: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, backgroundColor: C.accent },
  premiumBtnText: { fontFamily: Fonts.body700, fontSize: 13, color: '#fff' },
});
