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
      // Calculate today's date range for events query
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);

      // Fetch all data in parallel
      const [memberChannelsResult, groupMembershipsResult, eventsResult] = await Promise.all([
        // Get channels the user is a member of
        supabase
          .from('channel_members')
          .select('channel_id, last_read_at, channels!inner(hub_id)')
          .eq('user_id', userId)
          .eq('channels.hub_id', hubId),

        // Get groups the user is a member of
        supabase
          .from('group_members')
          .select('group_id, last_viewed_at, groups!inner(hub_id)')
          .eq('user_id', userId)
          .eq('groups.hub_id', hubId),

        // Get today's events count
        supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('hub_id', hubId)
          .gte('start_time', todayStart.toISOString())
          .lt('start_time', todayEnd.toISOString()),
      ]);

      const memberChannels = memberChannelsResult.data || [];
      const groupMemberships = groupMembershipsResult.data || [];
      const upcomingEvents = eventsResult.count || 0;

      // Count unread messages - batch all channel queries in parallel
      let unreadMessages = 0;
      if (memberChannels.length > 0) {
        const messageCountPromises = memberChannels.map((membership) => {
          const lastRead = membership.last_read_at || '1970-01-01';
          return supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', membership.channel_id)
            .gt('created_at', lastRead)
            .neq('user_id', userId);
        });

        const messageCounts = await Promise.all(messageCountPromises);
        unreadMessages = messageCounts.reduce((total, result) => total + (result.count || 0), 0);
      }

      // Count unread posts - batch all group queries in parallel
      let unreadGroups = 0;
      if (groupMemberships.length > 0) {
        const postCountPromises = groupMemberships.map((membership) => {
          const lastViewed = membership.last_viewed_at || '1970-01-01';
          return supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('group_id', membership.group_id)
            .gt('created_at', lastViewed);
        });

        const postCounts = await Promise.all(postCountPromises);
        unreadGroups = postCounts.reduce((total, result) => total + (result.count || 0), 0);
      }

      set({
        unreadMessages,
        unreadGroups,
        upcomingEvents,
        hasMoreNotifications: false,
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
