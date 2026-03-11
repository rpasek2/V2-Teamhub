import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MessageSquare, Pin, PinOff, MoreHorizontal, Trash2, Send, User, ThumbsUp, Heart, PartyPopper, Eye, Pencil } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../services/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { PollDisplay } from './PollDisplay';
import { SignupDisplay } from './SignupDisplay';
import { RsvpDisplay } from './RsvpDisplay';
import { LinkifiedText } from '../ui/LinkifiedText';

type ReactionType = 'like' | 'heart' | 'celebrate';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  }[];
}

interface PostCardProps {
  post: {
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
    }[];
    commentCount: number;
  };
  currentUserId: string;
  isAdmin?: boolean;
  onDeleted: () => void;
  onCommentAdded: () => void;
  onPinToggle?: (postId: string, isPinned: boolean) => void;
}

export function PostCard({ post, currentUserId, isAdmin = false, onDeleted, onCommentAdded, onPinToggle }: PostCardProps) {
  const { t, isDark } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [localCommentCount, setLocalCommentCount] = useState(post.commentCount);
  const [isPinned, setIsPinned] = useState(post.is_pinned);

  // Reaction state
  const [reactions, setReactions] = useState<{ like: number; heart: number; celebrate: number }>({
    like: 0,
    heart: 0,
    celebrate: 0,
  });
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [displayContent, setDisplayContent] = useState(post.content);
  const [savingEdit, setSavingEdit] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  const canDelete = isAdmin || post.user_id === currentUserId;
  const canEditPost = post.user_id === currentUserId;
  const canPin = isAdmin;

  // Fetch reactions and view count on mount
  useEffect(() => {
    fetchReactions();
    fetchViewCount();
  }, [post.id]);

  const fetchViewCount = async () => {
    const { count } = await supabase
      .from('post_views')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', post.id);
    if (count !== null) setViewCount(count);
  };

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('post_reactions')
        .select('reaction_type, user_id')
        .eq('post_id', post.id);

      if (error) throw error;

      const counts = { like: 0, heart: 0, celebrate: 0 };
      let myReaction: ReactionType | null = null;

      data?.forEach((r) => {
        const type = r.reaction_type as ReactionType;
        if (counts[type] !== undefined) {
          counts[type]++;
        }
        if (r.user_id === currentUserId) {
          myReaction = type;
        }
      });

      setReactions(counts);
      setUserReaction(myReaction);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    }
  };

  const handleReaction = async (type: ReactionType) => {
    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase
          .from('post_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        setReactions((prev) => ({ ...prev, [type]: prev[type] - 1 }));
        setUserReaction(null);
      } else if (userReaction) {
        // Change reaction type
        await supabase
          .from('post_reactions')
          .update({ reaction_type: type })
          .eq('post_id', post.id)
          .eq('user_id', currentUserId);

        setReactions((prev) => ({
          ...prev,
          [userReaction]: prev[userReaction] - 1,
          [type]: prev[type] + 1,
        }));
        setUserReaction(type);
      } else {
        // Add new reaction
        await supabase.from('post_reactions').insert({
          post_id: post.id,
          user_id: currentUserId,
          reaction_type: type,
        });

        setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
        setUserReaction(type);
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleToggleComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
      setShowComments(true);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment('');
      setLocalCommentCount((prev) => prev + 1);

      // Refresh comments
      const { data } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      setComments(data || []);
      onCommentAdded();
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', post.id);

              if (error) throw error;
              onDeleted();
            } catch (error) {
              console.error('Error deleting post:', error);
              Alert.alert('Error', 'Failed to delete post');
            }
          },
        },
      ]
    );
    setShowMenu(false);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || editContent === displayContent) {
      setIsEditing(false);
      setEditContent(displayContent);
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ content: editContent.trim() })
        .eq('id', post.id);

      if (error) throw error;
      setDisplayContent(editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating post:', error);
      Alert.alert('Error', 'Failed to update post');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(displayContent);
  };

  // Get images from attachments or legacy image_url
  const images: string[] = [];
  if (post.image_url) {
    images.push(post.image_url);
  }
  const imageAttachment = post.attachments?.find((a: any) => a.type === 'images');
  if (imageAttachment?.urls) {
    images.push(...imageAttachment.urls);
  }

  // Get poll from attachments
  const pollAttachment = post.attachments?.find((a: any) => a.type === 'poll');

  // Get signup from attachments
  const signupAttachment = post.attachments?.find((a: any) => a.type === 'signup');

  // Get RSVP from attachments
  const rsvpAttachment = post.attachments?.find((a: any) => a.type === 'rsvp');

  return (
    <View style={[styles.container, { backgroundColor: t.surface, borderColor: t.border }]}>
      {/* Pinned indicator */}
      {isPinned && (
        <View style={styles.pinnedBanner}>
          <Pin size={12} color={colors.amber[600]} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      )}

      {/* Post Header */}
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: t.surfaceSecondary }]}>
          {post.profiles?.[0]?.avatar_url ? (
            <Image source={{ uri: post.profiles[0].avatar_url, cache: 'force-cache' }} style={styles.avatarImage} />
          ) : (
            <User size={20} color={t.textFaint} />
          )}
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.authorName, { color: t.text }]}>
            {post.profiles?.[0]?.full_name || 'Unknown'}
          </Text>
          <Text style={[styles.timestamp, { color: t.textFaint }]}>{formatTime(post.created_at)}</Text>
        </View>
        {(canDelete || canPin || canEditPost) && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={20} color={t.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      {/* Menu dropdown */}
      {showMenu && (
        <View style={[styles.menu, { backgroundColor: t.surface }]}>
          {canPin && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={async () => {
                setShowMenu(false);
                const newPinned = !isPinned;
                setIsPinned(newPinned);
                try {
                  await supabase
                    .from('posts')
                    .update({ is_pinned: newPinned })
                    .eq('id', post.id);
                  if (onPinToggle) onPinToggle(post.id, newPinned);
                } catch (err) {
                  setIsPinned(!newPinned);
                  console.error('Error toggling pin:', err);
                }
              }}
            >
              {isPinned ? (
                <>
                  <PinOff size={16} color={t.textMuted} />
                  <Text style={[styles.menuItemText, { color: t.textSecondary }]}>Unpin Post</Text>
                </>
              ) : (
                <>
                  <Pin size={16} color={colors.amber[500]} />
                  <Text style={[styles.menuItemText, { color: t.textSecondary }]}>Pin Post</Text>
                </>
              )}
            </TouchableOpacity>
          )}
          {canEditPost && (
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setIsEditing(true);
              }}
            >
              <Pencil size={16} color={t.textMuted} />
              <Text style={[styles.menuItemText, { color: t.textSecondary }]}>Edit Post</Text>
            </TouchableOpacity>
          )}
          {canDelete && (
            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <Trash2 size={16} color={colors.error[600]} />
              <Text style={styles.menuItemTextDanger}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post Content */}
      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            style={[styles.editInput, { color: t.text, backgroundColor: t.background, borderColor: t.border }]}
            value={editContent}
            onChangeText={setEditContent}
            multiline
            autoFocus
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: t.surfaceSecondary }]}
              onPress={handleCancelEdit}
            >
              <Text style={[styles.editButtonText, { color: t.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: t.primary, opacity: savingEdit || !editContent.trim() ? 0.5 : 1 }]}
              onPress={handleSaveEdit}
              disabled={savingEdit || !editContent.trim()}
            >
              <Text style={[styles.editButtonText, { color: colors.white }]}>
                {savingEdit ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TouchableOpacity
            activeOpacity={needsTruncation && !expanded ? 0.7 : 1}
            onPress={() => { if (needsTruncation && !expanded) setExpanded(true); }}
            disabled={expanded || !needsTruncation}
          >
            <LinkifiedText
              text={displayContent}
              style={[styles.content, { color: t.textSecondary }]}
              numberOfLines={expanded ? undefined : 6}
              onTextLayout={(e: { nativeEvent: { lines: unknown[] } }) => {
                if (!needsTruncation && e.nativeEvent.lines.length > 6) {
                  setNeedsTruncation(true);
                }
              }}
            />
            {needsTruncation && !expanded && (
              <Text style={[styles.seeMoreText, { color: t.primary, paddingHorizontal: 16, paddingBottom: 8 }]}>See more</Text>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Images */}
      {images.length > 0 && (
        <View style={styles.imageContainer}>
          {images.slice(0, 4).map((url, index) => (
            <Image
              key={index}
              source={{ uri: url }}
              style={[
                styles.postImage,
                images.length === 1 && styles.singleImage,
                images.length > 1 && styles.gridImage,
              ]}
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {/* Poll */}
      {pollAttachment && (
        <PollDisplay
          postId={post.id}
          question={pollAttachment.question}
          options={pollAttachment.options}
          settings={pollAttachment.settings || {}}
          currentUserId={currentUserId}
        />
      )}

      {/* Signup */}
      {signupAttachment && (
        <SignupDisplay
          postId={post.id}
          title={signupAttachment.title}
          description={signupAttachment.description}
          slots={signupAttachment.slots || []}
          settings={signupAttachment.settings}
          currentUserId={currentUserId}
        />
      )}

      {/* RSVP */}
      {rsvpAttachment && (
        <RsvpDisplay
          postId={post.id}
          title={rsvpAttachment.title}
          date={rsvpAttachment.date}
          time={rsvpAttachment.time}
          location={rsvpAttachment.location}
          currentUserId={currentUserId}
        />
      )}

      {/* Actions */}
      <View style={[styles.actions, { borderTopColor: t.borderSubtle }]}>
        {/* Reactions */}
        <View style={styles.reactionsContainer}>
          <TouchableOpacity
            style={[styles.reactionButton, { backgroundColor: t.background }, userReaction === 'like' && styles.reactionButtonActive]}
            onPress={() => handleReaction('like')}
          >
            <ThumbsUp
              size={16}
              color={userReaction === 'like' ? t.primary : t.textFaint}
            />
            {reactions.like > 0 && (
              <Text style={[styles.reactionCount, { color: t.textMuted }, userReaction === 'like' && styles.reactionCountActive]}>
                {reactions.like}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reactionButton, { backgroundColor: t.background }, userReaction === 'heart' && styles.reactionButtonActive]}
            onPress={() => handleReaction('heart')}
          >
            <Heart
              size={16}
              color={userReaction === 'heart' ? colors.error[500] : t.textFaint}
              fill={userReaction === 'heart' ? colors.error[500] : 'transparent'}
            />
            {reactions.heart > 0 && (
              <Text style={[styles.reactionCount, userReaction === 'heart' && styles.reactionCountHeart]}>
                {reactions.heart}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.reactionButton, { backgroundColor: t.background }, userReaction === 'celebrate' && styles.reactionButtonActive]}
            onPress={() => handleReaction('celebrate')}
          >
            <PartyPopper
              size={16}
              color={userReaction === 'celebrate' ? colors.amber[500] : t.textFaint}
            />
            {reactions.celebrate > 0 && (
              <Text style={[styles.reactionCount, userReaction === 'celebrate' && styles.reactionCountCelebrate]}>
                {reactions.celebrate}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.rightActions}>
          {viewCount > 0 && (
            <View style={styles.viewCount}>
              <Eye size={14} color={t.textFaint} />
              <Text style={[styles.viewCountText, { color: t.textFaint }]}>{viewCount}</Text>
            </View>
          )}
          {/* Comments Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggleComments}
          >
          {loadingComments ? (
            <ActivityIndicator size="small" color={colors.slate[400]} />
          ) : (
            <>
              <MessageSquare
                size={18}
                color={showComments ? t.primary : t.textFaint}
              />
              <Text
                style={[
                  styles.actionText,
                  { color: t.textMuted },
                  showComments && [styles.actionTextActive, { color: t.primary }],
                ]}
              >
                {localCommentCount > 0 ? localCommentCount : ''} Comment
                {localCommentCount !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
        </View>
      </View>

      {/* Comments Section */}
      {showComments && (
        <View style={[styles.commentsSection, { backgroundColor: t.background, borderTopColor: t.borderSubtle }]}>
          {comments.map((comment) => (
            <View key={comment.id} style={[styles.comment, { borderBottomColor: t.borderSubtle }]}>
              <View style={[styles.commentAvatar, { backgroundColor: t.border }]}>
                <User size={14} color={t.textFaint} />
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: t.text }]}>
                    {comment.profiles?.[0]?.full_name || 'Unknown'}
                  </Text>
                  <Text style={[styles.commentTime, { color: t.textFaint }]}>
                    {formatTime(comment.created_at)}
                  </Text>
                </View>
                <LinkifiedText text={comment.content} style={[styles.commentText, { color: t.textSecondary }]} />
              </View>
            </View>
          ))}

          {/* Add Comment Input */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={[styles.commentInput, { backgroundColor: t.surface, borderColor: t.border, color: t.text }]}
              placeholder="Write a comment..."
              placeholderTextColor={t.textFaint}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!newComment.trim() || submittingComment) && styles.sendButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || submittingComment}
            >
              {submittingComment ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Send size={16} color={colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  pinnedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.amber[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.amber[100],
  },
  pinnedText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.amber[700],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  timestamp: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  menuButton: {
    padding: 8,
  },
  menu: {
    position: 'absolute',
    top: 56,
    right: 16,
    backgroundColor: colors.white,
    borderRadius: 8,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.slate[700],
  },
  menuItemTextDanger: {
    fontSize: 14,
    color: colors.error[600],
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.slate[700],
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  seeMoreButton: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  seeMoreText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  editInput: {
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 4,
  },
  postImage: {
    borderRadius: 8,
  },
  singleImage: {
    width: '100%',
    height: 200,
  },
  gridImage: {
    width: '48%',
    height: 120,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.slate[50],
  },
  reactionButtonActive: {
    backgroundColor: colors.brand[50],
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[500],
  },
  reactionCountActive: {
    color: colors.brand[600],
  },
  reactionCountHeart: {
    color: colors.error[500],
  },
  reactionCountCelebrate: {
    color: colors.amber[600],
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  viewCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCountText: {
    fontSize: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    color: colors.slate[500],
  },
  actionTextActive: {
    color: colors.brand[600],
  },
  commentsSection: {
    backgroundColor: colors.slate[50],
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  comment: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentContent: {
    flex: 1,
    marginLeft: 10,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[900],
  },
  commentTime: {
    fontSize: 11,
    color: colors.slate[400],
  },
  commentText: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: colors.white,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
});
