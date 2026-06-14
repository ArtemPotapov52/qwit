import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { fmt } from '@/lib/format';
import { BANKS } from '@/lib/sbp/bankDeeplinks';
import { useRecipientPhone, useSavePhone, useSettleDebt } from '@/hooks/useSettleDebt';

interface Props {
  open: boolean;
  onClose: () => void;
  onSettled: () => void;
  groupId: string;
  fromMemberId: string;     // group_members.id
  toMemberId: string;       // group_members.id
  toUserId: string | null;  // profiles.id для поиска телефона (null у гостей)
  toGuestPhone: string | null; // телефон гостя (если нет аккаунта)
  toName: string;
  amount: number;
}

type Step = 'phone' | 'banks' | 'confirm';

// Форматирует строку цифр (11 символов, начиная с 7) в +7 (900) 123-45-67
function formatPhone(raw: string): string {
  // Извлекаем только цифры
  let digits = raw.replace(/\D/g, '');
  // Нормализуем: 8→7, не начинающиеся на 7 — добавляем 7
  if (digits.startsWith('8')) digits = '7' + digits.slice(1);
  if (digits.length > 0 && !digits.startsWith('7')) digits = '7' + digits;
  if (digits.length === 0) digits = '7';
  digits = digits.slice(0, 11);

  let result = '+7';
  if (digits.length <= 1) return result;
  result += ' (' + digits.slice(1, Math.min(4, digits.length));
  if (digits.length < 4) return result;
  result += ') ' + digits.slice(4, Math.min(7, digits.length));
  if (digits.length < 7) return result;
  result += '-' + digits.slice(7, Math.min(9, digits.length));
  if (digits.length < 9) return result;
  result += '-' + digits.slice(9, 11);
  return result;
}

function validatePhone(v: string) {
  const digits = v.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('7');
}

