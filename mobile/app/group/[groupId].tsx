import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Users, Lock, Globe, Plus, MessageSquare } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useHubStore } from '../../src/stores/hubStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { PostCard } from '../../src/components/groups/PostCard';

interface Group {
  id: string;
  name: string;
  description: string | null;
  type: 'public' | 'private';
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_pinned: boolean;
  image_url: string | null;
  attachments: any[];
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  commentCount: number;
}

export default function GroupDetailsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const { currentHub, isStaff } = useHubStore();
  const { fetchNotificationCounts } = useNotificationStore();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(0);

  useEffect(() => {
    if (groupId && user) {
      fetchGroupDetails();
      fetchPosts();
      checkMembership();
      fetchMemberCount();
      markGroupAsViewed();
    }
  }, [groupId, user?.id]);

  // Update header when group loads
  useEffect(() => {
    if (group) {
      navigation.setOptions({ title: group.name });
    }
  }, [group, navigation]);

  const markGroupAsViewed = async () => {
    if (!groupId || !user?.id) return;

    await supabase
      .from('group_members')
      .update({ last_viewed_at: new Date().toISOString() })
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    // Refresh notification counts
    if (currentHub?.id && user?.id) {
      fetchNotificationCounts(currentHub.id, user.id);
    }
  };

  const fetchGroupDetails = async () => {
    if (!groupId) return;

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, type')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
    } else {
      setGroup(data);
    }
  };

  const fetchMemberCount = async () => {
    if (!groupId) return;

    const { count, error } = await supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (!error && count !== null) {
      setMemberCount(count);
    }
  };

  const checkMembership = async () => {
    if (!user || !groupId) return;

    const { data, error } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!error && data) {
      setIsMember(true);
    } else if (isStaff()) {
      // Staff can always post
      setIsMember(true);
    }
  };

  const fetchPosts = async () => {
    if (!groupId) return;

    const { data, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        created_at,
        user_id,
        is_pinned,
        image_url,
        attachments,
        profiles (
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    } else {
      // Fetch comment counts for each post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post) => {
          const { count } = await supabase
            .from('comments')
            .select('id', { count: 'exact', head: true })
            .eq('post_id', post.id);

          return {
            ...post,
            is_pinned: post.is_pinned || false,
            attachments: post.attachments || [],
            commentCount: count || 0,
          };
        })
      );
      setPosts(postsWithCounts as Post[]);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
    markGroupAsViewed();
  };

  const handleJoinGroup = async () => {
    if (!user || !groupId) return;

    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: user.id,
        role: 'member',
      });

    if (!error) {
      setIsMember(true);
      setMemberCount((prev) => prev + 1);
    }
  };

  const handleCreatePost = () => {
    router.push({
      pathname: '/group/create-post',
      params: { groupId },
    });
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?.id || ''}
      onDeleted={() => handlePostDeleted(item.id)}
      onCommentAdded={() => {
        // Refresh to get updated comment count
        fetchPosts();
      }}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Group Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={24} color={theme.light.primary} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {group?.name}
            </Text>
            {group?.type === 'private' ? (
              <View style={styles.typeBadge}>
                <Lock size={12} color={colors.slate[500]} />
                <Text style={styles.typeBadgeText}>Private</Text>
              </View>
            ) : (
              <View style={[styles.typeBadge, styles.publicBadge]}>
                <Globe size={12} color={colors.emerald[600]} />
                <Text style={[styles.typeBadgeText, styles.publicBadgeText]}>Public</Text>
              </View>
            )}
          </View>
          {group?.description && (
            <Text style={styles.headerDescription} numberOfLines={2}>
              {group.description}
            </Text>
          )}
          <Text style={styles.memberCount}>{memberCount} members</Text>
        </View>
      </View>

      {/* Join Button (if not a member) */}
      {!isMember && (
        <View style={styles.joinContainer}>
          <TouchableOpacity style={styles.joinButton} onPress={handleJoinGroup}>
            <Users size={18} color={colors.white} />
            <Text style={styles.joinButtonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Posts List */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.postsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <MessageSquare size={48} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptyText}>
              Be the first to share something with the group!
            </Text>
            {isMember && (
              <TouchableOpacity style={styles.createFirstButton} onPress={handleCreatePost}>
                <Plus size={18} color={colors.white} />
                <Text style={styles.createFirstButtonText}>Create First Post</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Create Post FAB */}
      {isMember && posts.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleCreatePost}>
          <Plus size={24} color={colors.white} />
        </TouchableOpacity>
      )}
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
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
  },
  publicBadge: {
    backgroundColor: colors.emerald[50],
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.slate[500],
  },
  publicBadgeText: {
    color: colors.emerald[600],
  },
  headerDescription: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 4,
  },
  memberCount: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 4,
  },
  joinContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.light.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  joinButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  postsList: {
    padding: 16,
    flexGrow: 1,
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
    borderRadius: 20,
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
    marginBottom: 20,
  },
  createFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createFirstButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
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
