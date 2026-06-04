import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'qwit_group_order';

interface GroupOrderState {
  order: string[];       // group IDs in display order
  pinned: string[];      // pinned group IDs
  loaded: boolean;
  load: () => Promise<void>;
  setOrder: (ids: string[]) => void;
  togglePin: (id: string) => void;
  applyToGroups: <T extends { id: string }>(groups: T[]) => T[];
}

export const useGroupOrderStore = create<GroupOrderState>((set, get) => ({
  order: [],
  pinned: [],
  loaded: false,

  load: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({ order: parsed.order ?? [], pinned: parsed.pinned ?? [], loaded: true });
        return;
      } catch {}
    }
    set({ loaded: true });
  },

  setOrder: (ids) => {
    set({ order: ids });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ order: ids, pinned: get().pinned }));
  },

  togglePin: (id) => {
    const pinned = get().pinned.includes(id)
      ? get().pinned.filter(p => p !== id)
      : [id, ...get().pinned];
    set({ pinned });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ order: get().order, pinned }));
  },

  applyToGroups: <T extends { id: string }>(groups: T[]): T[] => {
    const { order, pinned } = get();
    // Sort: pinned first (preserving their relative order), then rest by saved order
    const sorted = [...groups].sort((a, b) => {
      const aPinned = pinned.includes(a.id);
      const bPinned = pinned.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return sorted;
  },
}));
