import { useMemo } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore, FONT_SCALES, fs } from '@/store/settings';
import { useProfile } from '@/hooks/useProfile';
import { useGroups } from '@/hooks/useGroups';

const FREE_GROUP_LIMIT = 3;

function Chevron() {
  const C = useColors();
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={C.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
}

export default function ProfileScreen() {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();
  const { user, signOut, isPremium } = useAuthStore();
  const { fontScale, setFontScale, notifications, setNotifications, darkMode, setDarkMode } = useSettingsStore();
  const { data: profile } = useProfile();
  const { data: groups } = useGroups();

  const groupCount = groups?.length ?? 0;
  const groupPct = Math.min((groupCount / FREE_GROUP_LIMIT) * 100, 100);

  const userName = profile?.display_name ?? user?.user_metadata?.display_name ?? user?.email?.split('@')[0] ?? 'Я';
  const userEmail = user?.email ?? '';
  const userCode = user?.id ? (user.id.split('-').pop() ?? user.id.slice(-12)).toUpperCase() : '------------';
  const avatarLetter = (userName[0] ?? 'Я').toUpperCase();

  const handlePremium = () => Alert.alert('Скоро!', 'Следи за обновлениями');
  const handleLock = () => Alert.alert('Скоро!', 'Блокировка появится в следующем обновлении.');
  const handlePayments = () => Alert.alert(
    'Способы оплаты · СБП',
    'Переводы выполняются через Систему Быстрых Платежей. Поддерживаются все банки-участники СБП.\n\nНомер телефона привязывается в настройках профиля.',
  );
  const handleCurrency = () => Alert.alert('Валюта', 'В текущей версии доступен только ₽ (рубль). Мультивалюта — в следующих обновлениях.');
  const handleAbout = () => Alert.alert('О приложении', 'qwit · версия 0.1\n\nПриложение для совместного учёта расходов.\nСделано в России.\n\nПо вопросам: hi@qwit.app');

  const handleSignOut = () => {
    Alert.alert('Выйти из аккаунта?', 'Вы сможете войти снова по email', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => signOut() },
    ]);
  };


  return (
    <SafeAreaView style={s.container} edges={['top']}>
      <View style={s.header}>
        <Text style={s.headerTitle}>профиль</Text>
        <TouchableOpacity
          style={s.settingsBtn}
          activeOpacity={0.7}
          onPress={() => router.push('/settings' as any)}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Circle cx="12" cy="12" r="3" stroke={C.accent} strokeWidth={1.8}/>
            <Path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5h-4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.6a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.6a7 7 0 0 0 .1-1z" stroke={C.accent} strokeWidth={1.8}/>
          </Svg>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* User row */}
        <View style={s.userRow}>
          <View style={s.avatar}><Text style={s.avatarText}>{avatarLetter}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{userName}</Text>
            {userEmail ? <Text style={s.userSub}>{userEmail}</Text> : null}
            <View style={s.codeRow}>
              <Text style={s.codeLabel}>Ваш ID: </Text>
              <Text style={s.codeValue}>{userCode}</Text>
            </View>
          </View>
        </View>

        {/* Premium block */}
        <View style={[s.premiumBlock, s.premiumShadow]}>
          <View style={s.premiumTitleRow}>
            <Text style={s.premiumWordmark}>qwit</Text>
            <View style={s.premiumBadge}><Text style={s.premiumBadgeText}>PREMIUM</Text></View>
          </View>
          <Text style={s.premiumBody}>Безлимит групп, сканирование чеков, напоминания должникам, мультивалюта и виджет.</Text>
          <TouchableOpacity style={s.premiumBtn} activeOpacity={0.85} onPress={handlePremium}>
            <Text style={s.premiumBtnText}>Подключить за 199 ₽/мес</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePremium} activeOpacity={0.7}>
            <Text style={s.premiumHint}>или 990 ₽/год — выгода 50%</Text>
          </TouchableOpacity>
        </View>

        {/* Tariff */}
        {!isPremium && (
          <>
            <View style={s.sectionHeader}><Text style={s.sectionTitle}>ваш тариф</Text></View>
            <View style={[s.card, { padding: 18 }]}>
              <View style={s.tariffHeader}>
                <Text style={s.tariffName}>Бесплатный</Text>
                <Text style={s.tariffHist}>история 30 дней</Text>
              </View>
              <View style={s.tariffRow}>
                <Text style={s.tariffLabel}>Группы</Text>
                <Text style={s.tariffVal}>{groupCount} из {FREE_GROUP_LIMIT}</Text>
              </View>
              <View style={s.tariffTrack}>
                <View style={[s.tariffFill, { width: `${groupPct}%` }]} />
              </View>
            </View>
          </>
        )}

        {/* Settings */}
        <View style={s.sectionHeader}><Text style={s.sectionTitle}>настройки</Text></View>
        <View style={[s.card, { overflow: 'hidden' }]}>

          {/* Notifications */}
          <View style={[s.settingRow, s.settingBorder]}>
            <View style={[s.settingIcon, { backgroundColor: '#EEF1FE' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path d="M12 3a6 6 0 0 0-6 6v3l-1.5 3h15L18 12V9a6 6 0 0 0-6-6zM9.5 18a2.5 2.5 0 0 0 5 0" stroke="#2F5BEA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
              </Svg>
            </View>
            <Text style={s.settingLabel}>Уведомления</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: C.accent, false: C.line }}
              thumbColor="#fff"
            />
          </View>

          {/* СБП */}
          <TouchableOpacity style={[s.settingRow, s.settingBorder]} activeOpacity={0.7} onPress={handlePayments}>
            <View style={[s.settingIcon, { backgroundColor: '#E6F6EE' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <G><Rect x="3" y="6" width="18" height="12" rx="2" stroke="#0E9F6E" strokeWidth={1.8} fill="none"/><Path d="M3 10h18" stroke="#0E9F6E" strokeWidth={1.8}/></G>
              </Svg>
            </View>
            <Text style={s.settingLabel}>Способы оплаты · СБП</Text>
            <Chevron />
          </TouchableOpacity>

          {/* Currency */}
          <TouchableOpacity style={[s.settingRow, s.settingBorder]} activeOpacity={0.7} onPress={handleCurrency}>
            <View style={[s.settingIcon, { backgroundColor: '#FBEFD7' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <G><Circle cx="12" cy="12" r="8.5" stroke="#C9820E" strokeWidth={1.8} fill="none"/><Path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17" stroke="#C9820E" strokeWidth={1.8}/></G>
              </Svg>
            </View>
            <Text style={s.settingLabel}>Валюта · ₽</Text>
            <Text style={s.settingRight}>только ₽</Text>
          </TouchableOpacity>

          {/* Dark mode */}
          <View style={[s.settingRow, s.settingBorder]}>
            <View style={[s.settingIcon, { backgroundColor: '#EEEAFB' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <G><Circle cx="12" cy="12" r="4" stroke="#6E4FD0" strokeWidth={1.8} fill="none"/><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="#6E4FD0" strokeWidth={1.8} strokeLinecap="round"/></G>
              </Svg>
            </View>
            <Text style={s.settingLabel}>Тёмная тема</Text>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ true: C.accent, false: C.line }}
              thumbColor="#fff"
            />
          </View>

          {/* About */}
          <TouchableOpacity style={s.settingRow} activeOpacity={0.7} onPress={handleAbout}>
            <View style={[s.settingIcon, { backgroundColor: '#F0F1F3' }]}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <G><Circle cx="12" cy="12" r="9" stroke={C.sub} strokeWidth={1.8} fill="none"/><Path d="M12 16v-4M12 8h.01" stroke={C.sub} strokeWidth={1.8} strokeLinecap="round"/></G>
              </Svg>
            </View>
            <Text style={s.settingLabel}>О приложении · v0.1</Text>
            <Chevron />
          </TouchableOpacity>

        </View>

        {/* Font scale */}
        <View style={s.sectionHeader}><Text style={[s.sectionTitle, { fontSize: fs(18, fontScale) }]}>размер текста</Text></View>
        <View style={[s.card, s.fontRow]}>
          {FONT_SCALES.map((item) => {
            const active = Math.abs(fontScale - item.value) < 0.01;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setFontScale(item.value)}
                style={[s.fontBtn, active && s.fontBtnActive]}
                activeOpacity={0.7}
              >
                <Text style={[
                  s.fontBtnLabel,
                  { fontSize: item.key === 'S' ? 13 : item.key === 'M' ? 17 : item.key === 'L' ? 21 : 25 },
                  active && s.fontBtnLabelActive,
                ]}>А</Text>
                {active && <View style={s.fontDot} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[s.actionBtn, { marginTop: 12 }]} onPress={handleLock} activeOpacity={0.7}>
          <Text style={[s.actionBtnText, { color: C.sub }]}>Заблокировать приложение</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, { marginTop: 10 }]} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={[s.actionBtnText, { color: C.neg }]}>Выйти</Text>
        </TouchableOpacity>
        <Text style={s.footer}>qwit · версия 0.1 · сделано в России</Text>
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
  settingsBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: C.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { paddingHorizontal: 18, paddingBottom: 24 },
  card: {
    backgroundColor: C.surface, borderRadius: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionHeader: { marginTop: 22, marginBottom: 12 },
  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: C.ink, letterSpacing: -0.9, textTransform: 'lowercase' },

  userRow: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 6, paddingHorizontal: 2 },
  avatar: { width: 64, height: 64, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Fonts.brand700, fontSize: 26, color: '#fff' },
  userName: { fontFamily: Fonts.brand700, fontSize: 21, color: C.ink, letterSpacing: -0.6 },
  userSub: { fontFamily: Fonts.body400, fontSize: 13, color: C.sub, marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  codeLabel: { fontFamily: Fonts.body400, fontSize: 11.5, color: C.faint },
  codeValue: { fontFamily: Fonts.body700, fontSize: 11.5, color: C.sub, letterSpacing: 1 },

  premiumBlock: { marginTop: 18, borderRadius: 18, padding: 20, backgroundColor: C.accent },
  premiumShadow: { shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10 },
  premiumTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumWordmark: { fontFamily: Fonts.brand700, fontSize: 18, color: '#fff', letterSpacing: -0.5 },
  premiumBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: '#fff' },
  premiumBadgeText: { fontFamily: Fonts.brand700, fontSize: 12, color: C.accent, letterSpacing: 0.3 },
  premiumBody: { fontFamily: Fonts.body400, fontSize: 13.5, color: 'rgba(255,255,255,0.82)', marginTop: 10, lineHeight: 20 },
  premiumBtn: { marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center' },
  premiumBtnText: { fontFamily: Fonts.body700, fontSize: 14.5, color: C.accent },
  premiumHint: { fontFamily: Fonts.body400, fontSize: 11.5, color: 'rgba(255,255,255,0.82)', textAlign: 'center', marginTop: 9 },

  tariffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  tariffName: { fontFamily: Fonts.body700, fontSize: 15, color: C.ink },
  tariffHist: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.sub },
  tariffRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  tariffLabel: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.sub },
  tariffVal: { fontFamily: Fonts.body600, fontSize: 12.5, color: C.ink },
  tariffTrack: { height: 7, borderRadius: 999, backgroundColor: C.accentSoft, overflow: 'hidden' },
  tariffFill: { height: '100%', borderRadius: 999, backgroundColor: C.accent },

  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 14, paddingVertical: 13 },
  settingBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  settingLabel: { flex: 1, fontFamily: Fonts.body400, fontSize: 14, color: C.ink },
  settingRight: { fontFamily: Fonts.body400, fontSize: 12, color: C.faint },

  actionBtn: {
    padding: 13, borderRadius: 18, alignItems: 'center',
    backgroundColor: C.surface,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  actionBtnText: { fontFamily: Fonts.body600, fontSize: 14.5 },
  footer: { fontFamily: Fonts.body400, fontSize: 11.5, color: C.faint, textAlign: 'center', marginTop: 14 },

  fontRow: { flexDirection: 'row', padding: 8, gap: 6 },
  fontBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14, backgroundColor: C.page, gap: 6 },
  fontBtnActive: { backgroundColor: C.accentSoft },
  fontBtnLabel: { fontFamily: Fonts.brand700, color: C.faint },
  fontBtnLabelActive: { color: C.accent },
  fontDot: { width: 5, height: 5, borderRadius: 99, backgroundColor: C.accent },
});
