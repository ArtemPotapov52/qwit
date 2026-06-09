import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Animated,
  Modal, StyleSheet, ScrollView, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { fmt } from '@/lib/format';
import { useAddExpense } from '@/hooks/useAddExpense';
import { useAddExpenseByItems, validateItems } from '@/hooks/useExpenseItems';
import { GroupMember } from '@/hooks/useGroupDetail';
import { useAuthStore } from '@/store/auth';
import { SplitType, ExpenseItemInput } from '@/types/expense';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  groupId: string;
  members: GroupMember[];
}

function newItem(): ExpenseItemInput {
  return { id: String(Date.now() + Math.random()), title: '', amount: '', memberIds: [] };
}

function MemberChips({
  members, selected, onToggle, currentUserId,
}: {
  members: GroupMember[];
  selected: string[];
  onToggle: (memberId: string) => void;
  currentUserId: string;
}) {
  const C = useColors();
  const s = useMemo(() => chipStyles(C), [C]);
  return (
    <View style={s.row}>
      {members.map(m => {
        const isOn = selected.includes(m.id);
        const isYou = m.user_id === currentUserId;
        const name = m.display_name?.trim() || 'Участник';
        return (
          <TouchableOpacity
            key={m.id}
            onPress={() => onToggle(m.id)}
            style={[s.chip, isOn && s.chipOn]}
            activeOpacity={0.7}
          >
            <View style={[s.av, isOn && s.avOn]}>
              <Text style={[s.ltr, isOn && s.ltrOn]}>{((isYou ? 'Я' : name)[0] ?? '?').toUpperCase()}</Text>
            </View>
            <Text style={[s.name, isOn && s.nameOn]} numberOfLines={1}>
              {isYou ? 'Я' : name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = (C: ThemeColors) => StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: C.surface, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  chipOn: { backgroundColor: C.accentSoft },
  av: { width: 18, height: 18, borderRadius: 999, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avOn: { backgroundColor: C.accent },
  ltr: { fontFamily: Fonts.brand700, fontSize: 9, color: C.accent },
  ltrOn: { color: '#fff' },
  name: { fontFamily: Fonts.body500, fontSize: 12, color: C.ink, maxWidth: 64 },
  nameOn: { color: C.accent, fontFamily: Fonts.body600 },
});

export function AddExpenseSheet({ open, onClose, onCreated, groupId, members }: Props) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  // paidById = group_members.id (не profiles.id)
  const [paidById, setPaidById] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [items, setItems] = useState<ExpenseItemInput[]>([newItem()]);
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(600)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const titleInputRef = useRef<any>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: addExpense, isPending: pendingEqual } = useAddExpense();
  const { mutate: addByItems, isPending: pendingItems } = useAddExpenseByItems();
  const isPending = pendingEqual || pendingItems;

  useEffect(() => {
    if (open) {
      // Ставим по умолчанию текущего пользователя по group_members.id
      const myMember = members.find(m => m.user_id === user?.id);
      setPaidById(myMember?.id ?? members[0]?.id ?? '');
      setSplitType('equal');
      setItems([newItem()]);
      setError('');
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start(() => {
        // Фокусируем ПОСЛЕ завершения анимации — иначе клавиатура конфликтует со слайдом
        focusTimer.current = setTimeout(() => titleInputRef.current?.focus(), 50);
      });
    } else {
      if (focusTimer.current) clearTimeout(focusTimer.current);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start(() => {
        if (!open) { setTitle(''); setAmountStr(''); setError(''); }
      });
    }
  }, [open]);

  // ── Режим «поровну» ──
  const amount = parseFloat(amountStr.replace(',', '.'));
  // memberIds = group_members.id[]
  const memberIds = members.map(m => m.id);
  const share = !isNaN(amount) && amount > 0 ? Math.round((amount / memberIds.length) * 100) / 100 : 0;
  const canCreateEqual = title.trim().length >= 2 && !isNaN(amount) && amount > 0;

  // ── Режим «по позициям» ──
  const itemsTotal = items.reduce((s, i) => {
    const v = parseFloat(i.amount.replace(',', '.'));
    return s + (isNaN(v) ? 0 : v);
  }, 0);
  const canCreateItems = title.trim().length >= 2 && items.length > 0 && itemsTotal > 0;

  const canCreate = splitType === 'equal' ? canCreateEqual : canCreateItems;

  const handleCreate = () => {
    if (!canCreate || isPending) return;
    Keyboard.dismiss();
    setError('');

    if (splitType === 'equal') {
      addExpense(
        { groupId, title: title.trim(), amount, paidById, memberIds },
        {
          onSuccess: () => onCreated(),
          onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка добавления расхода'),
        },
      );
    } else {
      const validationError = validateItems(items, itemsTotal);
      if (validationError) { setError(validationError); return; }
      addByItems(
        { groupId, title: title.trim(), paidById, items },
        {
          onSuccess: () => onCreated(),
          onError: (e: unknown) => setError(e instanceof Error ? e.message : 'Ошибка добавления расхода'),
        },
      );
    }
  };

  const updateItem = (id: string, patch: Partial<ExpenseItemInput>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const toggleItemMember = (itemId: string, memberId: string) => {
    setItems(prev => prev.map(it => {
      if (it.id !== itemId) return it;
      const next = it.memberIds.includes(memberId)
        ? it.memberIds.filter(m => m !== memberId)
        : [...it.memberIds, memberId];
      return { ...it, memberIds: next };
    }));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.length > 1 ? prev.filter(it => it.id !== id) : prev);
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
                    <Path d="M18 6 6 18M6 6l12 12" stroke={C.sub} strokeWidth={2.5} strokeLinecap="round"/>
                  </Svg>
                </TouchableOpacity>
              </View>

              {/* Название */}
              <Text style={s.label}>название</Text>
              <View style={s.inputWrap}>
                <TextInput
                  ref={titleInputRef}
                  style={s.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="напр., Ужин в ресторане"
                  placeholderTextColor={C.faint}
                />
              </View>

              {/* Переключатель способа деления */}
              <Text style={s.label}>способ деления</Text>
              <View style={s.toggle}>
                <TouchableOpacity
                  style={[s.toggleBtn, splitType === 'equal' && s.toggleBtnActive]}
                  onPress={() => setSplitType('equal')}
                  activeOpacity={0.7}
                >
                  <Text style={[s.toggleText, splitType === 'equal' && s.toggleTextActive]}>Поровну</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.toggleBtn, splitType === 'by_items' && s.toggleBtnActive]}
                  onPress={() => setSplitType('by_items')}
                  activeOpacity={0.7}
                >
                  <Text style={[s.toggleText, splitType === 'by_items' && s.toggleTextActive]}>По позициям</Text>
                </TouchableOpacity>
              </View>

              {/* Режим «поровну» */}
              {splitType === 'equal' && (
                <>
                  <Text style={s.label}>сумма</Text>
                  <View style={s.inputWrap}>
                    <TextInput
                      style={s.input}
                      value={amountStr}
                      onChangeText={setAmountStr}
                      placeholder="0"
                      placeholderTextColor={C.faint}
                      keyboardType="decimal-pad"
                    />
                    <Text style={s.currency}>₽</Text>
                  </View>
                  {canCreateEqual && (
                    <Text style={s.splitHint}>
                      Делится поровну: {fmt(share, false)} на каждого из {memberIds.length}
                    </Text>
                  )}
                </>
              )}

              {/* Режим «по позициям» */}
              {splitType === 'by_items' && (
                <>
                  {items.map((item, idx) => (
                    <View key={item.id} style={s.itemCard}>
                      <View style={s.itemHeader}>
                        <Text style={s.itemNum}>Позиция {idx + 1}</Text>
                        {items.length > 1 && (
                          <TouchableOpacity onPress={() => removeItem(item.id)} activeOpacity={0.7}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                              <Path d="M18 6 6 18M6 6l12 12" stroke={C.neg} strokeWidth={2} strokeLinecap="round"/>
                            </Svg>
                          </TouchableOpacity>
                        )}
                      </View>
                      <View style={s.itemRow}>
                        <View style={[s.inputWrap, { flex: 1, marginBottom: 0, marginRight: 8 }]}>
                          <TextInput
                            style={s.input}
                            value={item.title}
                            onChangeText={v => updateItem(item.id, { title: v })}
                            placeholder="Название"
                            placeholderTextColor={C.faint}
                          />
                        </View>
                        <View style={[s.inputWrap, { width: 90, marginBottom: 0 }]}>
                          <TextInput
                            style={[s.input, { paddingRight: 4 }]}
                            value={item.amount}
                            onChangeText={v => updateItem(item.id, { amount: v })}
                            placeholder="0"
                            placeholderTextColor={C.faint}
                            keyboardType="decimal-pad"
                          />
                          <Text style={s.currency}>₽</Text>
                        </View>
                      </View>
                      <Text style={[s.label, { marginTop: 10, marginBottom: 6 }]}>участники</Text>
                      <MemberChips
                        members={members}
                        selected={item.memberIds}
                        onToggle={uid => toggleItemMember(item.id, uid)}
                        currentUserId={user?.id ?? ''}
                      />
                    </View>
                  ))}

                  <TouchableOpacity
                    style={s.addItemBtn}
                    onPress={() => setItems(prev => [...prev, newItem()])}
                    activeOpacity={0.7}
                  >
                    <Svg width={14} height={14} viewBox="0 0 20 20">
                      <Path d="M10 4v12M4 10h12" stroke={C.accent} strokeWidth={2.4} strokeLinecap="round"/>
                    </Svg>
                    <Text style={s.addItemText}>Добавить позицию</Text>
                  </TouchableOpacity>

                  {itemsTotal > 0 && (
                    <Text style={s.splitHint}>Итого: {fmt(itemsTotal, false)}</Text>
                  )}
                </>
              )}

              {/* Кто заплатил */}
              <Text style={s.label}>кто заплатил</Text>
              <View style={s.memberPicker}>
                {members.map(m => {
                  const name = m.display_name?.trim() || 'Участник';
                  const isSelected = m.id === paidById;
                  const isYou = m.user_id === user?.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setPaidById(m.id)}
                      style={[s.memberChip, isSelected && s.memberChipActive]}
                      activeOpacity={0.7}
                    >
                      <View style={[s.chipAvatar, isSelected && s.chipAvatarActive]}>
                        <Text style={[s.chipLetter, isSelected && s.chipLetterActive]}>
                          {((isYou ? 'Я' : name)[0] ?? '?').toUpperCase()}
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
                  ? <ActivityIndicator color={canCreate ? '#fff' : C.accent} />
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

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,17,20,0.56)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '92%' },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: C.line, alignSelf: 'center', marginTop: 12 },
  inner: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  title: { fontFamily: Fonts.brand700, fontSize: 22, color: C.ink, letterSpacing: -0.8 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  label: { fontFamily: Fonts.brand600, fontSize: 12, color: C.sub, textTransform: 'lowercase', letterSpacing: -0.2, marginBottom: 10 },
  inputWrap: {
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 16,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginBottom: 20,
  },
  input: { flex: 1, fontFamily: Fonts.body400, fontSize: 15, color: C.ink, paddingVertical: 14 },
  currency: { fontFamily: Fonts.body600, fontSize: 16, color: C.sub },
  splitHint: { fontFamily: Fonts.body400, fontSize: 12.5, color: C.sub, marginTop: -8, marginBottom: 18, marginLeft: 2 },

  // Переключатель
  toggle: {
    flexDirection: 'row', backgroundColor: C.surface, borderRadius: 12, padding: 3,
    marginBottom: 20,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  toggleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: C.accent },
  toggleText: { fontFamily: Fonts.body600, fontSize: 13.5, color: C.sub },
  toggleTextActive: { color: '#fff' },

  // Позиции
  itemCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 14, marginBottom: 12,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  itemNum: { fontFamily: Fonts.brand600, fontSize: 12, color: C.sub, textTransform: 'lowercase' },
  itemRow: { flexDirection: 'row' },
  addItemBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    borderWidth: 1, borderColor: C.line, marginBottom: 12, justifyContent: 'center',
  },
  addItemText: { fontFamily: Fonts.body500, fontSize: 13.5, color: C.accent },

  memberPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 22 },
  memberChip: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: C.surface, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12,
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  memberChipActive: { backgroundColor: C.accentSoft },
  chipAvatar: { width: 22, height: 22, borderRadius: 999, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  chipAvatarActive: { backgroundColor: C.accent },
  chipLetter: { fontFamily: Fonts.brand700, fontSize: 10, color: C.accent },
  chipLetterActive: { color: '#fff' },
  chipName: { fontFamily: Fonts.body500, fontSize: 13, color: C.ink },
  chipNameActive: { color: C.accent, fontFamily: Fonts.body600 },
  error: { fontFamily: Fonts.body400, fontSize: 13, color: C.neg, marginBottom: 10 },
  createBtn: {
    backgroundColor: C.accent, borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#2F5BEA', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.32, shadowRadius: 30, elevation: 10,
  },
  createBtnDisabled: { backgroundColor: C.accentSoft, shadowOpacity: 0, elevation: 0 },
  createBtnText: { fontFamily: Fonts.body700, fontSize: 16, color: '#fff' },
  createBtnTextDisabled: { color: C.accent },
});
