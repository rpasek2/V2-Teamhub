import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Users, Lock, ChevronRight } from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { NotificationBadge, MobileTabGuard, SkeletonChannelList } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private';
  memberCount: number;
  unreadPosts: number;
  lastActivity: string | null;
}

function GroupCard({ group, onPress }: { group: Group; onPress: () => void }) {
  const { t } = useTheme();
  const formatLastActivity = (timeStr: string | null) => {
    if (!timeStr) return 'No activity';
    try {
      return formatDistanceToNow(parseISO(timeStr), { addSuffix: true });
    } catch {
      return 'No activity';
    }
  };

  return (
    <TouchableOpacity style={[styles.groupCard, { backgroundColor: t.surface, borderColor: t.border }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.groupIcon, { backgroundColor: `${t.primary}15` }]}>
        <Users size={24} color={t.primary} />
        {group.unreadPosts > 0 && (
          <View style={styles.unreadBadge}>
            <NotificationBadge count={group.unreadPosts} />
          </View>
        )}
      </View>
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleRow}>
            <Text style={[styles.groupName, { color: t.text }]} numberOfLines={1}>{group.name}</Text>
            {group.type === 'private' && (
              <Lock size={14} color={t.textFaint} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={[styles.lastActivity, { color: t.textFaint }]}>{formatLastActivity(group.lastActivity)}</Text>
        </View>
        {group.description && (
          <Text style={[styles.groupDescription, { color: t.textMuted }]} numberOfLines={1}>
            {group.description}
          </Text>
        )}
        <View style={styles.groupMeta}>
          <View style={styles.metaItem}>
            <Users size={14} color={t.textFaint} />
            <Text style={[styles.metaText, { color: t.textMuted }]}>{group.memberCount} members</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color={t.textFaint} />
    </TouchableOpacity>
  );
}

export default function GroupsScreen() {
  const { t, isDark, colors } = useTheme();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentHub = useHubStore((state) => state.currentHub);
  const user = useAuthStore((state) => state.user);

  const groupsCacheKey = currentHub ? `groups-cache:${currentHub.id}` : null;

  // Load cached groups on mount for instant render
  useEffect(() => {
    if (!groupsCacheKey) return;
    AsyncStorage.getItem(groupsCacheKey).then(stored => {
      if (stored) {
        try {
          const cached = JSON.parse(stored) as Group[];
          if (cached.length > 0) setGroups(cached);
        } catch { /* ignore */ }
      }
    });
  }, [groupsCacheKey]);

  const fetchGroups = async () => {
    if (!currentHub || !user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Single RPC returns groups with member count, last activity, and unread count
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_groups_summary', { p_hub_id: currentHub.id });

      if (summaryError) {
        console.error('Error fetching groups summary:', summaryError);
        setError('Failed to load data. Pull to refresh.');
        setGroups([]);
        return;
      }

      const processedGroups: Group[] = (summaryData || []).map((g: Record<string, unknown>) => ({
        id: g.id as string,
        name: g.name as string,
        description: g.description as string | null,
        type: g.type as 'public' | 'private',
        memberCount: Number(g.member_count) || 0,
        unreadPosts: Number(g.unread_posts) || 0,
        lastActivity: (g.last_activity as string) || null,
      }));

      // Sort by unread first, then by last activity
      processedGroups.sort((a, b) => {
        if (a.unreadPosts !== b.unreadPosts) {
          return b.unreadPosts - a.unreadPosts;
        }
        if (!a.lastActivity) return 1;
        if (!b.lastActivity) return -1;
        return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
      });

      setGroups(processedGroups);

      // Cache for instant render on next visit
      if (groupsCacheKey) {
        AsyncStorage.setItem(groupsCacheKey, JSON.stringify(processedGroups));
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data. Pull to refresh.');
      setGroups([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh groups when screen gains focus (e.g., returning from group details)
  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [currentHub?.id, user?.id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGroups();
  };

  const handleGroupPress = (group: Group) => {
    router.push(`/group/${group.id}`);
  };

  const totalUnread = groups.reduce((sum, g) => sum + g.unreadPosts, 0);

  if (loading && groups.length === 0) {
    return (
      <MobileTabGuard tabId="groups">
        <View style={[styles.container, { backgroundColor: t.background }]}>
          <View style={[styles.statsBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: t.text }]}>-</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Groups</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: t.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: t.text }]}>-</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Unread</Text>
            </View>
          </View>
          <View style={{ padding: 16 }}>
            <SkeletonChannelList count={6} />
          </View>
        </View>
      </MobileTabGuard>
    );
  }

  return (
    <MobileTabGuard tabId="groups">
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Header Stats */}
      <View style={[styles.statsBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.text }]}>{groups.length}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Groups</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.text }]}>{totalUnread}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Unread</Text>
        </View>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Groups List */}
      <FlatList
        data={groups}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <GroupCard group={item} onPress={() => handleGroupPress(item)} />
        )}
        contentContainerStyle={styles.listContent}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: t.surfaceSecondary }]}>
              <Users size={48} color={t.textFaint} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No groups yet</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              You'll see your team groups here once you're added to them
            </Text>
          </View>
        }
      />
    </View>
    </MobileTabGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
  },
  statLabel: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.slate[200],
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  groupContent: {
    flex: 1,
    marginLeft: 12,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  lastActivity: {
    fontSize: 12,
    color: colors.slate[400],
    marginLeft: 8,
  },
  groupDescription: {
    fontSize: 14,
    color: colors.slate[500],
    marginBottom: 8,
  },
  groupMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
