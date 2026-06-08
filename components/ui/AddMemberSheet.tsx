import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard, Alert,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { searchUsersByPartial, useAddMember, useAddGuestMember, FoundUser } from '@/hooks/useAddMember';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

type Tab = 'code' | 'guest';

export function AddMemberSheet({ open, onClose, groupId }: Props) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);

  const [tab, setTab] = useState<Tab>('guest');

  // ── Режим «по коду» ──
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<FoundUser[]>([]);
  const [selected, setSelected] = useState<FoundUser | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: addMember, isPending: addingMember } = useAddMember(groupId);

  // ── Режим «гость» ──
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const { mutate: addGuest, isPending: addingGuest } = useAddGuestMember(groupId);

  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(460)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 460, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 230, useNativeDriver: true }),
      ]).start(() => {
        if (!open) {
          setQuery(''); setSuggestions([]); setSelected(null);
          setGuestName(''); setGuestPhone(''); setError('');
        }
      });
    }
  }, [open]);

  // Дебаунс-поиск по коду
  useEffect(() => {
    if (tab !== 'code' || selected) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try { setSuggestions(await searchUsersByPartial(query.trim())); }
      catch { setSuggestions([]); }
      finally { setSearching(false); }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, tab]);

  // ── Добавить по коду ──
  const handleAddByCode = () => {
    if (!selected || addingMember) return;
    Keyboard.dismiss();
    setError('');
    addMember(selected.id, {
      onSuccess: () => onClose(),
      onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка'),
    });
  };

  // ── Выбор из контактов ──
  const handlePickContact = async () => {
    setContactsLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нет доступа', 'Разрешите доступ к контактам в настройках.');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      if (!data.length) {
        Alert.alert('Контакты пусты', 'В телефонной книге нет контактов.');
        return;
      }
      // Показываем простой выбор через Alert
      // Для полноценного picker нужен отдельный экран — пока Alert с первыми 10
      const options = data.slice(0, 20).map(c => ({
        name: c.name ?? 'Без имени',
        phone: c.phoneNumbers?.[0]?.number ?? '',
      }));
      Alert.alert(
        'Выберите контакт',
        'Выберите из списка:',
        [
          ...options.map(o => ({
            text: o.phone ? `${o.name} (${o.phone})` : o.name,
            onPress: () => {
              setGuestName(o.name);
              setGuestPhone(o.phone);
            },
          })),
          { text: 'Отмена', style: 'cancel' },
        ],
      );
    } catch (e) {
      Alert.alert('Ошибка', 'Не удалось загрузить контакты.');
    } finally {
      setContactsLoading(false);
    }
  };

  // ── Добавить гостя ──
  const handleAddGuest = () => {
    if (!guestName.trim() || addingGuest) return;
    Keyboard.dismiss();
    setError('');
    addGuest(
      { name: guestName.trim(), phone: guestPhone.trim() || undefined },
      {
        onSuccess: () => onClose(),
        onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка'),
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

            {/* Заголовок */}
            <View style={s.header}>
              <Text style={s.title}>добавить участника</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 6 6 18M6 6l12 12" stroke={C.sub} strokeWidth={2.5} strokeLinecap="round"/>
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Табы */}
            <View style={s.tabs}>
              <TouchableOpacity
                style={[s.tab, tab === 'guest' && s.tabActive]}
                onPress={() => { setTab('guest'); setError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, tab === 'guest' && s.tabTextActive]}>Без регистрации</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, tab === 'code' && s.tabActive]}
                onPress={() => { setTab('code'); setError(''); }}
                activeOpacity={0.7}
              >
                <Text style={[s.tabText, tab === 'code' && s.tabTextActive]}>По коду</Text>
              </TouchableOpacity>
            </View>

            {/* ── Режим «Без регистрации» ── */}
            {tab === 'guest' && (
              <>
                {/* Кнопка «Из контактов» */}
                <TouchableOpacity
                  style={s.contactsBtn}
                  onPress={handlePickContact}
                  activeOpacity={0.75}
                  disabled={contactsLoading}
                >
                  {contactsLoading
                    ? <ActivityIndicator color={C.accent} size="small" />
                    : (
                      <>
                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                          <Path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke={C.accent} strokeWidth={2} strokeLinecap="round"/>
                          <Circle cx="9" cy="7" r="4" stroke={C.accent} strokeWidth={2} fill="none"/>
                          <Path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke={C.accent} strokeWidth={2} strokeLinecap="round"/>
                        </Svg>
                        <Text style={s.contactsBtnText}>Выбрать из контактов</Text>
                      </>
                    )
                  }
                </TouchableOpacity>

                <View style={s.dividerRow}>
                  <View style={s.dividerLine} />
                  <Text style={s.dividerText}>или вручную</Text>
                  <View style={s.dividerLine} />
                </View>

                {/* Имя */}
                <View style={s.inputWrap}>
                  <TextInput
                    style={s.input}
                    value={guestName}
                    onChangeText={setGuestName}
                    placeholder="Имя участника"
                    placeholderTextColor={C.faint}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

                {/* Телефон */}
                <View style={[s.inputWrap, { marginBottom: 0 }]}>
                  <TextInput
                    style={s.input}
                    value={guestPhone}
                    onChangeText={setGuestPhone}
                    placeholder="Телефон (необязательно)"
                    placeholderTextColor={C.faint}
                    keyboardType="phone-pad"
                    autoCorrect={false}
                  />
                </View>
                <Text style={s.hint}>Телефон нужен для перевода через СБП</Text>

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleAddGuest}
                  disabled={!guestName.trim() || addingGuest}
                  style={[s.addBtn, (!guestName.trim() || addingGuest) && s.addBtnDisabled]}
                  activeOpacity={0.85}
                >
                  {addingGuest
                    ? <ActivityIndicator color={guestName.trim() ? '#fff' : C.accent} />
                    : <Text style={[s.addBtnText, !guestName.trim() && s.addBtnTextDisabled]}>
                        {guestName.trim() ? `Добавить ${guestName.trim()}` : 'Добавить участника'}
                      </Text>
                  }
                </TouchableOpacity>
              </>
            )}

            {/* ── Режим «По коду» ── */}
            {tab === 'code' && (
              <>
                <Text style={s.hint}>Введите ID участника — он виден в его профиле</Text>

                <View style={[s.inputWrap, selected && s.inputWrapSelected]}>
                  <View style={s.inputIcon}>
                    {selected ? (
                      <View style={s.selAvatar}>
                        <Text style={s.selLetter}>{(selected.display_name ?? '?')[0].toUpperCase()}</Text>
                      </View>
                    ) : (
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Circle cx="11" cy="11" r="7" stroke={C.faint} strokeWidth={1.8}/>
                        <Path d="M16.5 16.5l4 4" stroke={C.faint} strokeWidth={1.8} strokeLinecap="round"/>
                      </Svg>
                    )}
                  </View>
                  <TextInput
                    style={s.input}
                    value={query}
                    onChangeText={v => { setQuery(v); if (selected) setSelected(null); }}
                    placeholder="напр. 000000000002"
                    placeholderTextColor={C.faint}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searching && <ActivityIndicator color={C.accent} size="small" style={{ marginRight: 12 }} />}
                  {selected && (
                    <TouchableOpacity onPress={() => { setSelected(null); setQuery(''); }} style={s.clearBtn}>
                      <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6 6 18M6 6l12 12" stroke={C.faint} strokeWidth={2.5} strokeLinecap="round"/>
                      </Svg>
                    </TouchableOpacity>
                  )}
                </View>

                {suggestions.length > 0 && !selected && (
                  <View style={s.dropdown}>
                    {suggestions.map((u, i) => (
                      <TouchableOpacity
                        key={u.id}
                        onPress={() => { setSelected(u); setQuery(u.display_name ?? u.code); setSuggestions([]); setError(''); }}
                        style={[s.suggestion, i < suggestions.length - 1 && s.suggBorder]}
                        activeOpacity={0.7}
                      >
                        <View style={s.suggAvatar}>
                          <Text style={s.suggLetter}>{(u.display_name ?? '?')[0].toUpperCase()}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.suggName}>{u.display_name ?? 'Без имени'}</Text>
                          <Text style={s.suggCode}>ID: {u.code}</Text>
                        </View>
                        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                          <Path d="M9 6l6 6-6 6" stroke={C.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                        </Svg>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!searching && query.trim().length >= 3 && suggestions.length === 0 && !selected && (
                  <Text style={s.notFound}>Пользователь не найден. Проверьте ID.</Text>
                )}

                {error ? <Text style={s.error}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleAddByCode}
                  disabled={!selected || addingMember}
                  style={[s.addBtn, (!selected || addingMember) && s.addBtnDisabled]}
                  activeOpacity={0.85}
                >
                  {addingMember
                    ? <ActivityIndicator color={selected ? '#fff' : C.accent} />
                    : <Text style={[s.addBtnText, !selected && s.addBtnTextDisabled]}>
                        {selected ? `Добавить ${selected.display_name ?? 'участника'}` : 'Добавить участника'}
                      </Text>
                  }
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
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,17,20,0.56)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: C.line, alignSelf: 'center', marginTop: 12 },
  inner: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontFamily: Fonts.brand700, fontSize: 22, color: C.ink, letterSpacing: -0.8 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },

  // Табы
  tabs: { flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 3, marginBottom: 18,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: C.accent },
  tabText: { fontFamily: Fonts.body600, fontSize: 13.5, color: C.sub },
  tabTextActive: { color: '#fff' },

  // Контакты
  contactsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: C.accentSoft, borderRadius: 14, paddingVertical: 14, marginBottom: 16,
  },
  contactsBtnText: { fontFamily: Fonts.body600, fontSize: 15, color: C.accent },

  // Разделитель
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: C.hairline },
  dividerText: { fontFamily: Fonts.body400, fontSize: 12, color: C.faint },

  // Инпут
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 2, borderColor: 'transparent', marginBottom: 10,
  },
  inputWrapSelected: { borderColor: C.accent },
  inputIcon: { paddingLeft: 14, paddingRight: 8 },
  selAvatar: { width: 26, height: 26, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  selLetter: { fontFamily: Fonts.brand700, fontSize: 11, color: '#fff' },
  input: { flex: 1, fontFamily: Fonts.body400, fontSize: 15, color: C.ink, paddingVertical: 14, paddingHorizontal: 14 },
  clearBtn: { padding: 12 },
  hint: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.faint, marginBottom: 14, marginTop: 2, lineHeight: 18 },
  notFound: { fontFamily: Fonts.body400, fontSize: 13, color: C.faint, marginTop: 4, marginBottom: 4 },
  error: { fontFamily: Fonts.body400, fontSize: 13, color: C.neg, marginTop: 6 },

  // Dropdown
  dropdown: {
    backgroundColor: C.surface, borderRadius: 14, marginTop: 2, marginBottom: 8, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  suggAvatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggLetter: { fontFamily: Fonts.brand700, fontSize: 14, color: C.accent },
  suggName: { fontFamily: Fonts.body600, fontSize: 14, color: C.ink },
  suggCode: { fontFamily: Fonts.body400, fontSize: 11.5, color: C.faint, marginTop: 1 },

  // Кнопка добавить
  addBtn: {
    marginTop: 16, backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  addBtnDisabled: { backgroundColor: C.accentSoft, shadowOpacity: 0, elevation: 0 },
  addBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  addBtnTextDisabled: { color: C.accent },
});
