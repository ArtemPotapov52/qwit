import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';

type Step = 'welcome' | 'email' | 'password' | 'name';
type Mode = 'login' | 'register';

function BackBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.backBtn} activeOpacity={0.7}>
      <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
        <Path d="M15 6l-6 6 6 6" stroke={Colors.ink} strokeWidth={2.2}
          strokeLinecap="round" strokeLinejoin="round"/>
      </Svg>
    </TouchableOpacity>
  );
}

function PrimaryBtn({ label, onPress, disabled, loading }: {
  label: string; onPress: () => void; disabled?: boolean; loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading}
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={disabled ? Colors.accent : '#fff'} />
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
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const reset = () => { setEmail(''); setPassword(''); setName(''); setError(''); };

  // ── Войти: email + пароль ──────────────────────────────────
  const handleLogin = async () => {
    if (!isValidEmail(email) || password.length < 6) return;
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      if (err.message.includes('Invalid login')) setError('Неверный email или пароль');
      else setError(err.message);
    }
    // Успех → onAuthStateChange в _layout.tsx сам редиректит
  };

  // ── Создать аккаунт: signUp → name ────────────────────────
  const handleRegister = async () => {
    if (!isValidEmail(email) || password.length < 6) return;
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      if (err.message.includes('already registered')) setError('Email уже зарегистрирован. Войдите.');
      else setError(err.message);
      return;
    }
    setStep('name');
  };

  // ── Сохранить имя ─────────────────────────────────────────
  const handleNameDone = async () => {
    if (name.trim().length < 2) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const trimmed = name.trim();
        await Promise.all([
          supabase.from('profiles').upsert({ id: user.id, display_name: trimmed }, { onConflict: 'id' }),
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
        <Text style={s.welcomeBody}>
          Делите с друзьями. Считает автоматически. Переводит через СБП.
        </Text>
        <TouchableOpacity
          onPress={() => { reset(); setMode('register'); setStep('email'); }}
          style={[s.primaryBtn, s.primaryBtnShadow]}
          activeOpacity={0.85}
        >
          <Text style={s.primaryBtnText}>Создать аккаунт</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { reset(); setMode('login'); setStep('email'); }}
          style={s.secondaryBtn}
          activeOpacity={0.85}
        >
          <Text style={s.secondaryBtnText}>Войти</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Email ─────────────────────────────────────────────────
  if (step === 'email') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}>
          <BackBtn onPress={() => { setStep('welcome'); setError(''); }} />
        </View>
        <Text style={s.stepTitle}>
          {mode === 'register' ? 'Ваш email' : 'Добро пожаловать'}
        </Text>
        <Text style={s.stepSub}>
          {mode === 'register' ? 'Будет вашим логином' : 'Введите email для входа'}
        </Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.textInput}
            value={email}
            onChangeText={v => { setEmail(v.trim()); setError(''); }}
            placeholder="your@email.com"
            placeholderTextColor={Colors.faint}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoFocus
            onSubmitEditing={() => isValidEmail(email) && setStep('password')}
          />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PrimaryBtn
          label="Продолжить"
          onPress={() => { setError(''); setStep('password'); }}
          disabled={!isValidEmail(email)}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // ── Password ──────────────────────────────────────────────
  if (step === 'password') return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}>
          <BackBtn onPress={() => { setStep('email'); setError(''); }} />
        </View>
        <Text style={s.stepTitle}>
          {mode === 'register' ? 'Создайте пароль' : 'Введите пароль'}
        </Text>
        <Text style={s.stepSub}>
          {mode === 'register' ? 'Минимум 6 символов' : email}
        </Text>
        <View style={s.inputWrap}>
          <TextInput
            style={s.textInput}
            value={password}
            onChangeText={v => { setPassword(v); setError(''); }}
            placeholder="••••••••"
            placeholderTextColor={Colors.faint}
            secureTextEntry
            autoFocus
            onSubmitEditing={() => {
              if (password.length >= 6) {
                mode === 'login' ? handleLogin() : handleRegister();
              }
            }}
          />
        </View>
        {error ? <Text style={s.error}>{error}</Text> : null}
        <PrimaryBtn
          label={mode === 'login' ? 'Войти' : 'Создать аккаунт'}
          onPress={mode === 'login' ? handleLogin : handleRegister}
          disabled={password.length < 6}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );

  // ── Name ──────────────────────────────────────────────────
  const validName = name.trim().length >= 2;
  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.stepInner}>
        <View style={s.backRow}>
          <BackBtn onPress={() => setStep('password')} />
        </View>
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
        <PrimaryBtn label="Готово" onPress={handleNameDone} disabled={!validName} loading={loading} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.page },

  bgLetter: {
    position: 'absolute', top: 28, left: -18,
    fontFamily: Fonts.brand700, fontSize: 320, lineHeight: 320,
    color: Colors.accent, opacity: 0.055, letterSpacing: -20,
    pointerEvents: 'none',
  },
  welcomeContent: {
    flex: 1, justifyContent: 'flex-end',
    paddingHorizontal: 26, paddingBottom: 52, zIndex: 1,
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
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  secondaryBtnText: { fontFamily: Fonts.body600, fontSize: 16, color: Colors.ink },

  stepInner: { flex: 1, paddingHorizontal: 24 },
  backRow: { paddingTop: 60, marginBottom: 30 },
  backBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  stepTitle: {
    fontFamily: Fonts.brand700, fontSize: 28, color: Colors.ink,
    letterSpacing: -1.2, marginBottom: 8,
  },
  stepSub: {
    fontFamily: Fonts.body400, fontSize: 14, color: Colors.sub,
    marginBottom: 32, lineHeight: 21,
  },

  inputWrap: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 14,
  },
  textInput: { fontFamily: Fonts.body400, fontSize: 16, color: Colors.ink, paddingVertical: 16 },

  primaryBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center',
  },
  primaryBtnDisabled: { backgroundColor: Colors.accentSoft },
  primaryBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  primaryBtnTextDisabled: { color: Colors.accent },

  error: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.neg, marginBottom: 12 },
});
