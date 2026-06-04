import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Colors, CAT_META, CatKey } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { CatIcon } from './CatIcon';
import { useCreateGroup } from '@/hooks/useCreateGroup';

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
  const [members, setMembers] = useState(['']);
  const [createError, setCreateError] = useState('');
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
        if (!open) { setCat('home'); setGroupName(''); setMembers(['']); }
      });
    }
  }, [open]);

  const canCreate = groupName.trim().length >= 2;
  const cats = (Object.entries(CAT_META) as [CatKey, typeof CAT_META[CatKey]][]);

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

              <View style={s.membersHeader}>
                <Text style={s.sectionLabel}>участники</Text>
                <Text style={s.optional}>необязательно</Text>
              </View>
              {members.map((m, i) => (
                <View key={i} style={[s.memberRow, { marginBottom: 8 }]}>
                  <View style={s.memberAvatar}>
                    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
                      <Circle cx="12" cy="8" r="4" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round"/>
                      <Path d="M5 19c.4-3.2 3-5 7-5s6.6 1.8 7 5" stroke={Colors.accent} strokeWidth={2} strokeLinecap="round"/>
                    </Svg>
                  </View>
                  <TextInput
                    style={s.memberInput}
                    value={m}
                    onChangeText={v => { const n = [...members]; n[i] = v; setMembers(n); }}
                    placeholder={`Участник ${i + 1}`}
                    placeholderTextColor={Colors.faint}
                  />
                  {members.length > 1 && (
                    <TouchableOpacity onPress={() => setMembers(members.filter((_, j) => j !== i))}>
                      <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                        <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.faint} strokeWidth={2.5} strokeLinecap="round"/>
                      </Svg>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={() => setMembers([...members, ''])} style={s.addMemberBtn} activeOpacity={0.7}>
                <View style={s.addMemberCircle}>
                  <Svg width={12} height={12} viewBox="0 0 20 20">
                    <Path d="M10 4v12M4 10h12" stroke={Colors.accent} strokeWidth={2.2} strokeLinecap="round"/>
                  </Svg>
                </View>
                <Text style={s.addMemberText}>Добавить участника</Text>
              </TouchableOpacity>

              {createError ? <Text style={s.errorText}>{createError}</Text> : null}
              <TouchableOpacity
                onPress={() => {
                  if (!canCreate || isPending) return;
                  setCreateError('');
                  createGroup(
                    { cat, name: groupName.trim() },
                    {
                      onSuccess: () => { onCreated(); },
                      onError: (e: any) => setCreateError(e?.message ?? 'Ошибка создания группы'),
                    }
                  );
                }}
                style={[s.createBtn, (!canCreate || isPending) && s.createBtnDisabled]}
                activeOpacity={0.85}
              >
                {isPending
                  ? <ActivityIndicator color={Colors.accent} />
                  : <Text style={[s.createBtnText, !canCreate && s.createBtnTextDisabled]}>Создать группу</Text>
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
  sheet: {
    backgroundColor: Colors.page, borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '90%',
  },
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
  membersHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 0 },
  optional: { fontFamily: Fonts.body400, fontSize: 11.5, color: Colors.faint },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 14,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  memberAvatar: {
    width: 26, height: 26, borderRadius: 999, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  memberInput: { flex: 1, fontFamily: Fonts.body400, fontSize: 14, color: Colors.ink, paddingVertical: 13 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6, paddingHorizontal: 2, marginBottom: 22 },
  addMemberCircle: {
    width: 26, height: 26, borderRadius: 999, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  addMemberText: { fontFamily: Fonts.body600, fontSize: 13.5, color: Colors.accent },
  createBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  createBtnDisabled: { backgroundColor: Colors.accentSoft, shadowOpacity: 0, elevation: 0 },
  createBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  createBtnTextDisabled: { color: Colors.accent },
  errorText: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.neg, marginBottom: 10 },
});
