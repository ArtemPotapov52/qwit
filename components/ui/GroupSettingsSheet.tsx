import { useEffect, useRef, useMemo } from 'react';
import {
  View, Text, Switch, TouchableOpacity, Animated, Modal,
  StyleSheet, Pressable, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { useColors, ThemeColors } from '@/constants/colors';
import { Fonts } from '@/constants/fonts';
import { useGroupSettingsStore } from '@/store/groupSettings';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  onLeft: () => void;   // navigate away after leave/delete
}

export function GroupSettingsSheet({ open, onClose, groupId, groupName, isAdmin, onLeft }: Props) {
  const C = useColors();
  const s = useMemo(() => makeStyles(C), [C]);
  const slideAnim = useRef(new Animated.Value(360)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const { get, update, load, loaded } = useGroupSettingsStore();
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (!loaded) load();
  }, []);

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 360, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayAnim, { toValue: 0, duration: 230, useNativeDriver: true }),
      ]).start();
    }
  }, [open]);

  const settings = get(groupId);
  const uid = useAuthStore.getState().user?.id;

  const handleLeave = () => {
    Alert.alert(
      'Покинуть группу?',
      `Вы выйдете из «${groupName}». Ваши расходы сохранятся.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Покинуть',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            const { error } = await supabase
              .from('group_members')
              .delete()
              .eq('group_id', groupId)
              .eq('user_id', uid!);
            setLeaving(false);
            if (error) {
              Alert.alert('Ошибка', error.message);
              return;
            }
            const userId = useAuthStore.getState().user?.id;
            qc.invalidateQueries({ queryKey: ['groups', userId] });
            onLeft();
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Удалить группу?',
      `«${groupName}» будет удалена вместе со всеми расходами. Это действие необратимо.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            const { error } = await supabase
              .from('groups')
              .delete()
              .eq('id', groupId);
            setDeleting(false);
            if (error) {
              Alert.alert('Ошибка', error.message);
              return;
            }
            const userId = useAuthStore.getState().user?.id;
            qc.invalidateQueries({ queryKey: ['groups', userId] });
            onLeft();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={[s.overlay, { opacity: overlayAnim }]}>
          <Pressable style={StyleSheet.absoluteFill as object} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.handle} />
          <View style={s.inner}>
            <View style={s.header}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>настройки группы</Text>
                <Text style={s.subtitle} numberOfLines={1}>{groupName}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} activeOpacity={0.7}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                  <Path d="M18 6 6 18M6 6l12 12" stroke={C.sub} strokeWidth={2.5} strokeLinecap="round"/>
                </Svg>
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              {/* Notifications */}
              <View style={s.row}>
                <View style={[s.rowIcon, { backgroundColor: '#EEF1FE' }]}>
                  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 3a6 6 0 0 0-6 6v3l-1.5 3h15L18 12V9a6 6 0 0 0-6-6zM9.5 18a2.5 2.5 0 0 0 5 0" stroke="#2F5BEA" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                  </Svg>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>Уведомления</Text>
                  <Text style={s.rowSub}>Новые расходы, переводы и участники</Text>
                </View>
                <Switch
                  value={settings.notifications}
                  onValueChange={v => update(groupId, { notifications: v })}
                  trackColor={{ true: C.accent, false: C.line }}
                  thumbColor="#fff"
                />
              </View>

              <View style={s.divider} />

              {/* Leave group */}
              <TouchableOpacity style={s.row} onPress={handleLeave} disabled={leaving} activeOpacity={0.7}>
                <View style={[s.rowIcon, { backgroundColor: '#FEF0F0' }]}>
                  {leaving
                    ? <ActivityIndicator color={C.neg} size="small" />
                    : <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke={C.neg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                      </Svg>
                  }
                </View>
                <Text style={[s.rowLabel, { color: C.neg }]}>Покинуть группу</Text>
              </TouchableOpacity>

              {/* Delete group — only for admin */}
              {isAdmin && (
                <>
                  <View style={s.divider} />
                  <TouchableOpacity style={s.row} onPress={handleDelete} disabled={deleting} activeOpacity={0.7}>
                    <View style={[s.rowIcon, { backgroundColor: '#FEF0F0' }]}>
                      {deleting
                        ? <ActivityIndicator color={C.neg} size="small" />
                        : <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                            <Path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke={C.neg} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/>
                            <Path d="M10 11v6M14 11v6" stroke={C.neg} strokeWidth={1.8} strokeLinecap="round"/>
                          </Svg>
                      }
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.rowLabel, { color: C.neg }]}>Удалить группу</Text>
                      <Text style={s.rowSub}>Удалит все расходы и участников</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}
            </View>

            <Text style={s.footer}>Настройки сохраняются только на этом устройстве</Text>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (C: ThemeColors) => StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'transparent' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(16,17,20,0.48)' },
  sheet: { backgroundColor: C.page, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  handle: { width: 38, height: 4, borderRadius: 999, backgroundColor: C.line, alignSelf: 'center', marginTop: 12 },
  inner: { padding: 20, paddingBottom: 44 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontFamily: Fonts.brand700, fontSize: 22, color: C.ink, letterSpacing: -0.8 },
  subtitle: { fontFamily: Fonts.body400, fontSize: 13, color: C.sub, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 999, backgroundColor: C.surface,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    marginLeft: 12,
  },
  card: {
    backgroundColor: C.surface, borderRadius: 18, overflow: 'hidden',
    shadowColor: '#101114', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowLabel: { fontFamily: Fonts.body500, fontSize: 14, color: C.ink },
  rowSub: { fontFamily: Fonts.body400, fontSize: 12, color: C.sub, marginTop: 1 },
  divider: { height: 1, backgroundColor: C.hairline, marginLeft: 60 },
  footer: { fontFamily: Fonts.body400, fontSize: 11.5, color: C.faint, textAlign: 'center', marginTop: 16 },
});
