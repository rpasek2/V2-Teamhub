import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import {
  Contact,
  ClipboardList,
  CheckSquare,
  Trophy,
  BarChart,
  Target,
  Clock,
  ShoppingBag,
  Heart,
  Users,
  FileText,
  GraduationCap,
  Settings,
  User,
  LogOut,
  ChevronRight,
  Bell,
  Moon,
  Palette,
  Building2,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { useAuthStore } from '../../src/stores/authStore';
import { useHubStore } from '../../src/stores/hubStore';
import { isTabEnabled } from '../../src/lib/permissions';
import { supabase } from '../../src/services/supabase';
import { CustomizeTabsModal } from '../../src/components/settings';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  route?: string;
  badge?: number;
  requiresPermission?: string;
  color?: string;
}

const FEATURE_ITEMS: MenuItem[] = [
  {
    id: 'roster',
    label: 'Roster',
    icon: Contact,
    route: '/roster',
    requiresPermission: 'roster',
    color: colors.brand[600],
  },
  {
    id: 'assignments',
    label: 'Assignments',
    icon: ClipboardList,
    route: '/assignments',
    requiresPermission: 'assignments',
    color: colors.purple[600],
  },
  {
    id: 'attendance',
    label: 'Attendance',
    icon: CheckSquare,
    route: '/attendance',
    requiresPermission: 'attendance',
    color: colors.emerald[600],
  },
  {
    id: 'competitions',
    label: 'Competitions',
    icon: Trophy,
    route: '/competitions',
    requiresPermission: 'competitions',
    color: colors.amber[600],
  },
  {
    id: 'scores',
    label: 'Scores',
    icon: BarChart,
    route: '/scores',
    requiresPermission: 'scores',
    color: colors.blue[600],
  },
  {
    id: 'skills',
    label: 'Skills',
    icon: Target,
    route: '/skills',
    requiresPermission: 'skills',
    color: colors.rose[600],
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Clock,
    route: '/schedule',
    requiresPermission: 'schedule',
    color: colors.indigo[600],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    route: '/marketplace',
    requiresPermission: 'marketplace',
    color: colors.orange[600],
  },
  {
    id: 'mentorship',
    label: 'Big/Little',
    icon: Heart,
    route: '/mentorship',
    requiresPermission: 'mentorship',
    color: colors.pink[600],
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: Users,
    route: '/staff',
    requiresPermission: 'staff',
    color: colors.slate[600],
  },
  {
    id: 'resources',
    label: 'Resources',
    icon: FileText,
    route: '/resources',
    requiresPermission: 'resources',
    color: colors.cyan[600],
  },
  {
    id: 'private-lessons',
    label: 'Private Lessons',
    icon: GraduationCap,
    route: '/private-lessons',
    requiresPermission: 'privateLessons',
    color: colors.violet[600],
  },
];

function MenuSection({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function MenuItem({
  item,
  onPress,
}: {
  item: MenuItem;
  onPress: () => void;
}) {
  const Icon = item.icon;

  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
        <Icon size={20} color={item.color || theme.light.primary} />
      </View>
      <Text style={styles.menuLabel}>{item.label}</Text>
      <View style={styles.menuRight}>
        {item.badge && item.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
        <ChevronRight size={20} color={colors.slate[400]} />
      </View>
    </TouchableOpacity>
  );
}

function SettingToggle({
  icon: Icon,
  label,
  value,
  onValueChange,
  iconColor,
}: {
  icon: React.ComponentType<{ size: number; color: string }>;
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  iconColor?: string;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={[styles.menuIcon, { backgroundColor: `${iconColor || colors.slate[600]}15` }]}>
        <Icon size={20} color={iconColor || colors.slate[600]} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.slate[200], true: colors.brand[400] }}
        thumbColor={value ? colors.brand[600] : colors.slate[50]}
      />
    </View>
  );
}

