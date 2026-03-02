import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

interface ThemeState {
  isDark: boolean;
  syncFromDB: (userId: string) => Promise<void>;
  toggleDark: (userId?: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      isDark: false,

      syncFromDB: async (userId) => {
        const { data } = await supabase
          .from('profiles')
          .select('dark_mode')
          .eq('id', userId)
          .single();
        if (data?.dark_mode !== undefined) {
          set({ isDark: data.dark_mode === true });
        }
      },

      toggleDark: (userId) => {
        const next = !get().isDark;
        set({ isDark: next });
        // Fire-and-forget DB sync (matches web ThemeContext)
        if (userId) {
          supabase
            .from('profiles')
            .update({ dark_mode: next })
            .eq('id', userId)
            .then(() => {});
        }
      },
    }),
    {
      name: 'teamhub-dark-mode',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ isDark: state.isDark }),
    }
  )
);
