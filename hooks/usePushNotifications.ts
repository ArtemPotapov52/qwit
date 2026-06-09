import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';

// Как показывать уведомления когда приложение открыто
// (только если push notifications доступны)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch {
  console.log('[qwit] push notifications not available');
}

export function usePushNotifications() {
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user?.id) return;
    registerForPushNotifications(user.id);
  }, [user?.id]);
}

async function registerForPushNotifications(userId: string) {
  if (Platform.OS === 'web') return;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;

    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;

    await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
  } catch (e) {
    console.log('[qwit] push registration skipped:', e);
  }
}

// Получить push-токены участников группы для отправки уведомлений
export async function getMemberPushTokens(userIds: string[]): Promise<Record<string, string>> {
  if (!userIds.length) return {};
  const { data } = await supabase
    .from('profiles')
    .select('id, push_token')
    .in('id', userIds)
    .not('push_token', 'is', null);

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.push_token) map[row.id] = row.push_token;
  }
  return map;
}
