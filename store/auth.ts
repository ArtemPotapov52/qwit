import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  guestMode: boolean;
  setSession: (session: Session | null) => void;
  enterGuestMode: () => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  loading: true,
  guestMode: false,
  setSession: (session) => set({ session, user: session?.user ?? null, loading: false }),
  enterGuestMode: () => set({ guestMode: true, loading: false }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, guestMode: false });
  },
}));