export default function MoreScreen() {
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const currentHub = useHubStore((state) => state.currentHub);
  const currentMember = useHubStore((state) => state.currentMember);
  const clearHub = useHubStore((state) => state.clearHub);
  const hasPermission = useHubStore((state) => state.hasPermission);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [userProfile, setUserProfile] = useState<{ full_name: string | null; avatar_url: string | null } | null>(null);
  const [showCustomizeTabs, setShowCustomizeTabs] = useState(false);

  const currentRole = currentMember?.role;

  // Fetch user profile for name and avatar
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        setUserProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  const handleMenuPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            clearHub();
            await signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleSwitchHub = () => {
    clearHub();
    router.replace('/hub-selection');
  };

  // Map item IDs to hub feature tab IDs
  const itemToTabId: Record<string, string> = {
    'private-lessons': 'private_lessons',
  };

  // Filter items based on hub permissions AND enabled tabs
  const enabledTabsList = currentHub?.settings?.enabledTabs;
  const visibleItems = FEATURE_ITEMS.filter(item => {
    if (!item.requiresPermission) return true;
    if (!hasPermission(item.requiresPermission)) return false;
    // Check if the feature tab is enabled
    const tabId = itemToTabId[item.id] || item.id;
    return isTabEnabled(tabId, enabledTabsList);
  });

  const displayName = userProfile?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Profile Card */}
      <TouchableOpacity
        style={styles.profileCard}
        activeOpacity={0.7}
        onPress={() => router.push('/settings')}
      >
        {userProfile?.avatar_url ? (
          <Image source={{ uri: userProfile.avatar_url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <User size={32} color={colors.white} />
          </View>
        )}
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileRole}>
            {currentRole ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1) : 'Member'} • {currentHub?.name || 'No Hub'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>
        <ChevronRight size={20} color={colors.slate[400]} />
      </TouchableOpacity>

      {/* Features Section */}
      <MenuSection title="Features">
        {visibleItems.map(item => (
          <MenuItem
            key={item.id}
            item={item}
            onPress={() => handleMenuPress(item)}
          />
        ))}
      </MenuSection>

      {/* Quick Settings */}
      <MenuSection title="Quick Settings">
        <SettingToggle
          icon={Bell}
          label="Push Notifications"
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          iconColor={colors.brand[600]}
        />
        <SettingToggle
          icon={Moon}
          label="Dark Mode"
          value={darkMode}
          onValueChange={setDarkMode}
          iconColor={colors.indigo[600]}
        />
      </MenuSection>

      {/* Settings & Account */}
      <MenuSection title="Account">
        <MenuItem
          item={{
            id: 'customize-tabs',
            label: 'Customize Bottom Bar',
            icon: Palette,
            color: colors.purple[600],
          }}
          onPress={() => setShowCustomizeTabs(true)}
        />
        <MenuItem
          item={{
            id: 'settings',
            label: 'User Settings',
            icon: Settings,
            color: colors.slate[600],
          }}
          onPress={() => router.push('/settings')}
        />
        <TouchableOpacity style={styles.menuItem} onPress={handleSwitchHub} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: colors.blue[50] }]}>
            <Building2 size={20} color={colors.blue[600]} />
          </View>
          <Text style={styles.menuLabel}>Switch Hub</Text>
          <View style={styles.menuRight}>
            <Text style={styles.currentHubText}>{currentHub?.name || 'None'}</Text>
            <ChevronRight size={20} color={colors.slate[400]} />
          </View>
        </TouchableOpacity>
      </MenuSection>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
        <LogOut size={20} color={colors.error[600]} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version Info */}
      <Text style={styles.versionText}>TeamHub Mobile v1.0.0</Text>

      {/* Customize Tabs Modal */}
      <CustomizeTabsModal
        isOpen={showCustomizeTabs}
        onClose={() => setShowCustomizeTabs(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  profileRole: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.slate[900],
    marginLeft: 12,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  currentHubText: {
    fontSize: 14,
    color: colors.slate[500],
    marginRight: 4,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.error[50],
    borderRadius: 12,
    padding: 16,
    gap: 8,
    marginTop: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error[600],
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 24,
  },
});
