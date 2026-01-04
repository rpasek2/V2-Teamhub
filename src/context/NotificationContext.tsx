import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHub } from './HubContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { NotificationCounts, NotificationFeature } from '../types';

interface NotificationContextType {
    counts: NotificationCounts;
    loading: boolean;
    markAsViewed: (feature: NotificationFeature) => Promise<void>;
    refreshCounts: () => Promise<void>;
}

const defaultCounts: NotificationCounts = {
    messages: 0,
    groups: false,
    calendar: false,
    competitions: false,
    scores: false,
    skills: false,
    assignments: false,
    marketplace: false,
    resources: false,
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
}

// Safe version that returns null instead of throwing
export function useNotificationsSafe() {
    return useContext(NotificationContext);
}

interface NotificationProviderProps {
    children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const { hub } = useHub();
    const { user } = useAuth();
    const [counts, setCounts] = useState<NotificationCounts>(defaultCounts);
    const [loading, setLoading] = useState(true);
    const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    // Fetch notification counts from database
    const fetchCounts = useCallback(async () => {
        if (!hub?.id || !user?.id) {
            setCounts(defaultCounts);
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_notification_counts', {
                p_user_id: user.id,
                p_hub_id: hub.id,
            });

            if (error) {
                console.error('Error fetching notification counts:', error);
                return;
            }

            if (data) {
                setCounts({
                    messages: data.messages || 0,
                    groups: data.groups || false,
                    calendar: data.calendar || false,
                    competitions: data.competitions || false,
                    scores: data.scores || false,
                    skills: data.skills || false,
                    assignments: data.assignments || false,
                    marketplace: data.marketplace || false,
                    resources: data.resources || false,
                });
            }
        } catch (err) {
            console.error('Error in fetchCounts:', err);
        } finally {
            setLoading(false);
        }
    }, [hub?.id, user?.id]);

    // Mark a feature as viewed
    const markAsViewed = useCallback(async (feature: NotificationFeature) => {
        if (!hub?.id || !user?.id) return;

        const columnName = `${feature}_last_viewed_at`;
        const now = new Date().toISOString();

        // Optimistically update local state
        setCounts(prev => ({
            ...prev,
            [feature]: feature === 'messages' ? 0 : false,
        }));

        try {
            // Upsert the notification record
            const { error } = await supabase
                .from('user_hub_notifications')
                .upsert({
                    user_id: user.id,
                    hub_id: hub.id,
                    [columnName]: now,
                    updated_at: now,
                }, {
                    onConflict: 'user_id,hub_id',
                });

            if (error) {
                console.error('Error marking as viewed:', error);
                // Revert optimistic update on error
                fetchCounts();
            }
        } catch (err) {
            console.error('Error in markAsViewed:', err);
            fetchCounts();
        }
    }, [hub?.id, user?.id, fetchCounts]);

    // Realtime event handlers
    const handleNewMessage = useCallback((payload: { new: { user_id: string } }) => {
        if (payload.new.user_id !== user?.id) {
            setCounts(prev => ({
                ...prev,
                messages: prev.messages + 1,
            }));
        }
    }, [user?.id]);

    const handleNewPost = useCallback((payload: { new: { user_id: string } }) => {
        if (payload.new.user_id !== user?.id) {
            setCounts(prev => ({
                ...prev,
                groups: true,
            }));
        }
    }, [user?.id]);

    const handleNewEvent = useCallback((payload: { new: { created_by?: string } }) => {
        if (payload.new.created_by !== user?.id) {
            setCounts(prev => ({
                ...prev,
                calendar: true,
            }));
        }
    }, [user?.id]);

    const handleCompetitionChange = useCallback(() => {
        setCounts(prev => ({
            ...prev,
            competitions: true,
        }));
    }, []);

    const handleScoreChange = useCallback(() => {
        setCounts(prev => ({
            ...prev,
            scores: true,
        }));
    }, []);

    const handleSkillChange = useCallback(() => {
        setCounts(prev => ({
            ...prev,
            skills: true,
        }));
    }, []);

    const handleNewAssignment = useCallback((payload: { new: { assigned_by?: string } }) => {
        if (payload.new.assigned_by !== user?.id) {
            setCounts(prev => ({
                ...prev,
                assignments: true,
            }));
        }
    }, [user?.id]);

    const handleNewItem = useCallback((payload: { new: { seller_id?: string } }) => {
        if (payload.new.seller_id !== user?.id) {
            setCounts(prev => ({
                ...prev,
                marketplace: true,
            }));
        }
    }, [user?.id]);

    const handleNewResource = useCallback((payload: { new: { uploaded_by?: string } }) => {
        if (payload.new.uploaded_by !== user?.id) {
            setCounts(prev => ({
                ...prev,
                resources: true,
            }));
        }
    }, [user?.id]);

    // Set up realtime subscriptions
    useEffect(() => {
        if (!hub?.id || !user?.id) return;

        // Clean up existing subscription
        if (subscriptionRef.current) {
            subscriptionRef.current.unsubscribe();
        }

        // Create new subscription
        const channel = supabase
            .channel(`notifications:${hub.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'messages' },
                handleNewMessage
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                handleNewPost
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'events' },
                handleNewEvent
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'competitions' },
                handleCompetitionChange
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'competition_scores' },
                handleScoreChange
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'gymnast_skills' },
                handleSkillChange
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gymnast_assignments' },
                handleNewAssignment
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'marketplace_items' },
                handleNewItem
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'hub_resources' },
                handleNewResource
            )
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            channel.unsubscribe();
        };
    }, [
        hub?.id,
        user?.id,
        handleNewMessage,
        handleNewPost,
        handleNewEvent,
        handleCompetitionChange,
        handleScoreChange,
        handleSkillChange,
        handleNewAssignment,
        handleNewItem,
        handleNewResource,
    ]);

    // Initial fetch and polling fallback
    useEffect(() => {
        fetchCounts();

        // Poll every 30 seconds as a fallback for realtime
        const interval = setInterval(() => {
            fetchCounts();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchCounts]);

    const value = useMemo(() => ({
        counts,
        loading,
        markAsViewed,
        refreshCounts: fetchCounts,
    }), [counts, loading, markAsViewed, fetchCounts]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
