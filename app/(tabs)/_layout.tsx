import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { NavIcon } from '@/components/ui/NavIcon';
import { NewGroupSheet } from '@/components/ui/NewGroupSheet';
import { useAuthStore } from '@/store/auth';
import { useGroups } from '@/hooks/useGroups';

const FREE_GROUP_LIMIT = 3;

const TABS = [
  { id: 'groups', label: 'Группы' },
  { id: 'stats', label: 'Статистика' },
  { id: 'activity', label: 'Лента' },
  { id: 'profile', label: 'Профиль' },
] as const;

function BottomNav({ active, onChange, onAdd }: {
  active: string;
  onChange: (id: string) => void;
  onAdd: () => void;
}) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);

  const Tab = ({ tab }: { tab: typeof TABS[number] }) => {
    const isActive = tab.id === active;
    const color = isActive ? C.accent : C.faint;
    return (
      <TouchableOpacity key={tab.id} onPress={() => onChange(tab.id)} style={s.tab} activeOpacity={0.7}>
        <NavIcon name={tab.id} color={color} active={isActive} />
        <Text style={[s.tabLabel, { color, fontFamily: isActive ? Fonts.body700 : Fonts.body500 }]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.nav}>
      <View style={s.navSide}>{left.map(t => <Tab key={t.id} tab={t} />)}</View>
      <View style={s.navCenter}>
        <TouchableOpacity onPress={onAdd} style={s.plusBtn} activeOpacity={0.8}>
          <Svg width={23} height={23} viewBox="0 0 20 20">
            <Path d="M10 4v12M4 10h12" stroke="#fff" strokeWidth={2.4} strokeLinecap="round"/>
          </Svg>
        </TouchableOpacity>
      </View>
      <View style={s.navSide}>{right.map(t => <Tab key={t.id} tab={t} />)}</View>
    </View>
  );
}

export default function TabsLayout() {
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const router = useRouter();
  const { isPremium } = useAuthStore();
  const { data: groups } = useGroups();

  const handleAdd = () => {
    const count = groups?.length ?? 0;
    if (!isPremium && count >= FREE_GROUP_LIMIT) {
      Alert.alert(
        'Лимит достигнут',
        `Бесплатный план позволяет создать не более ${FREE_GROUP_LIMIT} групп. Подключите Premium для безлимитного доступа.`,
        [
          { text: 'Позже', style: 'cancel' },
          { text: 'Узнать о Premium', onPress: () => Alert.alert('Скоро!', 'Следи за обновлениями') },
        ],
      );
      return;
    }
    setNewGroupOpen(true);
  };

  return (
    <Tabs
      tabBar={(props) => {
        const active = props.state.routes[props.state.index]?.name ?? 'groups';
        return (
          <>
            <BottomNav
              active={active}
              onChange={(id) => router.navigate(`/(tabs)/${id}` as any)}
              onAdd={handleAdd}
            />
            <NewGroupSheet
              open={newGroupOpen}
              onClose={() => setNewGroupOpen(false)}
              onCreated={() => setNewGroupOpen(false)}
            />
          </>
        );
      }}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="activity" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  nav: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 10, paddingBottom: 26, paddingHorizontal: 10,
    backgroundColor: C.page,
    borderTopWidth: 1, borderTopColor: C.line,
  },
  navSide: { flex: 1, flexDirection: 'row', justifyContent: 'space-around' },
  navCenter: { width: 74, alignItems: 'center', flexShrink: 0 },
  tab: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 2 },
  tabLabel: { fontSize: 10 },
  plusBtn: { width: 44, height: 44, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
});
