import React, { useState, useEffect } from 'react';
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
import { router } from 'expo-router';
import { Search, Edit, Users, User, Hash } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { NotificationBadge } from '../../src/components/ui';
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
  const [refreshing, setRefreshing] = useState(false);

  const { currentHub } = useHubStore();
  const { user } = useAuthStore();

  const fetchChannels = async () => {
    if (!currentHub || !user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch channels for this hub
      const { data: channelData, error } = await supabase
        .from('channels')
        .select('id, name, type, description, group_id, dm_participant_ids')
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching channels:', error);
        setChannels([]);
        return;
      }

      // Process channels and get last message for each
      const processedChannels: Channel[] = [];

      for (const ch of channelData || []) {
        // Get the most recent message
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('content, created_at')
          .eq('channel_id', ch.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Determine channel type and name for DMs
        let channelType: 'public' | 'private' | 'dm' = ch.type as 'public' | 'private';
        let channelName = ch.name;

        if (ch.dm_participant_ids && ch.dm_participant_ids.length > 0) {
          channelType = 'dm';
          // For DMs, get the other participant's name
          const otherUserId = ch.dm_participant_ids.find((id: string) => id !== user.id);
          if (otherUserId) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', otherUserId)
              .single();
            channelName = profile?.full_name || 'Unknown User';
          }
        }

        // Get unread count for this channel
        let unreadCount = 0;
        const { data: memberData } = await supabase
          .from('channel_members')
          .select('last_read_at')
          .eq('channel_id', ch.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberData?.last_read_at || !memberData) {
          const lastRead = memberData?.last_read_at || '1970-01-01';
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('channel_id', ch.id)
            .gt('created_at', lastRead)
            .neq('user_id', user.id);
          unreadCount = count || 0;
        }

        processedChannels.push({
          id: ch.id,
          name: channelName,
          type: channelType,
          description: ch.description,
          lastMessage: lastMsg?.content || null,
          lastMessageTime: lastMsg?.created_at || null,
          unreadCount,
        });
      }

      // Sort by last message time
      processedChannels.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setChannels(processedChannels);
    } catch (err) {
      console.error('Error:', err);
      setChannels([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [currentHub?.id, user?.id]);

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

      {/* New Message FAB */}
      <TouchableOpacity style={styles.fab}>
        <Edit size={24} color={colors.white} />
      </TouchableOpacity>
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
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
});
