import { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, G, Rect } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useSettingsStore } from '@/store/settings';

function BackBtn({ onPress }: { onPress: () => void }) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn} activeOpacity={0.7}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M15 6l-6 6 6 6" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </TouchableOpacity>
  );
}

interface RowProps {
  icon: React.ReactNode;
  tint: string;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

function SettingRow({ icon, tint, label, right, onPress, disabled }: RowProps) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress || disabled}
      style={s.row}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[s.rowIcon, { backgroundColor: tint }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">{icon}</Svg>
      </View>
      <Text style={[s.rowLabel, disabled && s.rowLabelDisabled]}>{label}</Text>
      {right ?? null}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const { notifications, darkMode, setNotifications, setDarkMode } = useSettingsStore();

  const handlePayments = () => {
    Alert.alert(
      'Способы оплаты · СБП',
      'Для переводов используется Система Быстрых Платежей (СБП). Номер телефона привязывается при настройке профиля.\n\nПоддерживаются все банки-участники СБП.',
    );
  };

  const handleCurrency = () => {
    Alert.alert('Валюта', 'В текущей версии поддерживается только ₽ (рубль). Мультивалюта появится в следующих обновлениях.');
  };

  const handleAbout = () => {
    Alert.alert('О приложении', 'qwit · версия 0.1\n\nПриложение для совместного учёта расходов.\nСделано в России.\n\nПо вопросам: hi@qwit.app');
  };

  const handleLock = () => {
    Alert.alert('Скоро!', 'Блокировка приложения появится в следующем обновлении.');
  };

  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <BackBtn onPress={() => router.back()} />
        <Text style={s.headerTitle}>настройки</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Notifications */}
        <Text style={s.sectionLabel}>уведомления</Text>
        <View style={[s.card, { overflow: 'hidden' }]}>
          <SettingRow
            icon={<Path d="M12 3a6 6 0 0 0-6 6v3l-1.5 3h15L18 12V9a6 6 0 0 0-6-6zM9.5 18a2.5 2.5 0 0 0 5 0" stroke="#2F5BEA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>}
            tint="#EEF1FE"
            label="Уведомления и напоминания"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: C.accent, false: C.line }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* Payments */}
        <Text style={s.sectionLabel}>оплата</Text>
        <View style={[s.card, { overflow: 'hidden' }]}>
          <SettingRow
            icon={<G><Rect x="3" y="6" width="18" height="12" rx="2" stroke="#0E9F6E" strokeWidth={1.8} fill="none"/><Path d="M3 10h18" stroke="#0E9F6E" strokeWidth={1.8}/></G>}
            tint="#E6F6EE"
            label="Способы оплаты · СБП"
            onPress={handlePayments}
            right={<ChevronIcon />}
          />
          <View style={s.rowDivider} />
          <SettingRow
            icon={<G><Circle cx="12" cy="12" r="8.5" stroke="#C9820E" strokeWidth={1.8} fill="none"/><Path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" stroke="#C9820E" strokeWidth={1.8}/></G>}
            tint="#FBEFD7"
            label="Валюта · ₽"
            onPress={handleCurrency}
            disabled
            right={<Text style={s.disabledTag}>только ₽</Text>}
          />
        </View>

        {/* Appearance */}
        <Text style={s.sectionLabel}>оформление</Text>
        <View style={[s.card, { overflow: 'hidden' }]}>
          <SettingRow
            icon={<G><Circle cx="12" cy="12" r="4" stroke="#6E4FD0" strokeWidth={1.8} fill="none"/><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="#6E4FD0" strokeWidth={1.8} strokeLinecap="round"/></G>}
            tint="#EEEAFB"
            label="Тёмная тема"
            right={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ true: C.accent, false: C.line }}
                thumbColor="#fff"
              />
            }
          />
        </View>

        {/* App */}
        <Text style={s.sectionLabel}>приложение</Text>
        <View style={[s.card, { overflow: 'hidden' }]}>
          <SettingRow
            icon={<G><Circle cx="12" cy="12" r="9" stroke={C.sub} strokeWidth={1.8} fill="none"/><Path d="M12 16v-4M12 8h.01" stroke={C.sub} strokeWidth={1.8} strokeLinecap="round"/></G>}
            tint="#F0F1F3"
            label="О приложении · v0.1"
            onPress={handleAbout}
            right={<ChevronIcon />}
          />
          <View style={s.rowDivider} />
          <SettingRow
            icon={<Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke={C.sub} strokeWidth={1.8} strokeLinejoin="round"/>}
            tint="#F0F1F3"
            label="Заблокировать приложение"
            onPress={handleLock}
            right={<ChevronIcon />}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function ChevronIcon() {
  const C = useColors();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={C.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.page },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  headerTitle: { fontFamily: Fonts.brand700, fontSize: 20, color: C.ink, letterSpacing: -0.8 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40 },
  sectionLabel: {
    fontFamily: Fonts.brand600, fontSize: 12, color: C.faint,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 10, marginLeft: 2,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { flex: 1, fontFamily: Fonts.body400, fontSize: 14, color: C.ink },
  rowLabelDisabled: { color: C.faint },
  rowDivider: { height: 1, backgroundColor: C.hairline, marginLeft: 61 },
  disabledTag: { fontFamily: Fonts.body400, fontSize: 12, color: C.faint },
});
