import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const FONT_SCALES = [
  { key: 'S', label: 'А', value: 0.9 },
  { key: 'M', label: 'А', value: 1.0 },
  { key: 'L', label: 'А', value: 1.15 },
  { key: 'XL', label: 'А', value: 1.3 },
] as const;

const STORAGE_KEY = 'qwit_font_scale';

interface SettingsState {
  fontScale: number;
  notifications: boolean;
  darkMode: boolean;
  loaded: boolean;
  setFontScale: (scale: number) => void;
  setNotifications: (v: boolean) => void;
  setDarkMode: (v: boolean) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontScale: 1.1,
  notifications: true,
  darkMode: false,
  loaded: false,
  setFontScale: async (scale) => {
    set({ fontScale: scale });
    await AsyncStorage.setItem(STORAGE_KEY, String(scale));
  },
  setNotifications: async (v) => {
    set({ notifications: v });
    await AsyncStorage.setItem('qwit_notifications', String(v));
  },
  setDarkMode: async (v) => {
    set({ darkMode: v });
    await AsyncStorage.setItem('qwit_dark_mode', String(v));
  },
  loadSettings: async () => {
    const [scale, notif, dark] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem('qwit_notifications'),
      AsyncStorage.getItem('qwit_dark_mode'),
    ]);
    set({
      fontScale: scale ? parseFloat(scale) : 1.1,
      notifications: notif !== null ? notif === 'true' : true,
      darkMode: dark === 'true',
      loaded: true,
    });
  },
}));

export function fs(size: number, scale: number): number {
  return Math.round(size * scale);
}
