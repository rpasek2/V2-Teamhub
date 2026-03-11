import { create } from 'zustand';
import { supabase } from '../services/supabase';
import { useActivityFeedStore } from './activityFeedStore';

interface NotificationState {
  // Badge counts
  unreadMessages: number;
  unreadGroups: number;
  upcomingEvents: number;
  hasMoreNotifications: boolean;

  // Loading state
  loading: boolean;

  // Actions
  fetchNotificationCounts: (hubId: string, userId: string) => Promise<void>;
  resetDebounce: () => void;
  clearCounts: () => void;
}

let lastFetchTime = 0;

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadMessages: 0,
  unreadGroups: 0,
  upcomingEvents: 0,
  hasMoreNotifications: false,
  loading: false,

  resetDebounce: () => {
    lastFetchTime = 0;
  },

  fetchNotificationCounts: async (hubId: string, userId: string) => {
    // Debounce: skip if fetched within last 5 seconds
    const now = Date.now();
    if (now - lastFetchTime < 5000) return;
    lastFetchTime = now;

    set({ loading: true });
    try {
      const { data, error } = await supabase.rpc('get_mobile_unread_counts', {
        p_user_id: userId,
        p_hub_id: hubId,
      });

      if (error) {
        console.error('Error fetching notification counts:', error);
        set({ loading: false });
        return;
      }

      const counts = data || { unread_messages: 0, unread_groups: 0, upcoming_events: 0 };

      // Apply preference filters
      const prefs = useActivityFeedStore.getState().preferences;
      set({
        unreadMessages: prefs && !prefs.messages_enabled ? 0 : counts.unread_messages,
        unreadGroups: prefs && !prefs.groups_enabled ? 0 : counts.unread_groups,
        upcomingEvents: prefs && !prefs.calendar_enabled ? 0 : counts.upcoming_events,
        hasMoreNotifications: false,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      set({ loading: false });
    }
  },

  clearCounts: () => {
    lastFetchTime = 0;
    set({
      unreadMessages: 0,
      unreadGroups: 0,
      upcomingEvents: 0,
      hasMoreNotifications: false,
    });
  },
}));
