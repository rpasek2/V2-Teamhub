import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Search, Edit, Users, User, Hash, ShieldAlert, ChevronRight, Plus } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { NotificationBadge, MobileTabGuard } from '../../src/components/ui';
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
  const size = 20;

  switch (type) {
    case 'public':
      return (
        <View style={[styles.channelIcon, { backgroundColor: colors.brand[50] }]}>
          <Hash size={size} color={colors.brand[600]} />
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
  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      return formatDistanceToNow(parseISO(timeStr), { addSuffix: false });
    } catch {
      return '';
    }
  };

  return (
    <TouchableOpacity style={styles.channelItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.channelIconContainer}>
        <ChannelIcon type={channel.type} />
        {channel.unreadCount > 0 && (
          <NotificationBadge count={channel.unreadCount} />
        )}
      </View>
      <View style={styles.channelContent}>
        <View style={styles.channelHeader}>
          <Text style={[styles.channelName, channel.unreadCount > 0 && styles.unreadName]}>
            {channel.name}
          </Text>
          {channel.lastMessageTime && (
            <Text style={styles.channelTime}>{formatTime(channel.lastMessageTime)}</Text>
          )}
        </View>
        <Text
          style={[styles.lastMessage, channel.unreadCount > 0 && styles.unreadMessage]}
          numberOfLines={1}
        >
          {channel.lastMessage || channel.description || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
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

  const fetchChannels = async () => {
    if (!currentHub || !user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      // Fetch channels for this hub
      const { data: channelData, error } = await supabase
        .from('channels')
        .select('id, name, type, description, group_id, dm_participant_ids')
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching channels:', error);
        setError('Failed to load data. Pull to refresh.');
        setChannels([]);
        return;
      }

      // Collect all DM user IDs to batch fetch profiles
      const dmUserIds = new Set<string>();
      for (const ch of channelData || []) {
        if (ch.dm_participant_ids && ch.dm_participant_ids.length > 0) {
          ch.dm_participant_ids.forEach((id: string) => {
            if (id !== user.id) dmUserIds.add(id);
          });
        }
      }

      // Batch fetch all DM profiles at once
      const profileMap = new Map<string, string>();
      if (dmUserIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(dmUserIds));
        for (const profile of profiles || []) {
          profileMap.set(profile.id, profile.full_name || 'Unknown User');
        }
      }

      // Process all channels in parallel
      const processedChannels = await Promise.all(
        (channelData || []).map(async (ch) => {
          // Run all queries for this channel in parallel
          const [lastMsgResult, memberDataResult, unreadResult] = await Promise.all([
            // Get last message
            supabase
              .from('messages')
              .select('content, created_at')
              .eq('channel_id', ch.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle(),
            // Get member's last read time
            supabase
              .from('channel_members')
              .select('last_read_at')
              .eq('channel_id', ch.id)
              .eq('user_id', user.id)
              .maybeSingle(),
            // Get unread count - we'll use a default last_read if no membership
            (async () => {
              const { data: member } = await supabase
                .from('channel_members')
                .select('last_read_at')
                .eq('channel_id', ch.id)
                .eq('user_id', user.id)
                .maybeSingle();
              const lastRead = member?.last_read_at || '1970-01-01';
              return supabase
                .from('messages')
                .select('id', { count: 'exact', head: true })
                .eq('channel_id', ch.id)
                .gt('created_at', lastRead)
                .neq('user_id', user.id);
            })(),
          ]);

          const lastMsg = lastMsgResult.data;

          // Determine channel type and name for DMs
          let channelType: 'public' | 'private' | 'dm' = ch.type as 'public' | 'private';
          let channelName = ch.name;

          if (ch.dm_participant_ids && ch.dm_participant_ids.length > 0) {
            channelType = 'dm';
            const otherIds = ch.dm_participant_ids.filter((id: string) => id !== user.id);
            const names = otherIds
              .map((id: string) => profileMap.get(id) || 'Unknown User')
              .join(', ');
            channelName = names || 'Unknown User';
          }

          return {
            id: ch.id,
            name: channelName,
            type: channelType,
            description: ch.description,
            lastMessage: lastMsg?.content || null,
            lastMessageTime: lastMsg?.created_at || null,
            unreadCount: unreadResult.count || 0,
          };
        })
      );

      // Sort by last message time
      processedChannels.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setChannels(processedChannels);
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
    router.push(`/chat/${channel.id}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <MobileTabGuard tabId="messages">
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search messages..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tab Filter */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'channels' && styles.activeTab]}
          onPress={() => setActiveTab('channels')}
        >
          <Text style={[styles.tabText, activeTab === 'channels' && styles.activeTabText]}>
            Channels
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'direct' && styles.activeTab]}
          onPress={() => setActiveTab('direct')}
        >
          <Text style={[styles.tabText, activeTab === 'direct' && styles.activeTabText]}>
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
        <View style={styles.anonymousSection}>
          {isOwner ? (
            <TouchableOpacity
              style={styles.anonymousButton}
              onPress={() => router.push('/anonymous-reports')}
              activeOpacity={0.7}
            >
              <View style={styles.anonymousIconContainer}>
                <ShieldAlert size={20} color={colors.purple[600]} />
              </View>
              <View style={styles.anonymousContent}>
                <Text style={styles.anonymousTitle}>Anonymous Reports</Text>
                <Text style={styles.anonymousSubtitle}>
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
              <ChevronRight size={20} color={colors.slate[400]} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.anonymousButton}
              onPress={() => setShowAnonymousReportModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.anonymousIconContainer}>
                <ShieldAlert size={20} color={colors.purple[600]} />
              </View>
              <View style={styles.anonymousContent}>
                <Text style={styles.anonymousTitle}>Anonymous Report</Text>
                <Text style={styles.anonymousSubtitle}>
                  Send feedback to {ownerInfo?.full_name}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.slate[400]} />
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
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
            style={styles.fabSecondary}
            onPress={() => setShowCreateChannelModal(true)}
            activeOpacity={0.8}
          >
            <Plus size={22} color={theme.light.primary} />
          </TouchableOpacity>
        )}

        {/* New DM FAB */}
        <TouchableOpacity
          style={styles.fab}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderBottomColor: theme.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  activeTabText: {
    color: theme.light.primary,
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
    backgroundColor: theme.light.primary,
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
    borderColor: theme.light.primary,
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
