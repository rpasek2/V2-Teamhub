import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  InteractionManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronRight, Plus, Users, LogOut } from 'lucide-react-native';
import { colors } from '../src/constants/colors';
import { useTheme } from '../src/hooks/useTheme';
import { useAuthStore } from '../src/stores/authStore';
import { useHubStore, Hub } from '../src/stores/hubStore';
import { usePushNotificationStore, navigateToDeepLink } from '../src/stores/pushNotificationStore';
import { Card } from '../src/components/ui';

// Sport type to icon/color mapping
const SPORT_CONFIG: Record<string, { color: string; label: string }> = {
  gymnastics: { color: colors.brand[600], label: 'Gymnastics' },
  dance: { color: '#ec4899', label: 'Dance' },
  cheer: { color: '#f59e0b', label: 'Cheer' },
  swimming: { color: '#3b82f6', label: 'Swimming' },
  martial_arts: { color: '#ef4444', label: 'Martial Arts' },
};

function HubCard({ hub, onPress }: { hub: Hub; onPress: () => void }) {
  const { t } = useTheme();
  const config = SPORT_CONFIG[hub.sport_type] || SPORT_CONFIG.gymnastics;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.hubCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={[styles.hubIcon, { backgroundColor: config.color }]}>
          <Users size={24} color={colors.white} />
        </View>
        <View style={styles.hubInfo}>
          <Text style={[styles.hubName, { color: t.text }]}>{hub.name}</Text>
          <Text style={[styles.hubSport, { color: t.textMuted }]}>{config.label}</Text>
        </View>
        <ChevronRight size={20} color={t.textFaint} />
      </View>
    </TouchableOpacity>
  );
}

export default function HubSelectionScreen() {
  const { t, isDark, colors } = useTheme();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const hubs = useHubStore((state) => state.hubs);
  const hubsLoading = useHubStore((state) => state.hubsLoading);
  const fetchHubs = useHubStore((state) => state.fetchHubs);
  const setCurrentHub = useHubStore((state) => state.setCurrentHub);
  const pendingDeepLink = usePushNotificationStore((s) => s.pendingDeepLink);
  const consumeDeepLink = usePushNotificationStore((s) => s.consumeDeepLink);
  const [refreshing, setRefreshing] = useState(false);
  const autoSelectedRef = useRef(false);

  useEffect(() => {
    if (user) {
      fetchHubs(user.id);
    }
  }, [user]);

  // Auto-select hub if there's a pending deep link with hub_id
  useEffect(() => {
    if (!user || !pendingDeepLink?.hub_id || hubs.length === 0 || autoSelectedRef.current) return;
    const targetHub = hubs.find((h) => h.id === pendingDeepLink.hub_id);
    if (targetHub) {
      autoSelectedRef.current = true;
      (async () => {
        try {
          await setCurrentHub(targetHub.id, user.id);
          const link = consumeDeepLink();
          router.replace('/(tabs)');
          if (link) {
            InteractionManager.runAfterInteractions(() => navigateToDeepLink(link));
          }
        } catch (err) {
          console.error('[HubSelection] Auto-select failed:', err);
          autoSelectedRef.current = false;
        }
      })();
    }
  }, [user, pendingDeepLink, hubs]);

  const handleRefresh = async () => {
    if (user) {
      setRefreshing(true);
      await fetchHubs(user.id);
      setRefreshing(false);
    }
  };

  const handleSelectHub = async (hub: Hub) => {
    if (user) {
      await setCurrentHub(hub.id, user.id);
      router.replace('/(tabs)');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  if (hubsLoading && !refreshing) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={t.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <Text style={[styles.title, { color: t.text }]}>Your Teams</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color={t.textMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={hubs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <HubCard hub={item} onPress={() => handleSelectHub(item)} />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: t.surfaceSecondary }]}>
              <Users size={48} color={t.textFaint} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No teams yet</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              Join a team using an invite code
            </Text>
          </View>
        }
      />

      <View style={[styles.footer, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        <TouchableOpacity style={[styles.footerButton, { borderColor: t.primary }]}>
          <Plus size={20} color={t.primary} />
          <Text style={[styles.footerButtonText, { color: t.primary }]}>Join with Invite Code</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
  },
  signOutButton: {
    padding: 8,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  hubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  hubIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubInfo: {
    flex: 1,
    marginLeft: 12,
  },
  hubName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
  },
  hubSport: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.brand[600],
    borderStyle: 'dashed',
  },
  footerButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand[600],
  },
});
