import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
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
  ShoppingBag,
  BarChart,
  Clock,
  Contact,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { NotificationBadge } from '../../src/components/ui';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';

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
  schedule: Clock,
  marketplace: ShoppingBag,
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

  // Fetch notification counts when hub or user changes
  useEffect(() => {
    if (currentHub?.id && user?.id) {
      fetchNotificationCounts(currentHub.id, user.id);

      // Set up polling interval (every 30 seconds)
      const interval = setInterval(() => {
        fetchNotificationCounts(currentHub.id, user.id);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [currentHub?.id, user?.id]);

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
      {/* Fixed: Dashboard */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon name="dashboard" color={color} focused={focused} />
          ),
        }}
      />

      {/* Customizable slots */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="calendar"
              color={color}
              focused={focused}
              badge={upcomingEvents > 0 ? upcomingEvents : undefined}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="messages"
              color={color}
              focused={focused}
              badge={unreadMessages > 0 ? unreadMessages : undefined}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: 'Groups',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              name="groups"
              color={color}
              focused={focused}
              badge={unreadGroups > 0 ? unreadGroups : undefined}
            />
          ),
        }}
      />

      {/* Fixed: More */}
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
