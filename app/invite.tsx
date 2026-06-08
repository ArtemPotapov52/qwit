import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Share, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useMyReferralCode, useMyReferrals, useApplyReferralCode } from '@/hooks/useReferral';

export default function InviteScreen() {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const router = useRouter();

  const { data: codeData, isLoading: codeLoading, isError: codeError } = useMyReferralCode();
  const { data: referrals = [], isLoading: referralsLoading } = useMyReferrals();
  const { mutate: applyCode, isPending: applying } = useApplyReferralCode();

  const [inputCode, setInputCode] = useState('');
  const [applyResult, setApplyResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const code = codeData?.code ?? null;
  const shareText = code ? `Привет! Присоединяйся к qwit — приложению для совместного учёта расходов. Мой код: ${code}` : '';

  const handleShare = async () => {
    if (!shareText) return;
    await Share.share({ message: shareText });
  };

  const handleCopyCode = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleApply = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed.length < 4) {
      Alert.alert('Введите код', 'Реферальный код должен быть не менее 4 символов');
      return;
    }
    setApplyResult(null);
    applyCode(trimmed, {
      onSuccess: (result) => {
        if (result.success) {
          setApplyResult('Код применён! Спасибо, что присоединился по приглашению.');
          setInputCode('');
        } else {
          setApplyResult(result.error ?? 'Не удалось применить код');
        }
      },
      onError: (e) => {
        setApplyResult(e instanceof Error ? e.message : 'Ошибка применения кода');
      },
    });
  };

  return (
    <SafeAreaView style={s.page} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 6l-6 6 6 6" stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
          </Svg>
        </TouchableOpacity>
        <Text style={s.headerTitle}>пригласить друзей</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Мой код */}
        <View style={s.hero}>
          <Text style={s.heroLabel}>мой реферальный код</Text>
          {codeLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : codeError ? (
            <Text style={[s.heroCopyHint, { color: 'rgba(255,255,255,0.7)' }]}>
              Не удалось загрузить код. Примените миграцию 013 в Supabase SQL Editor.
            </Text>
          ) : (
            <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.8}>
              <Text style={s.heroCode}>{code ?? '—'}</Text>
              <Text style={s.heroCopyHint}>{copied ? 'Скопировано ✓' : 'Нажми, чтобы скопировать'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.85}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
              <Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
            </Svg>
            <Text style={s.shareBtnText}>Поделиться</Text>
          </TouchableOpacity>
        </View>

        {/* Счётчик приглашённых */}
        <Text style={s.sectionTitle}>приглашённые</Text>
        <View style={s.card}>
          {referralsLoading ? (
            <ActivityIndicator color={C.accent} style={{ padding: 20 }} />
          ) : referrals.length === 0 ? (
            <Text style={s.empty}>Пока никого. Поделись кодом — и здесь появятся приглашённые.</Text>
          ) : (
            <View style={s.countRow}>
              <Text style={s.countNum}>{referrals.length}</Text>
              <Text style={s.countLabel}>
                {referrals.length === 1 ? 'человек присоединился' : 'человек присоединились'}
              </Text>
            </View>
          )}
        </View>

        {/* Ввод чужого кода */}
        <Text style={s.sectionTitle}>у тебя есть код?</Text>
        <View style={s.card}>
          <Text style={s.desc}>Если тебя пригласил друг — введи его код ниже</Text>
          <View style={s.inputRow}>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={inputCode}
                onChangeText={v => { setInputCode(v.toUpperCase()); setApplyResult(null); }}
                placeholder="ABCD12"
                placeholderTextColor={C.faint}
                autoCapitalize="characters"
                maxLength={10}
              />
            </View>
            <TouchableOpacity
              style={[s.applyBtn, (!inputCode.trim() || applying) && s.applyBtnDisabled]}
              onPress={handleApply}
              disabled={!inputCode.trim() || applying}
              activeOpacity={0.85}
            >
              {applying
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.applyBtnText}>Применить</Text>}
            </TouchableOpacity>
          </View>
          {applyResult ? (
            <Text style={[s.applyResult, applyResult.startsWith('Код') && s.applyResultOk]}>
              {applyResult}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  page: { flex: 1, backgroundColor: C.page },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  headerTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: C.ink, letterSpacing: -0.7 },
  scroll: { paddingHorizontal: 18, paddingBottom: 40 },

  hero: {
    backgroundColor: C.accent, borderRadius: 18, padding: 24, marginBottom: 24,
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 30, elevation: 10,
  },
  heroLabel: { fontFamily: Fonts.body400, fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  heroCode: { fontFamily: Fonts.brand700, fontSize: 36, color: '#fff', letterSpacing: 4, marginBottom: 4 },
  heroCopyHint: { fontFamily: Fonts.body400, fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 18 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 12, alignSelf: 'flex-start',
  },
  shareBtnText: { fontFamily: Fonts.body600, fontSize: 14, color: '#fff' },

  sectionTitle: { fontFamily: Fonts.brand700, fontSize: 18, color: C.ink, letterSpacing: -0.9, textTransform: 'lowercase', marginBottom: 12 },
  card: {
    backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 24,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  empty: { fontFamily: Fonts.body400, fontSize: 13.5, color: C.sub, lineHeight: 20 },
  countRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  countNum: { fontFamily: Fonts.brand700, fontSize: 36, color: C.accent },
  countLabel: { fontFamily: Fonts.body400, fontSize: 14, color: C.sub },
  desc: { fontFamily: Fonts.body400, fontSize: 13.5, color: C.sub, marginBottom: 14, lineHeight: 19 },
  inputRow: { flexDirection: 'row', gap: 10 },
  inputWrap: {
    flex: 1, backgroundColor: C.page, borderRadius: 12, paddingHorizontal: 14,
    borderWidth: 1, borderColor: C.line,
  },
  input: { fontFamily: Fonts.body700, fontSize: 16, color: C.ink, paddingVertical: 12, letterSpacing: 2 },
  applyBtn: {
    backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4,
  },
  applyBtnDisabled: { backgroundColor: C.accentSoft, shadowOpacity: 0, elevation: 0 },
  applyBtnText: { fontFamily: Fonts.body700, fontSize: 14, color: '#fff' },
  applyResult: { fontFamily: Fonts.body400, fontSize: 13, color: C.neg, marginTop: 10 },
  applyResultOk: { color: C.pos },
});
