import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { fmt } from '@/lib/format';
import { useAddExpense } from '@/hooks/useAddExpense';
import { GroupMember } from '@/hooks/useGroupDetail';
import { useAuthStore } from '@/store/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  groupId: string;
  members: GroupMember[];
}

export function AddExpenseSheet({ open, onClose, onCreated, groupId, members }: Props) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidById, setPaidById] = useState<string>(user?.id ?? '');
  const [error, setError] = useState('');
  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { mutate: addExpense, isPending } = useAddExpense();

  useEffect(() => {
    if (open) {
      setPaidById(user?.id ?? members[0]?.user_id ?? '');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        if (!open) { setTitle(''); setAmountStr(''); setError(''); }
      });
    }
  }, [open]);

  const amount = parseFloat(amountStr.replace(',', '.'));
  const canCreate = title.trim().length >= 2 && !isNaN(amount) && amount > 0;

  const memberIds = members.map(m => m.user_id);
  const share = canCreate ? Math.round((amount / memberIds.length) * 100) / 100 : 0;

  const handleCreate = () => {
    if (!canCreate || isPending) return;
    setError('');
    addExpense(
      { groupId, title: title.trim(), amount, paidById, memberIds },
      {
        onSuccess: () => onCreated(),
        onError: (e: unknown) => {
          const msg = e instanceof Error ? e.message : 'Ошибка добавления расхода';
          setError(msg);
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
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={s.inner}>
              <View style={s.header}>
                <Text style={s.title}>новый расход</Text>
                <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M18 6 6 18M6 6l12 12" stroke={Colors.sub} strokeWidth={2.5} strokeLinecap="round"/>
                  </Svg>
                </TouchableOpacity>
              </View>

              <Text style={s.label}>название</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="напр., Ужин в ресторане"
                  placeholderTextColor={Colors.faint}
                  autoFocus
                />
              </View>

              <Text style={s.label}>сумма</Text>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  value={amountStr}
                  onChangeText={setAmountStr}
                  placeholder="0"
                  placeholderTextColor={Colors.faint}
                  keyboardType="decimal-pad"
                />
                <Text style={s.currency}>₽</Text>
              </View>

              {canCreate && (
                <Text style={s.splitHint}>
                  Делится поровну: {fmt(share, false)} на каждого из {memberIds.length}
                </Text>
              )}

              <Text style={s.label}>кто заплатил</Text>
              <View style={s.memberPicker}>
                {members.map(m => {
                  const name = m.display_name ?? 'Участник';
                  const isSelected = m.user_id === paidById;
                  const isYou = m.user_id === user?.id;
                  return (
                    <TouchableOpacity
                      key={m.user_id}
                      onPress={() => setPaidById(m.user_id)}
                      style={[s.memberChip, isSelected && s.memberChipActive]}
                      activeOpacity={0.7}
                    >
                      <View style={[s.chipAvatar, isSelected && s.chipAvatarActive]}>
                        <Text style={[s.chipLetter, isSelected && s.chipLetterActive]}>
                          {(isYou ? 'Я' : name)[0].toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[s.chipName, isSelected && s.chipNameActive]}>
                        {isYou ? 'Я' : name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <TouchableOpacity
                onPress={handleCreate}
                style={[s.createBtn, !canCreate && s.createBtnDisabled]}
                activeOpacity={0.85}
              >
                {isPending
                  ? <ActivityIndicator color={canCreate ? '#fff' : Colors.accent} />
                  : <Text style={[s.createBtnText, !canCreate && s.createBtnTextDisabled]}>Добавить расход</Text>
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
  sheet: { backgroundColor: Colors.page, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '92%' },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: Colors.line, alignSelf: 'center', marginTop: 12 },
  inner: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  title: { fontFamily: Fonts.brand700, fontSize: 22, color: Colors.ink, letterSpacing: -0.8 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  label: {
    fontFamily: Fonts.brand600, fontSize: 12, color: Colors.sub,
    textTransform: 'lowercase', letterSpacing: -0.2, marginBottom: 10,
  },
  inputWrap: {
    backgroundColor: Colors.surface, borderRadius: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 20,
  },
  input: { flex: 1, fontFamily: Fonts.body400, fontSize: 15, color: Colors.ink, paddingVertical: 14 },
  currency: { fontFamily: Fonts.body600, fontSize: 16, color: Colors.sub },
  splitHint: {
    fontFamily: Fonts.body400, fontSize: 12.5, color: Colors.sub,
    marginTop: -12, marginBottom: 20, marginLeft: 2,
  },
  memberPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: Colors.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  memberChipActive: { backgroundColor: Colors.accentSoft },
  chipAvatar: {
    width: 22, height: 22, borderRadius: 999, backgroundColor: Colors.accentSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  chipAvatarActive: { backgroundColor: Colors.accent },
  chipLetter: { fontFamily: Fonts.brand700, fontSize: 10, color: Colors.accent },
  chipLetterActive: { color: '#fff' },
  chipName: { fontFamily: Fonts.body500, fontSize: 13, color: Colors.ink },
  chipNameActive: { color: Colors.accent, fontFamily: Fonts.body600 },
  error: { fontFamily: Fonts.body400, fontSize: 13, color: Colors.neg, marginBottom: 10 },
  createBtn: {
    backgroundColor: Colors.accent, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  createBtnDisabled: { backgroundColor: Colors.accentSoft, shadowOpacity: 0, elevation: 0 },
  createBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  createBtnTextDisabled: { color: Colors.accent },
});
