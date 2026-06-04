import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Step = 'welcome' | 'email' | 'otp' | 'name';
type Mode = 'login' | 'register';

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn} activeOpacity={0.7}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M15 6l-6 6 6 6" stroke={Colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </TouchableOpacity>
  );
}

function PrimaryBtn({ label, onPress, disabled, loading }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color="#fff" />
        : <Text style={[s.primaryBtnText, disabled && s.primaryBtnTextDisabled]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

function isValidEmail(v: string) {
  return v.includes('@') && v.includes('.') && v.length > 4;
}

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { enterGuestMode } = useAuthStore();
  const router = useRouter();

  const handleDevLogin = async () => {
    setLoading(true);
    setError('');
    // 1. Пробуем анонимный вход (нужен тоггл в Supabase Auth → Anonymous)
    const { error: anonErr } = await supabase.auth.signInAnonymously();
    if (!anonErr) { setLoading(false); return; }

    // 2. Пробуем dev-пользователя email+пароль (нужен Email provider + SQL из README)
    const { error: passErr } = await supabase.auth.signInWithPassword({
      email: 'artem@dev.local',
      password: 'test123',
    });
    setLoading(false);
    if (!passErr) return;

    // 3. Ни один не сработал — показываем что включить
    setError('Включи в Supabase: Auth → Providers → Anonymous Sign-ins');
  };

  const otpRefs = [
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
    useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null),
  ];

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs[0].current?.focus(), 120);
  }, [step]);

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep('otp');
  };

  const handleOtpChange = (val: string, i: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 5) otpRefs[i + 1].current?.focus();
    if (next.every(d => d)) {
      setTimeout(async () => {
        const token = next.join('');
        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        setLoading(false);
        if (error) {
          setError('Неверный код'); setOtp(['', '', '', '', '', '']); otpRefs[0].current?.focus();
          return;
        }
        if (mode === 'register') setStep('name');
        // else: onAuthStateChange in _layout handles redirect
      }, 280);
    }
  };

  const handleOtpKey = (e: any, i: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[i] && i > 0) {
      const prev = [...otp]; prev[i - 1] = ''; setOtp(prev);
      otpRefs[i - 1].current?.focus();
    }
  };

  const handleNameDone = async () => {
    if (!validName) return;
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const trimmed = name.trim();
        await Promise.all([
          supabase.from('profiles').update({ display_name: trimmed }).eq('id', authUser.id),
          supabase.auth.updateUser({ data: { display_name: trimmed } }),
        ]);
      }
    } catch {}
    setLoading(false);
    router.replace('/(tabs)/groups' as any);
  };

  // ── Welcome ───────────────────────────────────────────────
  if (step === 'welcome') return (
    <View style={s.container}>
      <Text style={s.bgLetter} aria-hidden>q</Text>
      <View style={s.welcomeContent}>
        <View style={s.welcomeTag}>
          <Text style={s.welcomeTagText}>QWIT · РОССИЯ</Text>
        </View>
        <Text style={s.welcomeHeadline}>
          {'ваши\nрасходы\n'}
          <Text style={s.welcomeHeadlineAccent}>{'под\nконтролем'}</Text>
        </Text>
        <Text style={s.welcomeBody}>Делите с друзьями. Считает автоматически. Переводит через СБП.</Text>
        <TouchableOpacity onPress={() => { setMode('register'); setStep('email'); }} style={[s.primaryBtn, s.primaryBtnShadow]} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Создать аккаунт</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setMode('login'); setStep('email'); }} style={s.secondaryBtn} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>Войти</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDevLogin} style={s.skipBtn} activeOpacity={0.6} disabled={loading}>
          {loading
            ? <ActivityIndicator color={Colors.faint} size="small" />
            : <Text style={s.skipText}>Пропустить →</Text>
          }
        </TouchableOpacity>
        {error ? <Text style={s.skipError}>{error}</Text> : null}
      </View>
    </View>
  );

  // ── Email ─────────────────────────────────────────────────
  if (step === 'email') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}><BackBtn onPress={() => setStep('welcome')} /></View>
        <Text style={s.stepTitle}>{mode === 'register' ? 'Введите email' : 'Добро пожаловать'}</Text>
        <Text style={s.stepSub}>{mode === 'register' ? 'Пришлём код подтверждения на почту' : 'Войдите с помощью email'}</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.textInput}
            value={email}
            onChangeText={v => setEmail(v.trim())}
            placeholder="your@email.com"
            placeholderTextColor={Colors.faint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            onSubmitEditing={() => isValidEmail(email) && handleSendOtp()}
          />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PrimaryBtn label="Продолжить" onPress={handleSendOtp} disabled={!isValidEmail(email)} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );

  // ── OTP ───────────────────────────────────────────────────
  if (step === 'otp') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}><BackBtn onPress={() => setStep('email')} /></View>
        <Text style={s.stepTitle}>Код из письма</Text>
        <Text style={s.stepSub}>Отправили на{' '}<Text style={{ color: Colors.ink, fontFamily: Fonts.body600 }}>{email}</Text></Text>
        <View style={s.otpRow}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={otpRefs[i]}
              style={[s.otpCell, d ? s.otpCellFilled : null]}
              value={d}
              onChangeText={v => handleOtpChange(v, i)}
              onKeyPress={e => handleOtpKey(e, i)}
              keyboardType="number-pad"
              maxLength={2}
              selectTextOnFocus
            />
          ))}
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        {loading && <ActivityIndicator color={Colors.accent} style={{ marginVertical: 8 }} />}
        <Text style={s.resendText}>
          Не пришёл код?{'  '}
          <Text style={s.resendLink} onPress={() => supabase.auth.signInWithOtp({ email })}>Отправить снова</Text>
        </Text>
        <TouchableOpacity onPress={() => { if (mode === 'register') setStep('name'); }} style={s.skipBtn}>
          <Text style={s.skipText}>пропустить (демо)</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ── Name ──────────────────────────────────────────────────
  const validName = name.trim().length >= 2;
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}><BackBtn onPress={() => setStep('otp')} /></View>
        <Text style={s.stepTitle}>Как вас зовут?</Text>
        <Text style={s.stepSub}>Это увидят участники ваших групп</Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Ваше имя"
            placeholderTextColor={Colors.faint}
            autoFocus
            onSubmitEditing={() => validName && handleNameDone()}
          />
        </View>
        <PrimaryBtn label="Готово" onPress={handleNameDone} disabled={!validName} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.page },

  // Welcome
  bgLetter: {
    position: 'absolute', top: 28, left: -18,
    fontFamily: Fonts.brand700, fontSize: 320, lineHeight: 320,
    color: Colors.accent, opacity: 0.055, letterSpacing: -20,
    pointerEvents: 'none',
  },
  welcomeContent: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: 26, paddingBottom: 52,
    zIndex: 1,
  },
  welcomeTag: {
    alignSelf: 'flex-start', backgroundColor: Colors.accentSoft,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginBottom: 18,
  },
  welcomeTagText: {
    fontFamily: Fonts.brand700, fontSize: 11.5, color: Colors.accent,
    letterSpacing: 1.4, textTransform: 'uppercase',
  },
  welcomeHeadline: {
    fontFamily: Fonts.brand700, fontSize: 52, color: Colors.ink,
    letterSpacing: -3, lineHeight: 50, marginBottom: 18,
  },
  welcomeHeadlineAccent: { color: Colors.accent },
  welcomeBody: {
    fontFamily: Fonts.body400, fontSize: 14.5, color: Colors.sub,
    lineHeight: 22, marginBottom: 28, maxWidth: 260,
  },
  primaryBtnShadow: {
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  secondaryBtn: {
    padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 12,
    backgroundColor: Colors.surface,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  secondaryBtnText: { fontFamily: Fonts.body600, fontSize: 16, color: Colors.ink },

  // Steps
  stepInner: { flex: 1, paddingHorizontal: 24, paddingTop: 0 },
  backRow: { paddingTop: 60, marginBottom: 30 },
  backBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  stepTitle: { fontFamily: Fonts.brand700, fontSize: 28, color: Colors.ink, letterSpacing: -1.2, marginBottom: 8 },
  stepSub: { fontFamily: Fonts.body400, fontSize: 14, color: Colors.sub, marginBottom: 32, lineHeight: 21 },

  // OTP
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  otpCell: {
    width: 48, height: 58, borderRadius: 14,
    borderWidth: 2, borderColor: Colors.line,
    backgroundColor: Colors.surface, textAlign: 'center',
    fontFamily: Fonts.brand700, fontSize: 26, color: Colors.ink,
  },
  otpCellFilled: { borderColor: Colors.accent },
  resendText: { textAlign: 'center', fontFamily: Fonts.body400, fontSize: 13, color: Colors.sub, marginBottom: 20 },
  resendLink: { fontFamily: Fonts.body600, color: Colors.accent },
  skipBtn: { alignItems: 'center', marginTop: 4 },
  skipText: { fontFamily: Fonts.body400, fontSize: 12.5, color: Colors.faint, textDecorationLine: 'underline' },
  skipError: { fontFamily: Fonts.body400, fontSize: 12, color: Colors.neg, textAlign: 'center', marginTop: 8 },

  // Generic input
  inputWrap: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 14,
  },
  textInput: { fontFamily: Fonts.body400, fontSize: 16, color: Colors.ink, paddingVertical: 16 },

  // Primary button
  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: Colors.accentSoft },
  primaryBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  primaryBtnTextDisabled: { color: Colors.accent },

  error: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.neg, marginBottom: 12 },
});
