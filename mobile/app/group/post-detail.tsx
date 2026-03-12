import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useTheme } from '../../src/hooks/useTheme';
import { useAuthStore } from '../../src/stores/authStore';
import { useHubStore } from '../../src/stores/hubStore';
import { supabase } from '../../src/services/supabase';
import { PostCard } from '../../src/components/groups/PostCard';

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  is_pinned: boolean;
  image_url: string | null;
  attachments: any[];
  profiles?: { full_name: string; avatar_url: string | null }[];
  commentCount: number;
}

export default function PostDetailScreen() {
  const { postId, groupId } = useLocalSearchParams<{ postId: string; groupId: string }>();
  const { t } = useTheme();
  const { user } = useAuthStore();
  const { currentMember } = useHubStore();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentMember?.role === 'owner' || currentMember?.role === 'director' || currentMember?.role === 'admin' || currentMember?.role === 'coach';

  useEffect(() => {
    fetchPost();
  }, [postId]);

  const fetchPost = async () => {
    if (!postId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, created_at, user_id, is_pinned, image_url, attachments,
        profiles!posts_user_id_fkey ( full_name, avatar_url )
      `)
      .eq('id', postId)
      .single();

    if (error) {
      console.error('Error fetching post:', error);
      setLoading(false);
      return;
    }

    // Get comment count
    const { count } = await supabase
      .from('comments')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', postId);

    const rawProfiles = data.profiles;
    const profilesArray = Array.isArray(rawProfiles) ? rawProfiles : rawProfiles ? [rawProfiles] : [];

    setPost({
      ...data,
      profiles: profilesArray,
      is_pinned: data.is_pinned || false,
      attachments: data.attachments || [],
      commentCount: count || 0,
    } as Post);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!post || !user) return null;

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      <PostCard
        post={post}
        currentUserId={user.id}
        isAdmin={isAdmin}
        expanded
        onDeleted={() => {
          router.back();
        }}
        onCommentAdded={() => {}}
        onPinToggle={(postId, isPinned) => {
          setPost(prev => prev ? { ...prev, is_pinned: isPinned } : null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
