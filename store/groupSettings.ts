import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GroupSettingsData {
  notifications: boolean;
  muteUntil: string | null; // ISO date or null
}

const DEFAULT: GroupSettingsData = { notifications: true, muteUntil: null };
const KEY = 'qwit_group_settings';

interface GroupSettingsState {
  settings: Record<string, GroupSettingsData>;
  loaded: boolean;
  load: () => Promise<void>;
  get: (groupId: string) => GroupSettingsData;
  update: (groupId: string, patch: Partial<GroupSettingsData>) => void;
}

export const useGroupSettingsStore = create<GroupSettingsState>((set, get) => ({
  settings: {},
  loaded: false,
  load: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    set({ settings: raw ? JSON.parse(raw) : {}, loaded: true });
  },
  get: (groupId) => get().settings[groupId] ?? DEFAULT,
  update: (groupId, patch) => {
    const next = { ...get().settings, [groupId]: { ...(get().settings[groupId] ?? DEFAULT), ...patch } };
    set({ settings: next });
    AsyncStorage.setItem(KEY, JSON.stringify(next));
  },
}));
