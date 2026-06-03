import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet, Pressable,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Step = 'welcome' | 'phone' | 'otp' | 'name';
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

function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 10);
  if (!d) return '';
  let r = d.slice(0, 3);
  if (d.length > 3) r += ' ' + d.slice(3, 6);
  if (d.length > 6) r += '-' + d.slice(6, 8);
  if (d.length > 8) r += '-' + d.slice(8, 10);
  return r;
}

export default function AuthScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [mode, setMode] = useState<Mode>('login');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { enterGuestMode } = useAuthStore();

  const otpRefs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs[0].current?.focus(), 120);
  }, [step]);

  const phoneDigits = phone.replace(/\D/g, '');
  const fullPhone = `+7${phoneDigits}`;

  const handleSendOtp = async () => {
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStep('otp');
  };

  const handleOtpChange = (val: string, i: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp]; next[i] = digit; setOtp(next);
    if (digit && i < 3) otpRefs[i + 1].current?.focus();
    if (next.every(d => d)) {
      setTimeout(async () => {
        const token = next.join('');
        setLoading(true);
        const { error } = await supabase.auth.verifyOtp({ phone: fullPhone, token, type: 'sms' });
        setLoading(false);
        if (error) {
          setError('Неверный код'); setOtp(['', '', '', '']); otpRefs[0].current?.focus();
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
    // Profile update after auth — session already set
    // supabase.from('profiles').update({ display_name: name.trim() }) can be called here
  };

  // ── Welcome (Вариант E — Акцент-тип) ──────────────────────
  if (step === 'welcome') return (
    <View style={s.container}>
      {/* Огромная буква-фон */}
      <Text style={s.bgLetter} aria-hidden>q</Text>
      {/* Контент — прижат к низу */}
      <View style={s.welcomeContent}>
        <View style={s.welcomeTag}>
          <Text style={s.welcomeTagText}>QWIT · РОССИЯ</Text>
        </View>
        <Text style={s.welcomeHeadline}>
          {'ваши\nрасходы\n'}
          <Text style={s.welcomeHeadlineAccent}>{'под\nконтролем'}</Text>
        </Text>
        <Text style={s.welcomeBody}>Делите с друзьями. Считает автоматически. Переводит через СБП.</Text>
        <TouchableOpacity onPress={() => { setMode('register'); setStep('phone'); }} style={[s.primaryBtn, s.primaryBtnShadow]} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Создать аккаунт</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { setMode('login'); setStep('phone'); }} style={s.secondaryBtn} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>Войти</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={enterGuestMode} style={s.skipBtn} activeOpacity={0.6}>
          <Text style={s.skipText}>Пропустить →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Phone ─────────────────────────────────────────────────
  if (step === 'phone') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}><BackBtn onPress={() => setStep('welcome')} /></View>
        <Text style={s.stepTitle}>{mode === 'register' ? 'Введите номер' : 'Добро пожаловать'}</Text>
        <Text style={s.stepSub}>{mode === 'register' ? 'Пришлём код подтверждения по SMS' : 'Войдите с помощью номера телефона'}</Text>
        <View style={s.phoneRow}>
          <Text style={s.phonePrefix}>+7</Text>
          <View style={s.phoneDivider}/>
          <TextInput
            style={s.phoneInput}
            value={phone}
            onChangeText={v => setPhone(formatPhone(v))}
            placeholder="900 000-00-00"
            placeholderTextColor={Colors.faint}
            keyboardType="phone-pad"
            autoFocus
            onSubmitEditing={() => phoneDigits.length === 10 && handleSendOtp()}
          />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PrimaryBtn label="Продолжить" onPress={handleSendOtp} disabled={phoneDigits.length < 10} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );

  // ── OTP ───────────────────────────────────────────────────
  if (step === 'otp') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}><BackBtn onPress={() => setStep('phone')} /></View>
        <Text style={s.stepTitle}>Код из SMS</Text>
        <Text style={s.stepSub}>Отправили на{' '}<Text style={{ color: Colors.ink, fontFamily: Fonts.body600 }}>+7 {phone}</Text></Text>
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
          <Text style={s.resendLink} onPress={() => supabase.auth.signInWithOtp({ phone: fullPhone })}>Отправить снова</Text>
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

  // Welcome — Вариант E
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

  // Phone input
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 14,
  },
  phonePrefix: { fontFamily: Fonts.body400, fontSize: 16, color: Colors.sub },
  phoneDivider: { width: 1, height: 20, backgroundColor: Colors.line },
  phoneInput: {
    flex: 1, fontFamily: Fonts.body400, fontSize: 16, color: Colors.ink,
    paddingVertical: 16, letterSpacing: 0.5,
  },

  // OTP
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 24 },
  otpCell: {
    width: 62, height: 70, borderRadius: 16,
    borderWidth: 2, borderColor: Colors.line,
    backgroundColor: Colors.surface, textAlign: 'center',
    fontFamily: Fonts.brand700, fontSize: 28, color: Colors.ink,
  },
  otpCellFilled: { borderColor: Colors.accent },
  resendText: { textAlign: 'center', fontFamily: Fonts.body400, fontSize: 13, color: Colors.sub, marginBottom: 20 },
  resendLink: { fontFamily: Fonts.body600, color: Colors.accent },
  skipBtn: { alignItems: 'center', marginTop: 4 },
  skipText: { fontFamily: Fonts.body400, fontSize: 12.5, color: Colors.faint, textDecorationLine: 'underline' },

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
