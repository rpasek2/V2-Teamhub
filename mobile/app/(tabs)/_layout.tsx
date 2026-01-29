import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Home,
  Calendar,
  MessageCircle,
  Users,
  Menu,
  ClipboardList,
  CheckSquare,
  Trophy,
  Target,
  BarChart,
  Contact,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { NotificationBadge } from '../../src/components/ui';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { useTabPreferencesStore, TabId } from '../../src/stores/tabPreferencesStore';

// Map of all available tab icons
const TAB_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  dashboard: Home,
  calendar: Calendar,
  messages: MessageCircle,
  groups: Users,
  more: Menu,
  roster: Contact,
  assignments: ClipboardList,
  attendance: CheckSquare,
  competitions: Trophy,
  scores: BarChart,
  skills: Target,
};

function TabBarIcon({
  name,
  color,
  focused,
  badge,
}: {
  name: string;
  color: string;
  focused: boolean;
  badge?: number | boolean;
}) {
  const Icon = TAB_ICONS[name] || Home;

  return (
    <View style={styles.iconContainer}>
      <Icon size={24} color={color} />
      {badge && (
        <NotificationBadge
          count={typeof badge === 'number' ? badge : undefined}
          showDot={badge === true}
        />
      )}
    </View>
  );
}

export default function TabLayout() {
  const { currentHub } = useHubStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const {
    unreadMessages,
    unreadGroups,
    upcomingEvents,
    hasMoreNotifications,
    fetchNotificationCounts,
  } = useNotificationStore();

  // Get tab preferences
  const { selectedTabs, loading: tabsLoading, initialize: initializeTabPrefs } = useTabPreferencesStore();

  // Initialize tab preferences on mount
  useEffect(() => {
    initializeTabPrefs();
  }, []);

  // Track app state and polling interval
  const appState = useRef(AppState.currentState);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch notification counts when hub or user changes
  useEffect(() => {
    if (!currentHub?.id || !user?.id) return;

    // Initial fetch
    fetchNotificationCounts(currentHub.id, user.id);

    // Start polling (every 60 seconds - reduced from 30s for better performance)
    const startPolling = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        fetchNotificationCounts(currentHub.id, user.id);
      }, 60000);
    };

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    // Handle app state changes - pause polling when app is backgrounded
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - fetch immediately and restart polling
        fetchNotificationCounts(currentHub.id, user.id);
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background - stop polling to save battery
        stopPolling();
      }
      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    startPolling();

    return () => {
      stopPolling();
      subscription.remove();
    };
  }, [currentHub?.id, user?.id]);

  // Helper to get badge for a tab
  const getBadgeForTab = (tabId: TabId): number | boolean | undefined => {
    switch (tabId) {
      case 'calendar':
        return upcomingEvents > 0 ? upcomingEvents : undefined;
      case 'messages':
        return unreadMessages > 0 ? unreadMessages : undefined;
      case 'groups':
        return unreadGroups > 0 ? unreadGroups : undefined;
      default:
        return undefined;
    }
  };

  // Check if a tab should be visible (in the selected 3)
  const isTabVisible = (tabId: TabId): boolean => {
    return selectedTabs.includes(tabId);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.light.primary,
        tabBarInactiveTintColor: colors.slate[400],
        tabBarStyle: {
          ...styles.tabBar,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: true,
        headerStyle: styles.header,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      {/* Fixed: Dashboard (always first) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="dashboard" color={color} focused={focused} />
          ),
        }}
      />

      {/* Dynamic tabs - show/hide based on selection */}
      {/* Calendar */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          href: isTabVisible('calendar') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="calendar"
              color={color}
              focused={focused}
              badge={getBadgeForTab('calendar')}
            />
          ),
        }}
      />

      {/* Messages */}
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          href: isTabVisible('messages') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="messages"
              color={color}
              focused={focused}
              badge={getBadgeForTab('messages')}
            />
          ),
        }}
      />

      {/* Groups */}
      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          href: isTabVisible('groups') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="groups"
              color={color}
              focused={focused}
              badge={getBadgeForTab('groups')}
            />
          ),
        }}
      />

      {/* Roster */}
      <Tabs.Screen
        name="roster"
        options={{
          title: 'Roster',
          href: isTabVisible('roster') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="roster" color={color} focused={focused} />
          ),
        }}
      />

      {/* Assignments */}
      <Tabs.Screen
        name="assignments"
        options={{
          title: 'Assignments',
          href: isTabVisible('assignments') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="assignments" color={color} focused={focused} />
          ),
        }}
      />

      {/* Attendance */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: 'Attendance',
          href: isTabVisible('attendance') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="attendance" color={color} focused={focused} />
          ),
        }}
      />

      {/* Competitions */}
      <Tabs.Screen
        name="competitions"
        options={{
          title: 'Competitions',
          href: isTabVisible('competitions') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="competitions" color={color} focused={focused} />
          ),
        }}
      />

      {/* Scores */}
      <Tabs.Screen
        name="scores"
        options={{
          title: 'Scores',
          href: isTabVisible('scores') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="scores" color={color} focused={focused} />
          ),
        }}
      />

      {/* Skills */}
      <Tabs.Screen
        name="skills"
        options={{
          title: 'Skills',
          href: isTabVisible('skills') ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="skills" color={color} focused={focused} />
          ),
        }}
      />

      {/* Fixed: More (always last) */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="more"
              color={color}
              focused={focused}
              badge={hasMoreNotifications ? true : undefined}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  header: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  iconContainer: {
    position: 'relative',
  },
});
