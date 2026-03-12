import React, { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Search, Edit, Users, User, Hash, ShieldAlert, ChevronRight, Plus } from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { NotificationBadge, MobileTabGuard, SkeletonChannelList } from '../../src/components/ui';
import { NewDMModal, AnonymousReportModal, CreateChannelModal } from '../../src/components/messages';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private' | 'dm';
  description: string | null;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount: number;
}

interface AnonymousReport {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface OwnerInfo {
  user_id: string;
  full_name: string;
}

function ChannelIcon({ type }: { type: Channel['type'] }) {
  const { t } = useTheme();
  const size = 20;

  switch (type) {
    case 'public':
      return (
        <View style={[styles.channelIcon, { backgroundColor: `${t.primary}15` }]}>
          <Hash size={size} color={t.primary} />
        </View>
      );
    case 'private':
      return (
        <View style={[styles.channelIcon, { backgroundColor: colors.warning[50] }]}>
          <Users size={size} color={colors.warning[600]} />
        </View>
      );
    case 'dm':
      return (
        <View style={[styles.channelIcon, { backgroundColor: colors.slate[100] }]}>
          <User size={size} color={colors.slate[600]} />
        </View>
      );
  }
}

function ChannelItem({ channel, onPress }: { channel: Channel; onPress: () => void }) {
  const { t } = useTheme();
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      return formatDistanceToNow(parseISO(timeStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity style={[styles.channelItem, { backgroundColor: t.surface, borderBottomColor: t.borderSubtle }]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.channelIconContainer}>
        <ChannelIcon type={channel.type} />
        {channel.unreadCount > 0 && (
          <NotificationBadge count={channel.unreadCount} />
        )}
      </View>
      <View style={styles.channelContent}>
        <View style={styles.channelHeader}>
          <Text style={[styles.channelName, { color: t.text }, channel.unreadCount > 0 && styles.unreadName]}>
            {channel.name}
          </Text>
          {channel.lastMessageTime && (
            <Text style={[styles.channelTime, { color: t.textFaint }]}>{formatTime(channel.lastMessageTime)}</Text>
          )}
        </View>
        <Text
          style={[styles.lastMessage, { color: t.textMuted }, channel.unreadCount > 0 && { color: t.textSecondary, fontWeight: '500' }]}
          numberOfLines={1}
        >
          {channel.lastMessage || channel.description || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { t, isDark, colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'channels' | 'direct'>('all');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewDMModal, setShowNewDMModal] = useState(false);
  const [showCreateChannelModal, setShowCreateChannelModal] = useState(false);

  // Anonymous reports state
  const [showAnonymousReportModal, setShowAnonymousReportModal] = useState(false);
  const [anonymousReports, setAnonymousReports] = useState<AnonymousReport[]>([]);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);

  const currentHub = useHubStore((state) => state.currentHub);
  const currentMember = useHubStore((state) => state.currentMember);
  const isStaff = useHubStore((state) => state.isStaff);
  const user = useAuthStore((state) => state.user);

  const isOwner = currentMember?.role === 'owner';
  const isStaffUser = isStaff();
  const anonymousReportsEnabled = currentHub?.settings?.anonymous_reports_enabled !== false;

  // Track channels that were recently opened so re-fetch doesn't resurrect their badges
  // Persisted to AsyncStorage so it survives app restarts
  const recentlyReadChannelIds = useRef<Set<string>>(new Set());
  const recentlyReadStorageKey = currentHub ? `recently-read-channels:${currentHub.id}` : null;

  // Load persisted recently-read IDs on mount
  useEffect(() => {
    if (!recentlyReadStorageKey) return;
    AsyncStorage.getItem(recentlyReadStorageKey).then(stored => {
      if (stored) {
        try {
          const ids = JSON.parse(stored) as string[];
          recentlyReadChannelIds.current = new Set(ids);
        } catch { /* ignore parse errors */ }
      }
    });
  }, [recentlyReadStorageKey]);

  const channelCacheKey = currentHub ? `channels-cache:${currentHub.id}` : null;

  // Load cached channel list on mount for instant render
  useEffect(() => {
    if (!channelCacheKey) return;
    AsyncStorage.getItem(channelCacheKey).then(stored => {
      if (stored) {
        try {
          const cached = JSON.parse(stored) as Channel[];
          if (cached.length > 0) setChannels(cached);
        } catch { /* ignore */ }
      }
    });
  }, [channelCacheKey]);

  const fetchChannels = async () => {
    if (!currentHub || !user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Single RPC returns channels with last message + unread count (server-side)
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_channels_summary', { p_hub_id: currentHub.id });

      if (summaryError) {
        console.error('Error fetching channels summary:', summaryError);
        setError('Failed to load data. Pull to refresh.');
        setChannels([]);
        return;
      }

      // Collect DM user IDs for profile name resolution
      const dmUserIds = new Set<string>();
      for (const ch of summaryData || []) {
        if (ch.dm_participant_ids && ch.dm_participant_ids.length > 0) {
          ch.dm_participant_ids.forEach((id: string) => {
            if (id !== user.id) dmUserIds.add(id);
          });
        }
      }

      // Fetch DM profiles (only query besides the RPC)
      const profileMap = new Map<string, string>();
      if (dmUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(dmUserIds));
        for (const p of profiles || []) {
          profileMap.set(p.id, p.full_name || 'Unknown User');
        }
      }

      // Process channels (RPC already sorted by last_message_time DESC)
      const processedChannels: Channel[] = (summaryData || []).map((ch: Record<string, unknown>) => {
        let channelType: 'public' | 'private' | 'dm' = ch.type as 'public' | 'private';
        let channelName = ch.name as string;

        if (ch.dm_participant_ids && (ch.dm_participant_ids as string[]).length > 0) {
          channelType = 'dm';
          const otherIds = (ch.dm_participant_ids as string[]).filter((id: string) => id !== user.id);
          const names = otherIds
            .map((id: string) => profileMap.get(id) || 'Unknown User')
            .join(', ');
          channelName = names || 'Unknown User';
        }

        // Apply recently-read override for badge suppression
        const dbUnread = Number(ch.unread_count) || 0;
        const wasRecentlyRead = recentlyReadChannelIds.current.has(ch.id as string);
        const unreadCount = wasRecentlyRead ? 0 : dbUnread;

        if (wasRecentlyRead && dbUnread === 0) {
          recentlyReadChannelIds.current.delete(ch.id as string);
          if (recentlyReadStorageKey) {
            AsyncStorage.setItem(recentlyReadStorageKey, JSON.stringify([...recentlyReadChannelIds.current]));
          }
        }

        return {
          id: ch.id as string,
          name: channelName,
          type: channelType,
          description: ch.description as string | null,
          lastMessage: (ch.last_message_content as string) || null,
          lastMessageTime: (ch.last_message_time as string) || null,
          unreadCount,
        };
      });

      setChannels(processedChannels);

      // Cache for instant render on next visit
      if (channelCacheKey) {
        AsyncStorage.setItem(channelCacheKey, JSON.stringify(processedChannels));
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data. Pull to refresh.');
      setChannels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [currentHub?.id, user?.id]);

  // Re-fetch channels when screen regains focus (clears stale badges)
  useFocusEffect(
    useCallback(() => {
      if (currentHub && user) {
        fetchChannels();
      }
    }, [currentHub?.id, user?.id])
  );

  // Fetch owner info for non-staff users
  const fetchOwnerInfo = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('hub_members')
        .select(`
          user_id,
          profile:profiles (
            full_name
          )
        `)
        .eq('hub_id', currentHub.id)
        .eq('role', 'owner')
        .single();

      if (error) {
        console.error('Error fetching owner info:', error);
      } else if (data) {
        setOwnerInfo({
          user_id: data.user_id,
          full_name: (data.profile as any)?.full_name || 'Hub Owner',
        });
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Fetch anonymous reports for owner
  const fetchAnonymousReports = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('anonymous_reports')
        .select('id, message, created_at, read_at')
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching anonymous reports:', error);
      } else {
        setAnonymousReports(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Fetch owner info for non-staff
  useEffect(() => {
    if (currentHub && !isStaffUser && anonymousReportsEnabled) {
      fetchOwnerInfo();
    }
  }, [currentHub?.id, isStaffUser, anonymousReportsEnabled]);

  // Fetch anonymous reports for owner
  useEffect(() => {
    if (currentHub && isOwner) {
      fetchAnonymousReports();
    }
  }, [currentHub?.id, isOwner]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchChannels();
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = channel.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'channels' && channel.type !== 'dm') ||
      (activeTab === 'direct' && channel.type === 'dm');
    return matchesSearch && matchesTab;
  });

  const handleChannelPress = (channel: Channel) => {
    // Track this channel as recently read so re-fetch doesn't resurrect the badge
    recentlyReadChannelIds.current.add(channel.id);
    if (recentlyReadStorageKey) {
      AsyncStorage.setItem(recentlyReadStorageKey, JSON.stringify([...recentlyReadChannelIds.current]));
    }

    // Optimistically clear badge and mark as read in DB
    if (channel.unreadCount > 0) {
      setChannels(prev => prev.map(c =>
        c.id === channel.id ? { ...c, unreadCount: 0 } : c
      ));
    }
    supabase.rpc('mark_channel_read', { p_channel_id: channel.id });
    router.push(`/chat/${channel.id}`);
  };

  const isAthleteUser = currentMember?.role === 'athlete';

  // Block athletes when athlete messaging is disabled
  if (isAthleteUser && currentHub?.settings?.allowAthleteMessaging === false) {
    return (
      <MobileTabGuard tabId="messages">
        <View style={[styles.container, { backgroundColor: t.background, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: t.text, marginBottom: 8 }}>Messaging Disabled</Text>
          <Text style={{ fontSize: 14, color: t.textMuted, textAlign: 'center', paddingHorizontal: 32 }}>Your hub administrator has disabled athlete messaging.</Text>
        </View>
      </MobileTabGuard>
    );
  }

  // Show skeleton on first load (when no cached data), otherwise show cached channels immediately
  if (loading && channels.length === 0) {
    return (
      <MobileTabGuard tabId="messages">
        <View style={[styles.container, { backgroundColor: t.background }]}>
          <View style={[styles.searchContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
            <View style={[styles.searchBar, { backgroundColor: t.surfaceSecondary }]}>
              <Search size={20} color={t.textFaint} />
              <TextInput
                style={[styles.searchInput, { color: t.text }]}
                placeholder="Search messages..."
                placeholderTextColor={t.textFaint}
                editable={false}
              />
            </View>
          </View>
          <SkeletonChannelList count={8} />
        </View>
      </MobileTabGuard>
    );
  }

  return (
    <MobileTabGuard tabId="messages">
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <View style={[styles.searchBar, { backgroundColor: t.surfaceSecondary }]}>
          <Search size={20} color={t.textFaint} />
          <TextInput
            style={[styles.searchInput, { color: t.text }]}
            placeholder="Search messages..."
            placeholderTextColor={t.textFaint}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tab Filter */}
      <View style={[styles.tabBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && [styles.activeTab, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === 'all' && { color: t.primary }]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'channels' && [styles.activeTab, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('channels')}
        >
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === 'channels' && { color: t.primary }]}>
            Channels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'direct' && [styles.activeTab, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === 'direct' && { color: t.primary }]}>
            Direct
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Anonymous Reports Section */}
      {(isOwner || (!isStaffUser && anonymousReportsEnabled && ownerInfo)) && (
        <View style={[styles.anonymousSection, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
          {isOwner ? (
            <TouchableOpacity
              style={[styles.anonymousButton, { backgroundColor: isDark ? colors.purple[900] + '40' : colors.purple[50], borderColor: isDark ? colors.purple[700] : colors.purple[200] }]}
              onPress={() => router.push('/anonymous-reports')}
              activeOpacity={0.7}
            >
              <View style={[styles.anonymousIconContainer, { backgroundColor: isDark ? colors.purple[800] + '60' : colors.purple[100] }]}>
                <ShieldAlert size={20} color={isDark ? colors.purple[400] : colors.purple[600]} />
              </View>
              <View style={styles.anonymousContent}>
                <Text style={[styles.anonymousTitle, { color: isDark ? colors.purple[300] : colors.purple[800] }]}>Anonymous Reports</Text>
                <Text style={[styles.anonymousSubtitle, { color: isDark ? colors.purple[400] : colors.purple[600] }]}>
                  {anonymousReports.filter(r => !r.read_at).length > 0
                    ? `${anonymousReports.filter(r => !r.read_at).length} unread`
                    : `${anonymousReports.length} total`}
                </Text>
              </View>
              {anonymousReports.filter(r => !r.read_at).length > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>
                    {anonymousReports.filter(r => !r.read_at).length}
                  </Text>
                </View>
              )}
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.anonymousButton, { backgroundColor: isDark ? colors.purple[900] + '40' : colors.purple[50], borderColor: isDark ? colors.purple[700] : colors.purple[200] }]}
              onPress={() => setShowAnonymousReportModal(true)}
              activeOpacity={0.7}
            >
              <View style={[styles.anonymousIconContainer, { backgroundColor: isDark ? colors.purple[800] + '60' : colors.purple[100] }]}>
                <ShieldAlert size={20} color={isDark ? colors.purple[400] : colors.purple[600]} />
              </View>
              <View style={styles.anonymousContent}>
                <Text style={[styles.anonymousTitle, { color: isDark ? colors.purple[300] : colors.purple[800] }]}>Anonymous Report</Text>
                <Text style={[styles.anonymousSubtitle, { color: isDark ? colors.purple[400] : colors.purple[600] }]}>
                  Send feedback to {ownerInfo?.full_name}
                </Text>
              </View>
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Channel List */}
      <FlatList
        data={filteredChannels}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChannelItem channel={item} onPress={() => handleChannelPress(item)} />
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
            <Text style={[styles.emptyText, { color: t.textFaint }]}>
              {searchQuery ? 'No messages found' : 'No messages yet'}
            </Text>
          </View>
        }
      />

      {/* FAB Container */}
      <View style={styles.fabContainer}>
        {/* Create Channel FAB (staff only) */}
        {isStaffUser && (
          <TouchableOpacity
            style={[styles.fabSecondary, { backgroundColor: t.surface, borderColor: t.primary }]}
            onPress={() => setShowCreateChannelModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={22} color={t.primary} />
          </TouchableOpacity>
        )}

        {/* New DM FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: t.primary }]}
          onPress={() => setShowNewDMModal(true)}
          activeOpacity={0.8}
        >
          <Edit size={24} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* New DM Modal */}
      <NewDMModal
        isOpen={showNewDMModal}
        onClose={() => setShowNewDMModal(false)}
        onDMCreated={fetchChannels}
      />

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={showCreateChannelModal}
        onClose={() => setShowCreateChannelModal(false)}
        onChannelCreated={fetchChannels}
      />

      {/* Anonymous Report Modal */}
      {ownerInfo && currentHub && (
        <AnonymousReportModal
          isOpen={showAnonymousReportModal}
          onClose={() => setShowAnonymousReportModal(false)}
          hubId={currentHub.id}
          ownerName={ownerInfo.full_name}
        />
      )}
    </View>
    </MobileTabGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.slate[900],
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.brand[600],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  activeTabText: {
    color: colors.brand[600],
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  channelIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  channelIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelContent: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  channelName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate[900],
  },
  unreadName: {
    fontWeight: '600',
  },
  channelTime: {
    fontSize: 12,
    color: colors.slate[400],
  },
  lastMessage: {
    fontSize: 14,
    color: colors.slate[500],
  },
  unreadMessage: {
    color: colors.slate[700],
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.slate[400],
    fontSize: 15,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.brand[600],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  anonymousSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  anonymousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.purple[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.purple[200],
  },
  anonymousIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.purple[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  anonymousContent: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.purple[800],
    marginBottom: 2,
  },
  anonymousSubtitle: {
    fontSize: 13,
    color: colors.purple[600],
  },
  unreadBadge: {
    backgroundColor: colors.purple[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
});
