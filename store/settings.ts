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
  loaded: boolean;
  setFontScale: (scale: number) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  fontScale: 1.1,
  loaded: false,
  setFontScale: async (scale) => {
    set({ fontScale: scale });
    await AsyncStorage.setItem(STORAGE_KEY, String(scale));
  },
  loadSettings: async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    set({ fontScale: saved ? parseFloat(saved) : 1.1, loaded: true });
  },
}));

export function fs(size: number, scale: number): number {
  return Math.round(size * scale);
}
