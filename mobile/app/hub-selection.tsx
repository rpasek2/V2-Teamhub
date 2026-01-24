import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Plus, Users, Settings, LogOut } from 'lucide-react-native';
import { colors, theme } from '../src/constants/colors';
import { useAuthStore } from '../src/stores/authStore';
import { useHubStore, Hub } from '../src/stores/hubStore';
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
  const config = SPORT_CONFIG[hub.sport_type] || SPORT_CONFIG.gymnastics;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={styles.hubCard}>
        <View style={[styles.hubIcon, { backgroundColor: config.color }]}>
          <Users size={24} color={colors.white} />
        </View>
        <View style={styles.hubInfo}>
          <Text style={styles.hubName}>{hub.name}</Text>
          <Text style={styles.hubSport}>{config.label}</Text>
        </View>
        <ChevronRight size={20} color={colors.slate[400]} />
      </View>
    </TouchableOpacity>
  );
}

export default function HubSelectionScreen() {
  const { user, signOut } = useAuthStore();
  const { hubs, hubsLoading, fetchHubs, setCurrentHub } = useHubStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHubs(user.id);
    }
  }, [user]);

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Teams</Text>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <LogOut size={20} color={colors.slate[500]} />
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
            tintColor={theme.light.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Users size={48} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyTitle}>No teams yet</Text>
            <Text style={styles.emptyText}>
              Join a team using an invite code or create your own
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton}>
          <Plus size={20} color={theme.light.primary} />
          <Text style={styles.footerButtonText}>Join with Invite Code</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: 60,
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
    borderColor: theme.light.primary,
    borderStyle: 'dashed',
  },
  footerButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: theme.light.primary,
  },
});
