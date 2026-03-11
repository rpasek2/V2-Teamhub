import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useNavigation, router } from 'expo-router';
import { Users, Lock, Globe, Plus, MessageSquare, Image as ImageIcon, FileText, Settings, Trash2 } from 'lucide-react-native';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useHubStore } from '../../src/stores/hubStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { PostCard } from '../../src/components/groups/PostCard';
import { GroupPhotos } from '../../src/components/groups/GroupPhotos';
import { GroupFiles } from '../../src/components/groups/GroupFiles';
import { GroupMembers } from '../../src/components/groups/GroupMembers';

type TabType = 'posts' | 'photos' | 'files' | 'members' | 'settings';

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
  attachments: Record<string, unknown>[];
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  }[];
  commentCount: number;
}

export default function GroupDetailsScreen() {
  const { t, isDark } = useTheme();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const currentHub = useHubStore((state) => state.currentHub);
  const isStaff = useHubStore((state) => state.isStaff);
  const fetchNotificationCounts = useNotificationStore((state) => state.fetchNotificationCounts);
  const resetDebounce = useNotificationStore((state) => state.resetDebounce);

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [activeTab, setActiveTab] = useState<TabType>('posts');

  // Settings form state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState(false);

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

    // Reset debounce so the count refresh isn't skipped, then fetch
    if (currentHub?.id && user?.id) {
      resetDebounce();
      fetchNotificationCounts(currentHub.id, user.id);
    }
  };

  const fetchGroupDetails = async () => {
    if (!groupId) return;
    setError(null);

    const { data, error } = await supabase
      .from('groups')
      .select('id, name, description, type')
      .eq('id', groupId)
      .single();

    if (error) {
      console.error('Error fetching group:', error);
      setError('Failed to load data. Pull to refresh.');
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
      setIsGroupAdmin(data.role === 'admin');
    }

    if (isStaff()) {
      // Staff can always post and access admin features
      setIsMember(true);
      setIsGroupAdmin(true);
    }
  };

  // Update settings form when group loads
  useEffect(() => {
    if (group) {
      setEditName(group.name);
      setEditDescription(group.description || '');
      setEditIsPrivate(group.type === 'private');
    }
  }, [group]);

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
      setError('Failed to load data. Pull to refresh.');
      setPosts([]);
    } else {
      // Batch fetch comment counts in a single query
      const postIds = (data || []).map(p => p.id);
      const commentCountMap = new Map<string, number>();
      if (postIds.length > 0) {
        const { data: commentRows } = await supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds);
        (commentRows || []).forEach(r => {
          commentCountMap.set(r.post_id, (commentCountMap.get(r.post_id) || 0) + 1);
        });
      }

      const postsWithCounts = (data || []).map(post => {
        // Supabase FK joins return an object for many-to-one, normalize to array for PostCard
        const rawProfiles = post.profiles;
        const profiles = Array.isArray(rawProfiles) ? rawProfiles : rawProfiles ? [rawProfiles] : [];
        return {
          ...post,
          profiles,
          is_pinned: post.is_pinned || false,
          attachments: post.attachments || [],
          commentCount: commentCountMap.get(post.id) || 0,
        };
      });
      setPosts(postsWithCounts as Post[]);

      // Record post views (fire-and-forget)
      if (user && postsWithCounts.length > 0) {
        const rows = postsWithCounts.map(p => ({ post_id: p.id, user_id: user.id }));
        supabase.from('post_views').upsert(rows, { onConflict: 'post_id,user_id', ignoreDuplicates: true }).then();
      }
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

  const handlePinToggle = (postId: string, isPinned: boolean) => {
    setPosts((prev) => {
      const updated = prev.map((p) =>
        p.id === postId ? { ...p, is_pinned: isPinned } : p
      );
      // Re-sort: pinned posts first, then by created_at
      return updated.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    });
  };

  const handleSaveSettings = async () => {
    if (!groupId || !editName.trim()) {
      Alert.alert('Error', 'Group name is required');
      return;
    }

    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          type: editIsPrivate ? 'private' : 'public',
        })
        .eq('id', groupId);

      if (error) throw error;

      // Update local state
      setGroup((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              description: editDescription.trim() || null,
              type: editIsPrivate ? 'private' : 'public',
            }
          : null
      );

      Alert.alert('Success', 'Group settings updated');
    } catch (err) {
      console.error('Error updating group:', err);
      Alert.alert('Error', 'Failed to update group settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteGroup = () => {
    Alert.alert(
      'Delete Group',
      `Are you sure you want to delete "${group?.name}"? This action cannot be undone and will remove all posts, files, and members.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteGroup,
        },
      ]
    );
  };

  const confirmDeleteGroup = async () => {
    if (!groupId) return;

    setDeletingGroup(true);
    try {
      const { error } = await supabase.from('groups').delete().eq('id', groupId);

      if (error) throw error;

      Alert.alert('Deleted', 'Group has been deleted', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('Error deleting group:', err);
      Alert.alert('Error', 'Failed to delete group');
      setDeletingGroup(false);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      currentUserId={user?.id || ''}
      isAdmin={isStaff()}
      onDeleted={() => handlePostDeleted(item.id)}
      onCommentAdded={() => {
        // Refresh to get updated comment count
        fetchPosts();
      }}
      onPinToggle={handlePinToggle}
    />
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Group Header */}
      <View style={[styles.header, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${t.primary}15` }]}>
          <Users size={24} color={t.primary} />
        </View>
        <View style={styles.headerContent}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: t.text }]} numberOfLines={1}>
              {group?.name}
            </Text>
            {group?.type === 'private' ? (
              <View style={[styles.typeBadge, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}>
                <Lock size={12} color={t.textMuted} />
                <Text style={[styles.typeBadgeText, { color: t.textMuted }]}>Private</Text>
              </View>
            ) : (
              <View style={[styles.typeBadge, styles.publicBadge, { backgroundColor: isDark ? colors.emerald[700] + '25' : colors.emerald[50] }]}>
                <Globe size={12} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
                <Text style={[styles.typeBadgeText, { color: isDark ? colors.emerald[400] : colors.emerald[600] }]}>Public</Text>
              </View>
            )}
          </View>
          {group?.description && (
            <Text style={[styles.headerDescription, { color: t.textMuted }]} numberOfLines={2}>
              {group.description}
            </Text>
          )}
          <Text style={[styles.memberCount, { color: t.textFaint }]}>{memberCount} members</Text>
        </View>
      </View>

      {/* Join Button (if not a member) */}
      {!isMember && (
        <View style={[styles.joinContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
          <TouchableOpacity style={[styles.joinButton, { backgroundColor: t.primary }]} onPress={handleJoinGroup}>
            <Users size={18} color={colors.white} />
            <Text style={styles.joinButtonText}>Join Group</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error Banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ color: '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && [styles.tabActive, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('posts')}
        >
          <MessageSquare size={18} color={activeTab === 'posts' ? t.primary : t.textFaint} />
          <Text style={[styles.tabText, { color: t.textFaint }, activeTab === 'posts' && { color: t.primary, fontWeight: '600' as const }]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'photos' && [styles.tabActive, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('photos')}
        >
          <ImageIcon size={18} color={activeTab === 'photos' ? t.primary : t.textFaint} />
          <Text style={[styles.tabText, { color: t.textFaint }, activeTab === 'photos' && { color: t.primary, fontWeight: '600' as const }]}>Photos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'files' && [styles.tabActive, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('files')}
        >
          <FileText size={18} color={activeTab === 'files' ? t.primary : t.textFaint} />
          <Text style={[styles.tabText, { color: t.textFaint }, activeTab === 'files' && { color: t.primary, fontWeight: '600' as const }]}>Files</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'members' && [styles.tabActive, { borderBottomColor: t.primary }]]}
          onPress={() => setActiveTab('members')}
        >
          <Users size={18} color={activeTab === 'members' ? t.primary : t.textFaint} />
          <Text style={[styles.tabText, { color: t.textFaint }, activeTab === 'members' && { color: t.primary, fontWeight: '600' as const }]}>Members</Text>
        </TouchableOpacity>
        {isGroupAdmin && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'settings' && [styles.tabActive, { borderBottomColor: t.primary }]]}
            onPress={() => setActiveTab('settings')}
          >
            <Settings size={18} color={activeTab === 'settings' ? t.primary : t.textFaint} />
            <Text style={[styles.tabText, { color: t.textFaint }, activeTab === 'settings' && { color: t.primary, fontWeight: '600' as const }]}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Content */}
      {activeTab === 'posts' && (
        <>
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
                <Text style={[styles.emptyTitle, { color: t.text }]}>No posts yet</Text>
                <Text style={[styles.emptyText, { color: t.textMuted }]}>
                  Be the first to share something with the group!
                </Text>
                {isMember && (
                  <TouchableOpacity style={[styles.createFirstButton, { backgroundColor: t.primary }]} onPress={handleCreatePost}>
                    <Plus size={18} color={colors.white} />
                    <Text style={styles.createFirstButtonText}>Create First Post</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />

          {/* Create Post FAB */}
          {isMember && posts.length > 0 && (
            <TouchableOpacity style={[styles.fab, { backgroundColor: t.primary }]} onPress={handleCreatePost}>
              <Plus size={24} color={colors.white} />
            </TouchableOpacity>
          )}
        </>
      )}

      {activeTab === 'photos' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <GroupPhotos posts={posts} />
        </ScrollView>
      )}

      {activeTab === 'files' && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <GroupFiles posts={posts} />
        </ScrollView>
      )}

      {activeTab === 'members' && groupId && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <GroupMembers
            groupId={groupId}
            isAdmin={isGroupAdmin}
            currentUserId={user?.id || ''}
            onMemberCountChange={setMemberCount}
          />
        </ScrollView>
      )}

      {activeTab === 'settings' && isGroupAdmin && (
        <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
          <View style={styles.settingsContainer}>
            {/* Group Info Section */}
            <View style={[styles.settingsSection, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: t.text }]}>Group Information</Text>

              <View style={styles.settingsField}>
                <Text style={[styles.settingsLabel, { color: t.textSecondary }]}>Name</Text>
                <TextInput
                  style={[styles.settingsInput, { color: t.text, backgroundColor: t.surface, borderColor: t.border }]}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Group name"
                  placeholderTextColor={t.textFaint}
                />
              </View>

              <View style={styles.settingsField}>
                <Text style={[styles.settingsLabel, { color: t.textSecondary }]}>Description</Text>
                <TextInput
                  style={[styles.settingsInput, styles.settingsTextArea, { color: t.text, backgroundColor: t.surface, borderColor: t.border }]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Describe this group..."
                  placeholderTextColor={t.textFaint}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Privacy Section */}
            <View style={[styles.settingsSection, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.settingsSectionTitle, { color: t.text }]}>Privacy</Text>

              <View style={styles.settingsToggleRow}>
                <View style={styles.settingsToggleInfo}>
                  <View style={[styles.settingsToggleIconContainer, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}>
                    {editIsPrivate ? (
                      <Lock size={20} color={isDark ? colors.slate[400] : colors.slate[600]} />
                    ) : (
                      <Globe size={20} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.settingsToggleLabel, { color: t.text }]}>
                      {editIsPrivate ? 'Private Group' : 'Public Group'}
                    </Text>
                    <Text style={[styles.settingsToggleDescription, { color: t.textMuted }]}>
                      {editIsPrivate
                        ? 'Only members can see posts'
                        : 'Anyone in the hub can see posts'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={editIsPrivate}
                  onValueChange={setEditIsPrivate}
                  trackColor={{ false: isDark ? colors.slate[600] : colors.slate[200], true: `${t.primary}60` }}
                  thumbColor={editIsPrivate ? t.primary : isDark ? colors.slate[500] : colors.slate[50]}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveSettingsButton, { backgroundColor: t.primary }, savingSettings && styles.buttonDisabled]}
              onPress={handleSaveSettings}
              disabled={savingSettings}
            >
              {savingSettings ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveSettingsButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>

            {/* Danger Zone */}
            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <Text style={styles.dangerZoneDescription}>
                Deleting this group will permanently remove all posts, files, and members.
              </Text>
              <TouchableOpacity
                style={[styles.deleteGroupButton, deletingGroup && styles.buttonDisabled]}
                onPress={handleDeleteGroup}
                disabled={deletingGroup}
              >
                {deletingGroup ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <>
                    <Trash2 size={18} color={colors.white} />
                    <Text style={styles.deleteGroupButtonText}>Delete Group</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
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
    backgroundColor: colors.brand[600],
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
    backgroundColor: colors.brand[600],
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
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand[600],
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[400],
  },
  tabTextActive: {
    color: colors.brand[600],
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  // Settings tab styles
  settingsContainer: {
    padding: 16,
  },
  settingsSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 16,
  },
  settingsField: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
    marginBottom: 6,
  },
  settingsInput: {
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  settingsTextArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  settingsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingsToggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsToggleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  settingsToggleDescription: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  saveSettingsButton: {
    backgroundColor: colors.brand[600],
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  saveSettingsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerZone: {
    backgroundColor: colors.error[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error[200],
    marginBottom: 24,
  },
  dangerZoneTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error[700],
    marginBottom: 8,
  },
  dangerZoneDescription: {
    fontSize: 13,
    color: colors.error[600],
    lineHeight: 18,
    marginBottom: 16,
  },
  deleteGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.error[600],
    borderRadius: 10,
    paddingVertical: 12,
  },
  deleteGroupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.white,
  },
});
