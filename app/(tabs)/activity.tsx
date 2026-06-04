import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { useSettingsStore, fs } from '@/store/settings';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';
import { useActivity, ActivityItem } from '@/hooks/useActivity';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function ItemAvatar({ item }: { item: ActivityItem }) {
  if (item.type === 'expense_added' && item.group_cat) {
    const meta = CAT_META[item.group_cat];
    return (
      <View style={[s.avatar, { backgroundColor: meta.bg }]}>
        <CatIcon cat={item.group_cat} color={meta.ink} size={20} />
      </View>
    );
  }
  if (item.type === 'expense_settled') {
    return (
      <View style={[s.avatar, { backgroundColor: '#E6F6EE' }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d="M4 9h13l-3-3M20 15H7l3 3" stroke={Colors.pos} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"/>
        </Svg>
      </View>
    );
  }
  return (
    <View style={[s.avatar, { backgroundColor: Colors.accentSoft }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 19.5c.4-3.3 3-5 6.5-5s6.1 1.7 6.5 5" stroke={Colors.accent} strokeWidth={1.9} strokeLinecap="round"/>
        <Path d="M12 3.1a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z" stroke={Colors.accent} strokeWidth={1.9}/>
      </Svg>
    </View>
  );
}

function itemText(item: ActivityItem): string {
  switch (item.type) {
    case 'expense_added': {
      const title = (item.payload?.title as string) ?? 'расход';
      return `добавил(а) «${title}»`;
    }
    case 'expense_settled': return 'выполнил(а) перевод';
    case 'member_joined': return `вступил(а) в группу`;
    case 'group_created': return 'создал(а) группу';
    default: return '';
  }
}

function itemAmount(item: ActivityItem): number | null {
  if (item.type === 'expense_added') {
    const v = item.payload?.amount;
    return v !== undefined ? Number(v) : null;
  }
  return null;
}

export default function ActivityScreen() {
  const { fontScale } = useSettingsStore();
  const { data: feed, isLoading } = useActivity();

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>лента</Text>
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator color={Colors.accent} />
        </View>
      ) : !feed?.length ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>Пока ничего нет</Text>
          <Text style={s.emptyBody}>Создайте группу и добавьте первый расход</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {feed.map((sec) => (
            <View key={sec.day}>
              <Text style={s.dayLabel}>{sec.day}</Text>
              <View style={s.sectionCard}>
                {sec.items.map((item, i) => {
                  const amount = itemAmount(item);
                  return (
                    <View key={item.id} style={[s.feedRow, i < sec.items.length - 1 && s.feedRowBorder]}>
                      <ItemAvatar item={item} />
                      <View style={s.feedInfo}>
                        <Text style={[s.feedText, { fontSize: fs(13.5, fontScale) }]}>
                          <Text style={s.feedWho}>{item.actor_name}</Text>
                          {' '}{itemText(item)}
                        </Text>
                        <Text style={[s.feedMeta, { fontSize: fs(11.5, fontScale) }]}>
                          {item.group_name ? `${item.group_name} · ` : ''}{formatTime(item.created_at)}
                        </Text>
                      </View>
                      {amount !== null && (
                        <Text style={s.feedAmt}>{fmt(amount, false)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: Colors.ink, letterSpacing: -0.6, textAlign: 'center' },
  emptyBody: { fontFamily: Fonts.body400, fontSize: 14, color: Colors.sub, textAlign: 'center', lineHeight: 20 },
  dayLabel: {
    fontFamily: Fonts.brand600, fontSize: 13, color: Colors.faint, textTransform: 'lowercase',
    letterSpacing: -0.3, marginTop: 20, marginBottom: 10, marginLeft: 2,
  },
  sectionCard: {
    backgroundColor: Colors.surface, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  feedRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  feedRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  avatar: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  feedInfo: { flex: 1, minWidth: 0 },
  feedText: { fontFamily: Fonts.body400, fontSize: 13.5, color: Colors.ink, lineHeight: 18 },
  feedWho: { fontFamily: Fonts.body600 },
  feedMeta: { fontFamily: Fonts.body400, fontSize: 11.5, color: Colors.faint, marginTop: 2 },
  feedAmt: { fontFamily: Fonts.body700, fontSize: 15, color: Colors.ink },
});