export function SettleSbpSheet({
  open, onClose, onSettled,
  groupId, fromMemberId, toMemberId, toUserId, toGuestPhone, toName, amount,
}: Props) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Для гостей телефон берём из guest_phone, для зарегистрированных — из profiles
  const { data: profilePhone, isLoading: phoneLoading } = useRecipientPhone(
    open && toUserId ? toUserId : null,
  );
  const recipientPhone = toGuestPhone ?? profilePhone ?? null;
  const { mutate: savePhone, isPending: savingPhone } = useSavePhone();
  const { mutate: settleDebt, isPending: settling } = useSettleDebt();

  const [step, setStep] = useState<Step>('phone');
  const [banksView, setBanksView] = useState<'banks' | 'qr'>('banks');
  const [phoneDigits, setPhoneDigits] = useState('7'); // только цифры, без форматирования
  const [phoneInput, setPhoneInput] = useState('+7'); // отображаемая строка
  const [phoneError, setPhoneError] = useState('');
  const [copied, setCopied] = useState(false);
  const [bankNotFound, setBankNotFound] = useState<string | null>(null);

  const resolvedPhone = recipientPhone ?? phoneInput;

  useEffect(() => {
    if (open) {
      setStep('phone');
      setBanksView('banks');
      setPhoneDigits('7');
      setPhoneInput('+7');
      setPhoneError('');
      setCopied(false);
      setBankNotFound(null);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  // Как только телефон загружен — прыгаем сразу на шаг выбора банка
  useEffect(() => {
    if (open && !phoneLoading && recipientPhone) {
      setStep('banks');
    }
  }, [open, phoneLoading, recipientPhone]);

  const handleSavePhone = () => {
    const trimmed = phoneInput.trim();
    if (!validatePhone(trimmed)) {
      setPhoneError('Введите корректный номер телефона (10–12 цифр)');
      return;
    }
    setPhoneError('');
    savePhone(
      { userId: toUserId, memberId: toMemberId, phone: trimmed },
      {
        onSuccess: () => setStep('banks'),
        onError: () => setPhoneError('Не удалось сохранить номер. Попробуйте снова.'),
      },
    );
  };

  const handleBankTap = async (bankId: string) => {
    const bank = BANKS.find(b => b.bankId === bankId);
    if (!bank || !resolvedPhone) return;

    const url = bank.buildUrl(resolvedPhone, amount);
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        setStep('confirm');
      } else {
        setBankNotFound(bank.name);
        await handleFallbackCopy();
      }
    } catch {
      setBankNotFound(bank.name);
      await handleFallbackCopy();
    }
  };

  const handleFallbackCopy = async () => {
    const text = `${resolvedPhone} ${amount} ₽`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setStep('confirm');
  };

  const handleConfirm = () => {
    settleDebt(
      { groupId, fromMemberId, toMemberId, amount, paymentMethod: 'sbp' },
      {
        onSuccess: () => {
          onSettled();
          onClose();
        },
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Ошибка при сохранении платежа';
          Alert.alert('Ошибка', msg);
        },
      },
    );
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill as object} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <View style={s.inner}>
            {/* Шапка */}
            <Text style={s.title}>Вернуть через СБП</Text>
            <Text style={s.subtitle}>
              {toName} · {fmt(amount, false)}
            </Text>

            {/* Шаг 1: ввод номера телефона */}
            {step === 'phone' && (
              <>
                {phoneLoading ? (
                  <ActivityIndicator color={C.accent} style={{ marginVertical: 24 }} />
                ) : (
                  <>
                    <Text style={s.desc}>
                      Укажите номер телефона получателя для перевода через СБП
                    </Text>
                    <View style={s.inputWrap}>
                      <TextInput
                        style={s.input}
                        value={phoneInput}
                        onChangeText={v => {
                          const newRaw = v.replace(/\D/g, '');
                          let next: string;

                          if (v.length < phoneInput.length && newRaw.length === phoneDigits.length) {
                            // Удалили разделитель (скобку, дефис, пробел) — удаляем последнюю цифру
                            next = phoneDigits.slice(0, -1) || '7';
                          } else {
                            next = newRaw || '7';
                          }

                          // Нормализация: 8→7, добавляем 7 если нет
                          if (next.startsWith('8')) next = '7' + next.slice(1);
                          if (!next.startsWith('7')) next = '7' + next;
                          next = next.slice(0, 11);

                          setPhoneDigits(next);
                          setPhoneInput(formatPhone(next));
                          setPhoneError('');
                        }}
                        placeholder="+7 (900) 000-00-00"
                        placeholderTextColor={C.faint}
                        keyboardType="phone-pad"
                        autoFocus
                      />
                    </View>
                    {phoneError ? <Text style={s.error}>{phoneError}</Text> : null}
                    <TouchableOpacity
                      style={[s.btn, (!validatePhone(phoneInput) || savingPhone) && s.btnDisabled]}
                      onPress={handleSavePhone}
                      disabled={!validatePhone(phoneInput) || savingPhone}
                      activeOpacity={0.85}
                    >
                      {savingPhone
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={s.btnText}>Далее</Text>}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {/* Шаг 2: выбор банка или QR */}
            {step === 'banks' && (
              <>
                {/* Переключатель Банки / QR */}
                <View style={s.tabRow}>
                  <TouchableOpacity
                    style={[s.tab, banksView === 'banks' && s.tabActive]}
                    onPress={() => setBanksView('banks')}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, banksView === 'banks' && s.tabTextActive]}>Банки</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.tab, banksView === 'qr' && s.tabActive]}
                    onPress={() => setBanksView('qr')}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.tabText, banksView === 'qr' && s.tabTextActive]}>QR-код</Text>
                  </TouchableOpacity>
                </View>

                {banksView === 'banks' ? (
                  <>
                    <Text style={s.desc}>
                      Нажми на свой банк — откроется приложение с номером и суммой{'\n'}
                      <Text style={[s.desc, { color: C.faint, fontSize: 12 }]}>
                        Останется только подтвердить перевод
                      </Text>
                    </Text>
                    <View style={s.bankGrid}>
                      {BANKS.map(bank => (
                        <TouchableOpacity
                          key={bank.bankId}
                          style={s.bankBtn}
                          onPress={() => handleBankTap(bank.bankId)}
                          activeOpacity={0.75}
                        >
                          <Text style={s.bankName}>{bank.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity
                      style={s.fallbackBtn}
                      onPress={handleFallbackCopy}
                      activeOpacity={0.7}
                    >
                      <Text style={s.fallbackText}>Моего банка нет — скопировать данные</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={s.desc}>
                      Отсканируй камерой банковского приложения — номер заполнится автоматически
                    </Text>
                    <View style={s.qrWrap}>
                      <QRCode
                        value={resolvedPhone ?? '+7'}
                        size={180}
                        color={C.ink}
                        backgroundColor={C.surface}
                      />
                      <Text style={s.qrPhone}>{formatPhone(resolvedPhone?.replace(/\D/g, '') ?? '7')}</Text>
                      <Text style={s.qrAmount}>{fmt(amount, false)}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.fallbackBtn}
                      onPress={handleFallbackCopy}
                      activeOpacity={0.7}
                    >
                      <Text style={s.fallbackText}>Скопировать номер и сумму</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {/* Шаг 3: подтверждение перевода */}
            {step === 'confirm' && (
              <>
                {bankNotFound ? (
                  <View style={[s.copiedHint, { backgroundColor: '#FFF3E0' }]}>
                    <Text style={[s.copiedText, { color: '#E65100' }]}>
                      Приложение «{bankNotFound}» не найдено.{'\n'}
                      Данные скопированы — открой любое банковское приложение и вставь вручную.
                    </Text>
                  </View>
                ) : copied ? (
                  <View style={s.copiedHint}>
                    <Text style={s.copiedText}>
                      Данные скопированы — открой приложение банка и вставь
                    </Text>
                  </View>
                ) : null}
                <Text style={s.desc}>После того как перевёл — нажми «Я перевёл»</Text>
                <TouchableOpacity
                  style={[s.btn, settling && s.btnDisabled]}
                  onPress={handleConfirm}
                  disabled={settling}
                  activeOpacity={0.85}
                >
                  {settling
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={s.btnText}>Я перевёл ✓</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(16,17,20,0.56)',
  },
  sheet: {
    backgroundColor: C.page,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  handle: {
    width: 38, height: 4, borderRadius: 999,
    backgroundColor: C.line, alignSelf: 'center', marginTop: 12,
  },
  inner: { padding: 20, paddingBottom: 40 },
  title: {
    fontFamily: Fonts.brand700, fontSize: 22, color: C.ink,
    letterSpacing: -0.8, marginBottom: 4,
  },
  subtitle: {
    fontFamily: Fonts.body500, fontSize: 14, color: C.accent, marginBottom: 20,
  },
  desc: {
    fontFamily: Fonts.body400, fontSize: 14, color: C.sub,
    marginBottom: 18, lineHeight: 20,
  },
  inputWrap: {
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 8,
  },
  input: {
    fontFamily: Fonts.body400, fontSize: 15, color: C.ink, paddingVertical: 14,
  },
  error: {
    fontFamily: Fonts.body400, fontSize: 13, color: C.neg, marginBottom: 12,
  },
  btn: {
    backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8,
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.28, shadowRadius: 24, elevation: 8,
  },
  btnDisabled: { backgroundColor: C.accentSoft, shadowOpacity: 0, elevation: 0 },
  btnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  bankGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  bankBtn: {
    width: '23%', paddingVertical: 12, paddingHorizontal: 4, borderRadius: 12,
    backgroundColor: C.surface, alignItems: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  bankName: { fontFamily: Fonts.body600, fontSize: 12, color: C.ink, textAlign: 'center' },
  fallbackBtn: {
    padding: 14, borderRadius: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.line,
  },
  fallbackText: { fontFamily: Fonts.body500, fontSize: 14, color: C.sub },
  tabRow: {
    flexDirection: 'row', backgroundColor: C.surface,
    borderRadius: 12, padding: 4, marginBottom: 18, gap: 4,
  },
  tab: {
    flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center',
  },
  tabActive: { backgroundColor: C.page, shadowColor: '#101114', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontFamily: Fonts.body500, fontSize: 14, color: C.sub },
  tabTextActive: { color: C.ink, fontFamily: Fonts.body700 },
  qrWrap: {
    alignItems: 'center', paddingVertical: 20,
    backgroundColor: C.surface, borderRadius: 18, marginBottom: 16,
  },
  qrPhone: { fontFamily: Fonts.body600, fontSize: 16, color: C.ink, marginTop: 16 },
  qrAmount: { fontFamily: Fonts.body400, fontSize: 13, color: C.sub, marginTop: 4 },
  copiedHint: {
    backgroundColor: C.accentSoft, borderRadius: 12, padding: 14, marginBottom: 16,
  },
  copiedText: {
    fontFamily: Fonts.body400, fontSize: 13.5, color: C.accent, lineHeight: 19,
  },
});
