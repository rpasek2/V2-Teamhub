import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { type User, type Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    subscriptionTier: string;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [subscriptionTier, setSubscriptionTier] = useState('free');

    const fetchSubscriptionTier = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', userId)
            .single();
        if (data?.subscription_tier) {
            setSubscriptionTier(data.subscription_tier);
        }
    }, []);

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchSubscriptionTier(session.user.id);
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchSubscriptionTier(session.user.id);
            } else {
                setSubscriptionTier('free');
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [fetchSubscriptionTier]);

    // Memoize signOut function
    const signOut = useCallback(async () => {
        await supabase.auth.signOut({ scope: 'local' });
    }, []);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        user,
        session,
        loading,
        subscriptionTier,
        signOut
    }), [user, session, loading, subscriptionTier, signOut]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
