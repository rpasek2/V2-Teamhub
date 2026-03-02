import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'teamhub-dark-mode';

const ThemeContext = createContext<{ isDark: boolean; toggleDark: () => void } | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem(STORAGE_KEY) === 'true';
    });

    // Apply class to <html> whenever isDark changes
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    // Sync from DB on login
    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('dark_mode')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data) {
                    const dbValue = data.dark_mode === true;
                    setIsDark(dbValue);
                    localStorage.setItem(STORAGE_KEY, String(dbValue));
                }
            });
    }, [user]);

    const toggleDark = useCallback(() => {
        setIsDark(prev => {
            const next = !prev;
            localStorage.setItem(STORAGE_KEY, String(next));
            // Fire-and-forget DB update
            if (user) {
                supabase
                    .from('profiles')
                    .update({ dark_mode: next })
                    .eq('id', user.id)
                    .then(() => {});
            }
            return next;
        });
    }, [user]);

    const value = useMemo(() => ({ isDark, toggleDark }), [isDark, toggleDark]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
