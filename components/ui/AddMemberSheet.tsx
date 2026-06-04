import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, Keyboard,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { searchUsersByPartial, useAddMember, FoundUser } from '@/hooks/useAddMember';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
}

export function AddMemberSheet({ open, onClose, groupId }: Props) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<FoundUser[]>([]);
  const [selected, setSelected] = useState<FoundUser | null>(null);
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(460)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutate: addMember, isPending } = useAddMember(groupId);

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
        if (!open) { setQuery(''); setSuggestions([]); setSelected(null); setError(''); }
      });
    }
  }, [open]);

  // Дебаунс-поиск при вводе
  useEffect(() => {
    if (selected) return; // уже выбрали — не ищем
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsersByPartial(query.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  const handleSelect = (u: FoundUser) => {
    setSelected(u);
    setQuery(u.display_name ?? u.code);
    setSuggestions([]);
    setError('');
  };

  const handleAdd = () => {
    if (!selected || isPending) return;
    Keyboard.dismiss();
    setError('');
    addMember(selected.id, {
      onSuccess: () => onClose(),
      onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка'),
    });
  };

  const handleChangeText = (v: string) => {
    setQuery(v);
    if (selected) setSelected(null); // сбрасываем выбор при изменении
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

            <View style={s.header}>
              <Text style={s.title}>добавить участника</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.sub} strokeWidth={2.5} strokeLinecap="round"/>
                </Svg>
              </TouchableOpacity>
            </View>

            <Text style={s.hint}>Введите ID участника — он виден в его профиле</Text>

            {/* Input */}
            <View style={[s.inputWrap, selected && s.inputWrapSelected]}>
              <View style={s.inputIcon}>
                {selected ? (
                  <View style={s.selAvatar}>
                    <Text style={s.selLetter}>{(selected.display_name ?? '?')[0].toUpperCase()}</Text>
                  </View>
                ) : (
                  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                    <Circle cx="11" cy="11" r="7" stroke={Colors.faint} strokeWidth={1.8}/>
                    <Path d="M16.5 16.5l4 4" stroke={Colors.faint} strokeWidth={1.8} strokeLinecap="round"/>
                  </Svg>
                )}
              </View>
              <TextInput
                style={s.input}
                value={query}
                onChangeText={handleChangeText}
                placeholder="напр. 000000000002"
                placeholderTextColor={Colors.faint}
                autoCapitalize="none"
                autoFocus
                autoCorrect={false}
              />
              {searching && <ActivityIndicator color={Colors.accent} size="small" style={{ marginRight: 12 }} />}
              {selected && (
                <TouchableOpacity onPress={() => { setSelected(null); setQuery(''); }} style={s.clearBtn}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.faint} strokeWidth={2.5} strokeLinecap="round"/>
                  </Svg>
                </TouchableOpacity>
              )}
            </View>

            {/* Suggestions dropdown */}
            {suggestions.length > 0 && !selected && (
              <View style={s.dropdown}>
                {suggestions.map((u, i) => (
                  <TouchableOpacity
                    key={u.id}
                    onPress={() => handleSelect(u)}
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
                      <Path d="M9 6l6 6-6 6" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
                    </Svg>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Not found */}
            {!searching && query.trim().length >= 3 && suggestions.length === 0 && !selected && (
              <Text style={s.notFound}>Пользователь не найден. Проверьте ID.</Text>
            )}

            {error ? <Text style={s.error}>{error}</Text> : null}

            {/* Add button */}
            <TouchableOpacity
              onPress={handleAdd}
              disabled={!selected || isPending}
              style={[s.addBtn, (!selected || isPending) && s.addBtnDisabled]}
              activeOpacity={0.85}
            >
              {isPending
                ? <ActivityIndicator color={selected ? '#fff' : Colors.accent} />
                : <Text style={[s.addBtnText, !selected && s.addBtnTextDisabled]}>
                    {selected ? `Добавить ${selected.display_name ?? 'участника'}` : 'Добавить участника'}
                  </Text>
              }
            </TouchableOpacity>

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontFamily: Fonts.brand700, fontSize: 22, color: C.ink, letterSpacing: -0.8 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  hint: { fontFamily: Fonts.body400, fontSize: 13, color: C.sub, marginBottom: 16, lineHeight: 19 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 16, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    borderWidth: 2, borderColor: 'transparent',
  },
  inputWrapSelected: { borderColor: C.accent },
  inputIcon: { paddingLeft: 14, paddingRight: 8 },
  selAvatar: { width: 26, height: 26, borderRadius: 999, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  selLetter: { fontFamily: Fonts.brand700, fontSize: 11, color: '#fff' },
  input: { flex: 1, fontFamily: Fonts.body400, fontSize: 15, color: C.ink, paddingVertical: 14 },
  clearBtn: { padding: 12 },
  dropdown: {
    backgroundColor: C.surface, borderRadius: 16, marginTop: 6, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: C.hairline },
  suggAvatar: { width: 36, height: 36, borderRadius: 999, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  suggLetter: { fontFamily: Fonts.brand700, fontSize: 14, color: C.accent },
  suggName: { fontFamily: Fonts.body600, fontSize: 14, color: C.ink },
  suggCode: { fontFamily: Fonts.body400, fontSize: 11.5, color: C.faint, marginTop: 1 },
  notFound: { fontFamily: Fonts.body400, fontSize: 13, color: C.faint, marginTop: 8, marginBottom: 4 },
  error: { fontFamily: Fonts.body400, fontSize: 13, color: C.neg, marginTop: 8 },
  addBtn: {
    marginTop: 18, backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  addBtnDisabled: { backgroundColor: C.accentSoft, shadowOpacity: 0, elevation: 0 },
  addBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  addBtnTextDisabled: { color: C.accent },
});
