import { create } from 'zustand';
import { supabase } from '../services/supabase';

export type NotificationType =
    | 'message'
    | 'post'
    | 'event'
    | 'competition'
    | 'score'
    | 'skill'
    | 'assignment'
    | 'marketplace_item'
    | 'resource'
    | 'staff_task'
    | 'staff_time_off'
    | 'private_lesson';

export interface ActivityNotification {
    id: string;
    user_id: string;
    hub_id: string;
    type: NotificationType;
    title: string;
    body: string | null;
    actor_id: string | null;
    reference_id: string | null;
    reference_type: string | null;
    is_read: boolean;
    created_at: string;
    actor_profile?: { full_name: string; avatar_url: string | null } | null;
}

export interface UserNotificationPreferences {
    id: string;
    user_id: string;
    hub_id: string;
    messages_enabled: boolean;
    groups_enabled: boolean;
    calendar_enabled: boolean;
    competitions_enabled: boolean;
    scores_enabled: boolean;
    skills_enabled: boolean;
    assignments_enabled: boolean;
    marketplace_enabled: boolean;
    resources_enabled: boolean;
    staff_tasks_enabled: boolean;
    created_at: string;
    updated_at: string;
}

interface ActivityFeedState {
    notifications: ActivityNotification[];
    unreadCount: number;
    preferences: UserNotificationPreferences | null;
    loading: boolean;
    loadingMore: boolean;
    hasMore: boolean;

    fetchNotifications: (hubId: string, userId: string, reset?: boolean) => Promise<void>;
    fetchUnreadCount: (hubId: string, userId: string) => Promise<void>;
    fetchPreferences: (hubId: string, userId: string) => Promise<void>;
    updatePreferences: (hubId: string, userId: string, prefs: Partial<UserNotificationPreferences>) => Promise<void>;
    markAsRead: (notificationId: string, userId: string) => Promise<void>;
    markAllAsRead: (hubId: string, userId: string) => Promise<void>;
    clearFeed: () => void;
}

const PAGE_SIZE = 20;

export const useActivityFeedStore = create<ActivityFeedState>((set, get) => ({
    notifications: [],
    unreadCount: 0,
    preferences: null,
    loading: false,
    loadingMore: false,
    hasMore: true,

    fetchNotifications: async (hubId, userId, reset = false) => {
        const state = get();
        if (reset) {
            set({ loading: true });
        } else {
            set({ loadingMore: true });
        }

        const offset = reset ? 0 : state.notifications.length;

        try {
            // Build query with preference filtering
            const prefs = state.preferences;
            const allTypes = ['message', 'post', 'event', 'competition', 'score', 'skill', 'assignment', 'marketplace_item', 'resource', 'staff_task'];
            const enabledTypes = allTypes.filter(t => {
                if (!prefs) return true;
                const prefMap: Record<string, keyof UserNotificationPreferences> = {
                    message: 'messages_enabled', post: 'groups_enabled', event: 'calendar_enabled',
                    competition: 'competitions_enabled', score: 'scores_enabled', skill: 'skills_enabled',
                    assignment: 'assignments_enabled', marketplace_item: 'marketplace_enabled', resource: 'resources_enabled',
                    staff_task: 'staff_tasks_enabled',
                };
                return prefs[prefMap[t]] !== false;
            });

            let query = supabase
                .from('notifications')
                .select('*, actor_profile:profiles!notifications_actor_id_fkey(full_name, avatar_url)')
                .eq('user_id', userId)
                .eq('hub_id', hubId)
                .order('created_at', { ascending: false })
                .range(offset, offset + PAGE_SIZE - 1);

            if (enabledTypes.length < allTypes.length && enabledTypes.length > 0) {
                query = query.in('type', enabledTypes);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            const items = (data || []).map((n: Record<string, unknown>) => ({
                ...n,
                actor_profile: Array.isArray(n.actor_profile) ? n.actor_profile[0] : n.actor_profile,
            })) as ActivityNotification[];

            if (reset) {
                set({ notifications: items, hasMore: items.length === PAGE_SIZE });
            } else {
                set({ notifications: [...state.notifications, ...items], hasMore: items.length === PAGE_SIZE });
            }
        } catch (err) {
            console.error('Error in fetchNotifications:', err);
        } finally {
            set({ loading: false, loadingMore: false });
        }
    },

    fetchUnreadCount: async (hubId, userId) => {
        try {
            const { data, error } = await supabase.rpc('get_unread_notification_count', {
                p_user_id: userId,
                p_hub_id: hubId,
            });

            if (error) {
                console.error('Error fetching unread count:', error);
                return;
            }

            set({ unreadCount: data || 0 });
        } catch (err) {
            console.error('Error in fetchUnreadCount:', err);
        }
    },

    fetchPreferences: async (hubId, userId) => {
        try {
            const { data, error } = await supabase
                .from('user_notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .eq('hub_id', hubId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching preferences:', error);
                return;
            }

            set({ preferences: data });
        } catch (err) {
            console.error('Error in fetchPreferences:', err);
        }
    },

    updatePreferences: async (hubId, userId, prefs) => {
        const now = new Date().toISOString();
        const state = get();

        // Optimistic update
        set({
            preferences: state.preferences
                ? { ...state.preferences, ...prefs, updated_at: now }
                : null,
        });

        try {
            const { data, error } = await supabase
                .from('user_notification_preferences')
                .upsert({
                    user_id: userId,
                    hub_id: hubId,
                    ...prefs,
                    updated_at: now,
                }, { onConflict: 'user_id,hub_id' })
                .select()
                .single();

            if (error) {
                console.error('Error updating preferences:', error);
                get().fetchPreferences(hubId, userId);
                return;
            }

            set({ preferences: data });
        } catch (err) {
            console.error('Error in updatePreferences:', err);
        }
    },

    markAsRead: async (notificationId, userId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) {
                console.error('Error marking notification read:', error);
                return;
            }

            set(state => ({
                notifications: state.notifications.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                ),
                unreadCount: Math.max(0, state.unreadCount - 1),
            }));
        } catch (err) {
            console.error('Error in markAsRead:', err);
        }
    },

    markAllAsRead: async (hubId, userId) => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('hub_id', hubId)
                .eq('is_read', false);

            if (error) {
                console.error('Error marking all read:', error);
                return;
            }

            set(state => ({
                notifications: state.notifications.map(n => ({ ...n, is_read: true })),
                unreadCount: 0,
            }));
        } catch (err) {
            console.error('Error in markAllAsRead:', err);
        }
    },

    clearFeed: () => {
        set({ notifications: [], unreadCount: 0, preferences: null, hasMore: true });
    },
}));
