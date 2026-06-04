import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from './CatIcon';
import { useCreateGroup } from '@/hooks/useCreateGroup';
import { searchUsersByPartial, FoundUser } from '@/hooks/useAddMember';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PLACEHOLDERS: Record<CatKey, string> = {
  home: 'напр., Квартира · Чистые пруды',
  plane: 'напр., Поездка в Сочи',
  bowl: 'напр., Обеды на работе',
  cart: 'напр., Продукты на неделю',
  car: 'напр., Поездка на машине',
  gift: 'напр., День рождения Маши',
};

export function NewGroupSheet({ open, onClose, onCreated }: Props) {
  const [cat, setCat] = useState<CatKey>('home');
  const [groupName, setGroupName] = useState('');
  const [createError, setCreateError] = useState('');

  // member search
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<FoundUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<FoundUser[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { mutate: createGroup, isPending } = useCreateGroup();

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        if (!open) {
          setCat('home'); setGroupName(''); setCreateError('');
          setQuery(''); setSuggestions([]); setSelectedMembers([]);
        }
      });
    }
  }, [open]);

  // debounce search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (query.trim().length < 3) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsersByPartial(query.trim());
        // exclude already selected
        const selectedIds = new Set(selectedMembers.map(m => m.id));
        setSuggestions(results.filter(r => !selectedIds.has(r.id)));
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, selectedMembers]);

  const handleSelect = (u: FoundUser) => {
    setSelectedMembers(prev => [...prev, u]);
    setQuery('');
    setSuggestions([]);
  };

  const handleRemoveMember = (id: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== id));
  };

  const canCreate = groupName.trim().length >= 2;
  const cats = (Object.entries(CAT_META) as [CatKey, typeof CAT_META[CatKey]][]);

  const handleCreate = () => {
    if (!canCreate || isPending) return;
    Keyboard.dismiss();
    setCreateError('');
    createGroup(
      { cat, name: groupName.trim() },
      {
        onSuccess: async (group: any) => {
          // add selected members to the new group
          if (selectedMembers.length > 0 && group?.id) {
            const { user } = useAuthStore.getState();
            if (user?.id) {
              await Promise.allSettled(
                selectedMembers.map(m =>
                  supabase.from('group_members').insert({
                    group_id: group.id,
                    user_id: m.id,
                    role: 'member',
                  })
                )
              );
            }
          }
          onCreated();
        },
        onError: (e: any) => setCreateError(e?.message ?? 'Ошибка создания группы'),
      }
    );
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill as any} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.inner}>
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>новая группа</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.sub} strokeWidth={2.5} strokeLinecap="round"/>
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={s.sectionLabel}>категория</Text>
              <View style={s.catGrid}>
                {cats.map(([id, meta]) => (
                  <TouchableOpacity
                    key={id} onPress={() => setCat(id)}
                    style={[s.catBtn, cat === id ? { backgroundColor: meta.bg, borderWidth: 2, borderColor: meta.ink } : null]}
                    activeOpacity={0.7}
                  >
                    <CatIcon cat={id} color={meta.ink} size={19} />
                    <Text style={[s.catLabel, cat === id ? { color: meta.ink, fontFamily: Fonts.body600 } : null]}>{meta.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Name */}
              <Text style={s.sectionLabel}>название</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder={PLACEHOLDERS[cat]}
                  placeholderTextColor={Colors.faint}
                />
              </View>

              {/* Members search */}
              <View style={s.membersHeader}>
                <Text style={s.sectionLabel}>участники</Text>
                <Text style={s.optional}>необязательно</Text>
              </View>

              {/* Selected chips */}
              {selectedMembers.length > 0 && (
                <View style={s.chips}>
                  {selectedMembers.map(m => (
                    <View key={m.id} style={s.chip}>
                      <View style={s.chipAvatar}>
                        <Text style={s.chipLetter}>{(m.display_name ?? '?')[0].toUpperCase()}</Text>
                      </View>
                      <Text style={s.chipName} numberOfLines={1}>{m.display_name ?? m.code}</Text>
                      <TouchableOpacity onPress={() => handleRemoveMember(m.id)} hitSlop={8}>
                        <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
                          <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.faint} strokeWidth={2.5} strokeLinecap="round"/>
                        </Svg>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Search input */}
              <View style={s.searchWrap}>
                <View style={s.searchIcon}>
                  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                    <Circle cx="11" cy="11" r="7" stroke={Colors.faint} strokeWidth={1.8}/>
                    <Path d="M16.5 16.5l4 4" stroke={Colors.faint} strokeWidth={1.8} strokeLinecap="round"/>
                  </Svg>
                </View>
                <TextInput
                  style={s.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Найти по ID участника"
                  placeholderTextColor={Colors.faint}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {searching && <ActivityIndicator color={Colors.accent} size="small" style={{ marginRight: 12 }} />}
              </View>

              {/* Suggestions */}
              {suggestions.length > 0 && (
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

              {!searching && query.trim().length >= 3 && suggestions.length === 0 && (
                <Text style={s.notFound}>Пользователь не найден. Проверьте ID.</Text>
              )}

              {createError ? <Text style={s.errorText}>{createError}</Text> : null}

              <TouchableOpacity
                onPress={handleCreate}
                style={[s.createBtn, (!canCreate || isPending) && s.createBtnDisabled]}
                activeOpacity={0.85}
              >
                {isPending
                  ? <ActivityIndicator color={Colors.accent} />
                  : <Text style={[s.createBtnText, !canCreate && s.createBtnTextDisabled]}>
                      {selectedMembers.length > 0
                        ? `Создать группу · ${selectedMembers.length + 1} участника`
                        : 'Создать группу'}
                    </Text>
                }
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,17,20,0.48)' },
  sheet: { backgroundColor: Colors.page, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '90%' },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: Colors.line, alignSelf: 'center', marginTop: 12 },
  inner: { padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  sheetTitle: { fontFamily: Fonts.brand700, fontSize: 22, color: Colors.ink, letterSpacing: -0.8 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  sectionLabel: { fontFamily: Fonts.brand600, fontSize: 12, color: Colors.sub, letterSpacing: -0.2, marginBottom: 10, textTransform: 'lowercase' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 9,
    backgroundColor: Colors.surface, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    width: '31%',
  },
  catLabel: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.ink },
  inputWrap: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 22,
  },
  input: { fontFamily: Fonts.body400, fontSize: 15, color: Colors.ink, paddingVertical: 14 },
  membersHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 },
  optional: { fontFamily: Fonts.body400, fontSize: 11.5, color: Colors.faint },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accentSoft, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10,
  },
  chipAvatar: {
    width: 20, height: 20, borderRadius: 999, backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  chipLetter: { fontFamily: Fonts.brand700, fontSize: 9, color: '#fff' },
  chipName: { fontFamily: Fonts.body500, fontSize: 12.5, color: Colors.accent, maxWidth: 80 },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: 14, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 6,
  },
  searchIcon: { paddingLeft: 14, paddingRight: 8 },
  searchInput: { flex: 1, fontFamily: Fonts.body400, fontSize: 14, color: Colors.ink, paddingVertical: 13 },

  dropdown: {
    backgroundColor: Colors.surface, borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 6,
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  suggBorder: { borderBottomWidth: 1, borderBottomColor: Colors.hairline },
  suggAvatar: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  suggLetter: { fontFamily: Fonts.brand700, fontSize: 13, color: Colors.accent },
  suggName: { fontFamily: Fonts.body600, fontSize: 13.5, color: Colors.ink },
  suggCode: { fontFamily: Fonts.body400, fontSize: 11, color: Colors.faint, marginTop: 1 },
  notFound: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.faint, marginBottom: 8 },

  createBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 16,
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  createBtnDisabled: { backgroundColor: Colors.accentSoft, shadowOpacity: 0, elevation: 0 },
  createBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  createBtnTextDisabled: { color: Colors.accent },
  errorText: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.neg, marginBottom: 10 },
});
