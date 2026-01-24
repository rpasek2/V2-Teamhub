import { create } from 'zustand';
import { supabase } from '../services/supabase';

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
  clearCounts: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadMessages: 0,
  unreadGroups: 0,
  upcomingEvents: 0,
  hasMoreNotifications: false,
  loading: false,

  fetchNotificationCounts: async (hubId: string, userId: string) => {
    set({ loading: true });
    try {
      // Fetch unread messages count using channel_members table
      const { data: memberChannels } = await supabase
        .from('channel_members')
        .select('channel_id, last_read_at, channels!inner(hub_id)')
        .eq('user_id', userId)
        .eq('channels.hub_id', hubId);

      let unreadMessages = 0;
      if (memberChannels && memberChannels.length > 0) {
        // Count unread messages for each channel the user is a member of
        for (const membership of memberChannels) {
          const lastRead = membership.last_read_at || '1970-01-01';
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', membership.channel_id)
            .gt('created_at', lastRead)
            .neq('user_id', userId); // Don't count own messages

          unreadMessages += count || 0;
        }
      }

      // Fetch unread groups/posts count using join
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('group_id, last_viewed_at, groups!inner(hub_id)')
        .eq('user_id', userId)
        .eq('groups.hub_id', hubId);

      let unreadGroups = 0;
      if (groupMemberships) {
        for (const membership of groupMemberships) {
          const lastViewed = membership.last_viewed_at || '1970-01-01';
          const { count } = await supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', membership.group_id)
            .gt('created_at', lastViewed);

          unreadGroups += count || 0;
        }
      }

      // Check for upcoming events today
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      const { count: upcomingEvents } = await supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('hub_id', hubId)
        .gte('start_time', todayStart.toISOString())
        .lt('start_time', todayEnd.toISOString());

      // Check if there are any other notifications (for "More" tab)
      // This could be expanded to include other notification types
      const hasMoreNotifications = false; // For now, no extra notifications

      set({
        unreadMessages,
        unreadGroups,
        upcomingEvents: upcomingEvents || 0,
        hasMoreNotifications,
        loading: false,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
      set({ loading: false });
    }
  },

  clearCounts: () => {
    set({
      unreadMessages: 0,
      unreadGroups: 0,
      upcomingEvents: 0,
      hasMoreNotifications: false,
    });
  },
}));
