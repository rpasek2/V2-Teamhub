import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useHub } from './HubContext';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { NotificationCounts, NotificationFeature, ActivityNotification, UserNotificationPreferences } from '../types';

interface NotificationContextType {
    counts: NotificationCounts;
    loading: boolean;
    markAsViewed: (feature: NotificationFeature) => Promise<void>;
    refreshCounts: () => Promise<void>;
    // Activity feed
    unreadFeedCount: number;
    preferences: UserNotificationPreferences | null;
    fetchActivityFeed: (limit?: number, offset?: number) => Promise<ActivityNotification[]>;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    updatePreferences: (prefs: Partial<UserNotificationPreferences>) => Promise<void>;
    refreshPreferences: () => Promise<void>;
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
    staff_tasks: false,
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
    const [unreadFeedCount, setUnreadFeedCount] = useState(0);
    const [preferences, setPreferences] = useState<UserNotificationPreferences | null>(null);
    const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
    const preferencesRef = useRef<UserNotificationPreferences | null>(null);

    // Keep ref in sync for use in callbacks
    useEffect(() => {
        preferencesRef.current = preferences;
    }, [preferences]);

    // Fetch notification preferences
    const fetchPreferences = useCallback(async () => {
        if (!hub?.id || !user?.id) {
            setPreferences(null);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('user_notification_preferences')
                .select('*')
                .eq('user_id', user.id)
                .eq('hub_id', hub.id)
                .maybeSingle();

            if (error) {
                console.error('Error fetching preferences:', error);
                return;
            }

            setPreferences(data);
        } catch (err) {
            console.error('Error in fetchPreferences:', err);
        }
    }, [hub?.id, user?.id]);

    // Update notification preferences
    const updatePreferences = useCallback(async (prefs: Partial<UserNotificationPreferences>) => {
        if (!hub?.id || !user?.id) return;

        const now = new Date().toISOString();
        const upsertData = {
            user_id: user.id,
            hub_id: hub.id,
            ...prefs,
            updated_at: now,
        };

        // Optimistic update
        setPreferences(prev => prev ? { ...prev, ...prefs, updated_at: now } : null);

        try {
            const { data, error } = await supabase
                .from('user_notification_preferences')
                .upsert(upsertData, { onConflict: 'user_id,hub_id' })
                .select()
                .single();

            if (error) {
                console.error('Error updating preferences:', error);
                fetchPreferences();
                return;
            }

            setPreferences(data);
        } catch (err) {
            console.error('Error in updatePreferences:', err);
            fetchPreferences();
        }
    }, [hub?.id, user?.id, fetchPreferences]);

    // Fetch unread feed count
    const fetchUnreadFeedCount = useCallback(async () => {
        if (!hub?.id || !user?.id) {
            setUnreadFeedCount(0);
            return;
        }

        try {
            const { data, error } = await supabase.rpc('get_unread_notification_count', {
                p_user_id: user.id,
                p_hub_id: hub.id,
            });

            if (error) {
                console.error('Error fetching unread count:', error);
                return;
            }

            setUnreadFeedCount(data || 0);
        } catch (err) {
            console.error('Error in fetchUnreadFeedCount:', err);
        }
    }, [hub?.id, user?.id]);

    // Fetch activity feed
    const fetchActivityFeed = useCallback(async (limit = 30, offset = 0): Promise<ActivityNotification[]> => {
        if (!hub?.id || !user?.id) return [];

        try {
            let query = supabase
                .from('notifications')
                .select('*, actor_profile:profiles!notifications_actor_id_fkey(full_name, avatar_url)')
                .eq('user_id', user.id)
                .eq('hub_id', hub.id)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            // Apply preference filtering
            const prefs = preferencesRef.current;
            if (prefs) {
                const disabledTypes: string[] = [];
                if (!prefs.messages_enabled) disabledTypes.push('message');
                if (!prefs.groups_enabled) disabledTypes.push('post');
                if (!prefs.calendar_enabled) disabledTypes.push('event');
                if (!prefs.competitions_enabled) disabledTypes.push('competition');
                if (!prefs.scores_enabled) disabledTypes.push('score');
                if (!prefs.skills_enabled) disabledTypes.push('skill');
                if (!prefs.assignments_enabled) disabledTypes.push('assignment');
                if (!prefs.marketplace_enabled) disabledTypes.push('marketplace_item');
                if (!prefs.resources_enabled) disabledTypes.push('resource');

                if (disabledTypes.length > 0) {
                    // Filter out disabled types - use NOT IN by filtering for enabled types
                    const allTypes = ['message', 'post', 'event', 'competition', 'score', 'skill', 'assignment', 'marketplace_item', 'resource'];
                    const enabledTypes = allTypes.filter(t => !disabledTypes.includes(t));
                    if (enabledTypes.length > 0) {
                        query = query.in('type', enabledTypes);
                    }
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching activity feed:', error);
                return [];
            }

            // Normalize actor_profile from array to single object
            return (data || []).map((n: Record<string, unknown>) => ({
                ...n,
                actor_profile: Array.isArray(n.actor_profile) ? n.actor_profile[0] : n.actor_profile,
            })) as ActivityNotification[];
        } catch (err) {
            console.error('Error in fetchActivityFeed:', err);
            return [];
        }
    }, [hub?.id, user?.id]);

    // Mark single notification as read
    const markNotificationRead = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)
                .eq('user_id', user?.id);

