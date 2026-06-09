import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Onest_400Regular,
  Onest_500Medium,
  Onest_600SemiBold,
  Onest_700Bold,
  Onest_800ExtraBold,
} from '@expo-google-fonts/onest';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Hermes workaround: never let Error.prototype.stack getter be invoked
const origConsoleError = console.error;
console.error = (...args: any[]) => {
  origConsoleError(...args.map(a =>
    a instanceof Error ? { message: a.message, name: a.name } : a
  ));
};
if (typeof ErrorUtils !== 'undefined') {
  const origHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((e: any, isFatal?: boolean) => {
    origHandler(e instanceof Error ? { message: e.message } : e, isFatal);
  });
}

SplashScreen.preventAutoHideAsync();
console.log('[qwit] _layout.tsx loaded');

// Глобальный перехватчик — покажет ТОЧНУЮ причину краша
const prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.log('[qwit] GLOBAL ERROR isFatal=' + isFatal);
  console.log('[qwit] error type:', typeof error);
  console.log('[qwit] error keys:', error ? Object.keys(error) : 'null');
  console.log('[qwit] error message:', error?.message);
  console.log('[qwit] error stack:', error?.stack);
  console.log('[qwit] error JSON:', JSON.stringify(error));
  prevHandler(error, isFatal);
});

function AuthGuard() {
  const { session, guestMode, loading, setSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    const authed = !!session || guestMode;
    if (!authed && !inAuth) router.replace('/(auth)' as any);
    if (authed && inAuth) router.replace('/(tabs)/groups' as any);
  }, [session, guestMode, loading]);

  return null;
}

export default function RootLayout() {
  console.log('[qwit] RootLayout render');
  const { loadSettings } = useSettingsStore();
  const queryClientRef = useRef(new QueryClient());
  usePushNotifications();

  useEffect(() => { loadSettings(); }, []);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Onest_400Regular,
    Onest_500Medium,
    Onest_600SemiBold,
    Onest_700Bold,
    Onest_800ExtraBold,
  });

  const darkMode = useSettingsStore(s => s.darkMode);
  const bg = darkMode ? '#0E0F13' : '#FAFAF8';

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  console.log('[qwit] fonts loaded, rendering Stack');
  return (
    <QueryClientProvider client={queryClientRef.current}>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <AuthGuard />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="invite" />
      </Stack>
    </QueryClientProvider>
  );
}
