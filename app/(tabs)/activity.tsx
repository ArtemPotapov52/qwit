import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { useSettingsStore, fs } from '@/store/settings';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from '@/components/ui/CatIcon';
import { fmt } from '@/lib/format';

type FeedItem = {
  kind: 'expense' | 'settle' | 'join';
  cat?: CatKey;
  who: string;
  text: string;
  group?: string;
  amount?: number;
  time: string;
};

const FEED: { day: string; items: FeedItem[] }[] = [
  { day: 'Сегодня', items: [
    { kind: 'expense', cat: 'home',  who: 'Аня',  text: 'добавила «Интернет»', group: 'Квартира', amount: 1200, time: '14:20' },
    { kind: 'settle',                who: 'Вы',   text: 'перевели Косте через СБП', amount: -640, time: '12:05' },
    { kind: 'expense', cat: 'bowl',  who: 'Костя', text: 'добавил «Рамен»', group: 'Обеды', amount: 1920, time: '11:40' },
  ]},
  { day: 'Вчера', items: [
    { kind: 'expense', cat: 'plane', who: 'Вы',   text: 'добавили «Airbnb»', group: 'Поездка в Питер', amount: 9250, time: '21:10' },
    { kind: 'join',                  who: 'Лера',  text: 'вступила в «Поездка в Питер»', time: '18:30' },
    { kind: 'expense', cat: 'cart',  who: 'Маша', text: 'добавила «Продукты на неделю»', group: 'Квартира', amount: 3400, time: '17:02' },
  ]},
  { day: '30 мая', items: [
    { kind: 'settle',                who: 'Лера',  text: 'перевела вам через СБП', amount: 850, time: '09:15' },
    { kind: 'expense', cat: 'gift',  who: 'Вы',   text: 'добавили «Торт»', group: 'День рождения Маши', amount: 2100, time: '08:40' },
  ]},
];

function ItemAvatar({ item }: { item: FeedItem }) {
  if (item.kind === 'expense' && item.cat) {
    const meta = CAT_META[item.cat];
    return (
      <View style={[s.avatar, { backgroundColor: meta.bg }]}>
        <CatIcon cat={item.cat} color={meta.ink} size={20} />
      </View>
    );
  }
  if (item.kind === 'settle') return (
    <View style={[s.avatar, { backgroundColor: '#E6F6EE' }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M4 9h13l-3-3M20 15H7l3 3" stroke={Colors.pos} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </View>
  );
  return (
    <View style={[s.avatar, { backgroundColor: Colors.accentSoft }]}>
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M5.5 19.5c.4-3.3 3-5 6.5-5s6.1 1.7 6.5 5" stroke={Colors.accent} strokeWidth={1.9} strokeLinecap="round"/>
        <Path d="M12 3.1a3.4 3.4 0 1 1 0 6.8 3.4 3.4 0 0 1 0-6.8z" stroke={Colors.accent} strokeWidth={1.9}/>
      </Svg>
    </View>
  );
}

export default function ActivityScreen() {
  const { fontScale } = useSettingsStore();
  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>лента</Text>
        <TouchableOpacity style={s.filterBtn} activeOpacity={0.7}>
          <Svg width={19} height={19} viewBox="0 0 24 24" fill="none">
            <Path d="M4 6h16M7 12h10M10 18h4" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round"/>
          </Svg>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {FEED.map((sec, si) => (
          <View key={si}>
            <Text style={s.dayLabel}>{sec.day}</Text>
            <View style={s.sectionCard}>
              {sec.items.map((item, i) => (
                <View key={i} style={[s.feedRow, i < sec.items.length - 1 && s.feedRowBorder]}>
                  <ItemAvatar item={item} />
                  <View style={s.feedInfo}>
                    <Text style={[s.feedText, { fontSize: fs(13.5, fontScale) }]}>
                      <Text style={s.feedWho}>{item.who}</Text>
                      {' '}{item.text}
                    </Text>
                    <Text style={[s.feedMeta, { fontSize: fs(11.5, fontScale) }]}>{item.group ? `${item.group} · ${item.time}` : item.time}</Text>
                  </View>
                  {item.amount !== undefined && (
                    <Text style={[s.feedAmt, { color: item.kind === 'settle' ? (item.amount > 0 ? Colors.pos : Colors.sub) : Colors.ink }]}>
                      {item.kind === 'settle' ? fmt(item.amount) : fmt(item.amount, false)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
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
  filterBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
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
  feedAmt: { fontFamily: Fonts.body700, fontSize: 15 },
});
