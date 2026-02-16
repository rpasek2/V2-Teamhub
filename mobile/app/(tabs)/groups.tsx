import React, { useState, useEffect, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { Users, Lock, ChevronRight } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { NotificationBadge, MobileTabGuard } from '../../src/components/ui';
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
  const formatLastActivity = (timeStr: string | null) => {
    if (!timeStr) return 'No activity';
    try {
      return formatDistanceToNow(parseISO(timeStr), { addSuffix: true });
    } catch {
      return 'No activity';
    }
  };

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.groupIcon}>
        <Users size={24} color={theme.light.primary} />
        {group.unreadPosts > 0 && (
          <View style={styles.unreadBadge}>
            <NotificationBadge count={group.unreadPosts} />
          </View>
        )}
      </View>
      <View style={styles.groupContent}>
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleRow}>
            <Text style={styles.groupName} numberOfLines={1}>{group.name}</Text>
            {group.type === 'private' && (
              <Lock size={14} color={colors.slate[400]} style={{ marginLeft: 4 }} />
            )}
          </View>
          <Text style={styles.lastActivity}>{formatLastActivity(group.lastActivity)}</Text>
        </View>
        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={1}>
            {group.description}
          </Text>
        )}
        <View style={styles.groupMeta}>
          <View style={styles.metaItem}>
            <Users size={14} color={colors.slate[400]} />
            <Text style={styles.metaText}>{group.memberCount} members</Text>
          </View>
        </View>
      </View>
      <ChevronRight size={20} color={colors.slate[400]} />
    </TouchableOpacity>
  );
}

export default function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentHub = useHubStore((state) => state.currentHub);
  const user = useAuthStore((state) => state.user);

  const fetchGroups = async () => {
    if (!currentHub || !user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Fetch groups for this hub that the user is a member of
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select('group_id, last_viewed_at')
        .eq('user_id', user.id);

      if (memberError) {
        console.error('Error fetching group memberships:', memberError);
      }

      const memberGroupIds = memberGroups?.map(m => m.group_id) || [];
      const lastViewedMap = new Map(memberGroups?.map(m => [m.group_id, m.last_viewed_at]) || []);

      // Fetch all groups for this hub
      const { data: groupData, error } = await supabase
        .from('groups')
        .select('id, name, description, type')
        .eq('hub_id', currentHub.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching groups:', error);
        setError('Failed to load data. Pull to refresh.');
        setGroups([]);
        return;
      }

      // Process all groups in parallel
      const processedGroups = await Promise.all(
        (groupData || []).map(async (g) => {
          // Run all queries for this group in parallel
          const [memberCountResult, lastPostResult, unreadResult] = await Promise.all([
            // Get member count
            supabase
              .from('group_members')
              .select('user_id', { count: 'exact', head: true })
              .eq('group_id', g.id),

            // Get last post time
            supabase
              .from('posts')
              .select('created_at')
              .eq('group_id', g.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),

            // Calculate unread posts if user is a member (excluding own posts)
            memberGroupIds.includes(g.id)
              ? supabase
                  .from('posts')
                  .select('id', { count: 'exact', head: true })
                  .eq('group_id', g.id)
                  .gt('created_at', lastViewedMap.get(g.id) || '1970-01-01')
                  .neq('user_id', user.id)
              : Promise.resolve({ count: 0 }),
          ]);

          return {
            id: g.id,
            name: g.name,
            description: g.description,
            type: g.type as 'public' | 'private',
            memberCount: memberCountResult.count || 0,
            unreadPosts: unreadResult.count || 0,
            lastActivity: lastPostResult.data?.created_at || null,
          };
        })
      );

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <MobileTabGuard tabId="groups">
    <View style={styles.container}>
      {/* Header Stats */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{groups.length}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalUnread}</Text>
          <Text style={styles.statLabel}>Unread</Text>
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Users size={48} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyText}>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
