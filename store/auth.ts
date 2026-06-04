import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const DEV_USER = {
  id: '10000000-0000-0000-0000-000000000001',
  email: 'dev@local',
  app_metadata: {},
  user_metadata: { display_name: 'Dev' },
  aud: 'authenticated',
  created_at: '',
} as User;

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  guestMode: boolean;
  isPremium: boolean;
  displayName: string | null;
  setSession: (session: Session | null) => void;
  setDisplayName: (name: string) => void;
  enterGuestMode: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  guestMode: false,
  isPremium: false,
  displayName: null,
  setSession: (session) => set((state) => ({
    session,
    user: session?.user ?? (state.guestMode ? state.user : null),
    displayName: session?.user?.user_metadata?.display_name ?? state.displayName,
    loading: false,
  })),
  setDisplayName: (name) => set({ displayName: name }),
  enterGuestMode: () => set({ guestMode: true, user: DEV_USER, displayName: 'Dev', loading: false }),
  signOut: async () => {
    try { await supabase.auth.signOut(); } catch {}
    set({ session: null, user: null, guestMode: false, displayName: null, loading: false });
  },
}));
