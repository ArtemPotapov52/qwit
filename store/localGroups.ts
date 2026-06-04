import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CatKey } from '@/constants/colors';

export interface LocalExpense {
  id: string;
  title: string;
  amount: number;
  paid_by_name: string;
  date: string;
}

export interface LocalGroup {
  id: string;
  cat: CatKey;
  name: string;
  sub: string;
  last: string;
  amount: number;
  expenses: LocalExpense[];
}

interface LocalGroupsState {
  groups: LocalGroup[];
  loaded: boolean;
  load: () => Promise<void>;
  addGroup: (cat: CatKey, name: string) => LocalGroup;
  addExpense: (groupId: string, title: string, amount: number, paidByName: string) => void;
  clear: () => void;
}

const KEY = 'qwit_local_groups_v2';

function save(groups: LocalGroup[]) {
  AsyncStorage.setItem(KEY, JSON.stringify(groups));
}

export const useLocalGroupsStore = create<LocalGroupsState>((set, get) => ({
  groups: [],
  loaded: false,
  load: async () => {
    const raw = await AsyncStorage.getItem(KEY);
    set({ groups: raw ? JSON.parse(raw) : [], loaded: true });
  },
  addGroup: (cat, name) => {
    const group: LocalGroup = {
      id: `local-${Date.now()}`,
      cat,
      name,
      sub: '1 участник',
      last: 'Группа создана',
      amount: 0,
      expenses: [],
    };
    const groups = [...get().groups, group];
    set({ groups });
    save(groups);
    return group;
  },
  addExpense: (groupId, title, amount, paidByName) => {
    const expense: LocalExpense = {
      id: `exp-${Date.now()}`,
      title,
      amount,
      paid_by_name: paidByName,
      date: new Date().toISOString().split('T')[0],
    };
    const groups = get().groups.map(g =>
      g.id === groupId
        ? { ...g, expenses: [expense, ...g.expenses], last: `Добавлено «${title}»` }
        : g,
    );
    set({ groups });
    save(groups);
  },
  clear: () => {
    set({ groups: [], loaded: false });
    AsyncStorage.removeItem(KEY);
  },
}));