            if (error) {
                console.error('Error marking notification read:', error);
                return;
            }

            setUnreadFeedCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error in markNotificationRead:', err);
        }
    }, [user?.id]);

    // Mark all notifications as read
    const markAllNotificationsRead = useCallback(async () => {
        if (!hub?.id || !user?.id) return;

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('hub_id', hub.id)
                .eq('is_read', false);

            if (error) {
                console.error('Error marking all read:', error);
                return;
            }

            setUnreadFeedCount(0);
        } catch (err) {
            console.error('Error in markAllNotificationsRead:', err);
        }
    }, [hub?.id, user?.id]);

    // Apply preference filters to badge counts
    const applyPreferenceFilters = useCallback((rawCounts: NotificationCounts): NotificationCounts => {
        const prefs = preferencesRef.current;
        if (!prefs) return rawCounts;

        return {
            messages: prefs.messages_enabled ? rawCounts.messages : 0,
            groups: prefs.groups_enabled ? rawCounts.groups : false,
            calendar: prefs.calendar_enabled ? rawCounts.calendar : false,
            competitions: prefs.competitions_enabled ? rawCounts.competitions : false,
            scores: prefs.scores_enabled ? rawCounts.scores : false,
            skills: prefs.skills_enabled ? rawCounts.skills : false,
            assignments: prefs.assignments_enabled ? rawCounts.assignments : false,
            marketplace: prefs.marketplace_enabled ? rawCounts.marketplace : false,
            resources: prefs.resources_enabled ? rawCounts.resources : false,
            staff_tasks: prefs.staff_tasks_enabled ? rawCounts.staff_tasks : false,
        };
    }, []);

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
                const rawCounts: NotificationCounts = {
                    messages: data.messages || 0,
                    groups: data.groups || false,
                    calendar: data.calendar || false,
                    competitions: data.competitions || false,
                    scores: data.scores || false,
                    skills: data.skills || false,
                    assignments: data.assignments || false,
                    marketplace: data.marketplace || false,
                    resources: data.resources || false,
                    staff_tasks: data.staff_tasks || false,
                };
                setCounts(applyPreferenceFilters(rawCounts));
            }
        } catch (err) {
            console.error('Error in fetchCounts:', err);
        } finally {
            setLoading(false);
        }
    }, [hub?.id, user?.id, applyPreferenceFilters]);

    // Mark a feature as viewed (with in-flight deduplication)
    const markAsViewedInFlight = useRef(new Set<string>());

    const markAsViewed = useCallback(async (feature: NotificationFeature) => {
        if (!hub?.id || !user?.id) return;

        // Skip if already in-flight for this feature
        if (markAsViewedInFlight.current.has(feature)) return;
        markAsViewedInFlight.current.add(feature);

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
                // Don't re-fetch on error — optimistic update stays, polling will self-correct
            }
        } catch (err) {
            console.error('Error in markAsViewed:', err);
        } finally {
            markAsViewedInFlight.current.delete(feature);
        }
    }, [hub?.id, user?.id]);

    // Realtime event handlers
    const handleNewMessage = useCallback((payload: { new: { user_id: string } }) => {
        if (payload.new.user_id !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.messages_enabled) return prev;
                return { ...prev, messages: prev.messages + 1 };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleNewPost = useCallback((payload: { new: { user_id: string } }) => {
        if (payload.new.user_id !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.groups_enabled) return prev;
                return { ...prev, groups: true };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleNewEvent = useCallback((payload: { new: { created_by?: string } }) => {
        if (payload.new.created_by !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.calendar_enabled) return prev;
                return { ...prev, calendar: true };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleCompetitionChange = useCallback(() => {
        setCounts(prev => {
            const prefs = preferencesRef.current;
            if (prefs && !prefs.competitions_enabled) return prev;
            return { ...prev, competitions: true };
        });
        setUnreadFeedCount(prev => prev + 1);
    }, []);

    const handleScoreChange = useCallback(() => {
        setCounts(prev => {
            const prefs = preferencesRef.current;
            if (prefs && !prefs.scores_enabled) return prev;
            return { ...prev, scores: true };
        });
        setUnreadFeedCount(prev => prev + 1);
    }, []);

    const handleSkillChange = useCallback(() => {
        setCounts(prev => {
            const prefs = preferencesRef.current;
            if (prefs && !prefs.skills_enabled) return prev;
            return { ...prev, skills: true };
        });
        setUnreadFeedCount(prev => prev + 1);
    }, []);

    const handleNewAssignment = useCallback((payload: { new: { assigned_by?: string } }) => {
        if (payload.new.assigned_by !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.assignments_enabled) return prev;
                return { ...prev, assignments: true };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleNewItem = useCallback((payload: { new: { seller_id?: string } }) => {
        if (payload.new.seller_id !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.marketplace_enabled) return prev;
                return { ...prev, marketplace: true };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleNewResource = useCallback((payload: { new: { uploaded_by?: string } }) => {
        if (payload.new.uploaded_by !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.resources_enabled) return prev;
                return { ...prev, resources: true };
            });
            setUnreadFeedCount(prev => prev + 1);
        }
    }, [user?.id]);

    const handleNewStaffTask = useCallback((payload: { new: { staff_user_id?: string; assigned_by?: string } }) => {
        // Only notify if this task is assigned to the current user and by someone else
        if (payload.new.staff_user_id === user?.id && payload.new.assigned_by !== user?.id) {
            setCounts(prev => {
                const prefs = preferencesRef.current;
                if (prefs && !prefs.staff_tasks_enabled) return prev;
                return { ...prev, staff_tasks: true };
            });
            setUnreadFeedCount(prev => prev + 1);
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
                { event: 'INSERT', schema: 'public', table: 'events', filter: `hub_id=eq.${hub.id}` },
                handleNewEvent
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'competitions', filter: `hub_id=eq.${hub.id}` },
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
                { event: 'INSERT', schema: 'public', table: 'gymnast_assignments', filter: `hub_id=eq.${hub.id}` },
                handleNewAssignment
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'marketplace_items', filter: `hub_id=eq.${hub.id}` },
                handleNewItem
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'hub_resources', filter: `hub_id=eq.${hub.id}` },
                handleNewResource
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'staff_tasks', filter: `hub_id=eq.${hub.id}` },
                handleNewStaffTask
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
        handleNewStaffTask,
    ]);

    // Fetch preferences first, then counts + feed count
    useEffect(() => {
        if (hub?.id && user?.id) {
            fetchPreferences();
        }
    }, [hub?.id, user?.id, fetchPreferences]);

    // Fetch counts and feed count on mount (once hub/user are available)
    useEffect(() => {
        fetchCounts();
        fetchUnreadFeedCount();
    }, [fetchCounts, fetchUnreadFeedCount]);

    // Re-apply preference filters locally when preferences change (no network request)
    useEffect(() => {
        if (preferences) {
            setCounts(prev => applyPreferenceFilters(prev));
        }
    }, [preferences, applyPreferenceFilters]);

    // Visibility-aware polling fallback
    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        const startPolling = () => {
            if (interval) return;
            interval = setInterval(() => {
                fetchCounts();
                fetchUnreadFeedCount();
            }, 30000);
        };

        const stopPolling = () => {
            if (interval) {
                clearInterval(interval);
                interval = null;
            }
        };

        const handleVisibilityChange = () => {
            if (document.hidden) {
                stopPolling();
            } else {
                fetchCounts();
                fetchUnreadFeedCount();
                startPolling();
            }
        };

        if (!document.hidden) {
            startPolling();
        }

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            stopPolling();
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchCounts, fetchUnreadFeedCount]);

    const value = useMemo(() => ({
        counts,
        loading,
        markAsViewed,
        refreshCounts: fetchCounts,
        unreadFeedCount,
        preferences,
        fetchActivityFeed,
        markNotificationRead,
        markAllNotificationsRead,
        updatePreferences,
        refreshPreferences: fetchPreferences,
    }), [counts, loading, markAsViewed, fetchCounts, unreadFeedCount, preferences, fetchActivityFeed, markNotificationRead, markAllNotificationsRead, updatePreferences, fetchPreferences]);

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
}
