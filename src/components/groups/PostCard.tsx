import { useState, useEffect, memo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Trash2, User, Pin, MoreHorizontal, Heart, ThumbsUp, PartyPopper, PinOff, Eye } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { PollDisplay, SignupDisplay, RsvpDisplay, ImageGallery, FileList } from './attachments';
import type { Post, PostAttachment } from '../../types';

type ReactionType = 'like' | 'heart' | 'celebrate';

interface Comment {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface PostCardProps {
    post: Post;
    onDelete: () => void;
    onPinToggle?: (postId: string, isPinned: boolean) => void;
    currentUserId: string;
    isAdmin: boolean;
}

export const PostCard = memo(function PostCard({ post, onDelete, onPinToggle, currentUserId, isAdmin }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [_loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [isPinned, setIsPinned] = useState(post.is_pinned);
    const [reactions, setReactions] = useState<{ like: number; heart: number; celebrate: number }>({ like: 0, heart: 0, celebrate: 0 });
    const [userReaction, setUserReaction] = useState<string | null>(null);
    const [viewCount, setViewCount] = useState(0);

    const canDelete = isAdmin || post.user_id === currentUserId;
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

            // Count reactions by type
            const counts = { like: 0, heart: 0, celebrate: 0 };
            let myReaction: string | null = null;

            data?.forEach(r => {
                counts[r.reaction_type as ReactionType]++;
                if (r.user_id === currentUserId) {
                    myReaction = r.reaction_type;
                }
            });

            setReactions(counts);
            setUserReaction(myReaction);
        } catch (err) {
            // Table might not exist yet - silently ignore
        }
    };

    const handleReaction = async (type: ReactionType) => {
        if (!currentUserId) return;

        try {
            if (userReaction === type) {
                // Remove reaction
                await supabase
                    .from('post_reactions')
                    .delete()
                    .eq('post_id', post.id)
                    .eq('user_id', currentUserId);

                setReactions(prev => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }));
                setUserReaction(null);
            } else {
                if (userReaction) {
                    // Update existing reaction
                    await supabase
                        .from('post_reactions')
                        .update({ reaction_type: type })
                        .eq('post_id', post.id)
                        .eq('user_id', currentUserId);

                    setReactions(prev => ({
                        ...prev,
                        [userReaction as ReactionType]: Math.max(0, prev[userReaction as ReactionType] - 1),
                        [type]: prev[type] + 1
                    }));
                } else {
                    // Add new reaction
                    await supabase
                        .from('post_reactions')
                        .insert({
                            post_id: post.id,
                            user_id: currentUserId,
                            reaction_type: type
                        });

                    setReactions(prev => ({ ...prev, [type]: prev[type] + 1 }));
                }
                setUserReaction(type);
            }
        } catch (err) {
            console.error('Error handling reaction:', err);
        }
    };

    // Parse attachments - handle both old and new format
    const attachments: PostAttachment[] = Array.isArray(post.attachments) ? post.attachments : [];

    // Support legacy image_url field
    const legacyImageUrls = post.image_url ? [post.image_url] : [];
    const imageAttachment = attachments.find(a => a.type === 'images');
    const allImageUrls = imageAttachment?.type === 'images'
        ? [...imageAttachment.urls, ...legacyImageUrls]
        : legacyImageUrls;

    const fetchComments = async () => {
        if (showComments) {
            setShowComments(false);
            return;
        }

        setLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setComments(data as any || []);
            setShowComments(true);
        } catch (error) {
            console.error('Error fetching comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmittingComment(true);
        try {
            const { error } = await supabase
                .from('comments')
                .insert({
                    post_id: post.id,
                    user_id: currentUserId,
                    content: newComment
                });

            if (error) throw error;

            setNewComment('');
            // Refresh comments
            const { data } = await supabase
                .from('comments')
                .select(`
                    *,
                    profiles (
                        full_name,
                        avatar_url
                    )
                `)
                .eq('post_id', post.id)
                .order('created_at', { ascending: true });

            setComments(data as any || []);
        } catch (error) {
            console.error('Error adding comment:', error);
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId);

            if (error) throw error;
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Error deleting comment:', error);
        }
    };

    return (
        <div className="bg-surface rounded-2xl border border-line shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-5 pt-5">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        {post.profiles?.avatar_url ? (
                            <img
                                className="h-11 w-11 rounded-full ring-2 ring-surface"
                                src={post.profiles.avatar_url}
                                alt=""
                                loading="lazy"
                            />
                        ) : (
                            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center ring-2 ring-surface">
                                <span className="text-white font-semibold text-sm">
                                    {post.profiles?.full_name?.charAt(0) || 'U'}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-heading">
                                {post.profiles?.full_name || 'Unknown User'}
                            </p>
                            {isPinned && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 text-xs font-medium shadow-sm">
                                    <Pin className="h-3 w-3" />
                                    Pinned
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                    {(canDelete || canPin) && (
                        <div className="relative">
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-1.5 rounded-full text-faint hover:text-subtle hover:bg-surface-hover transition-colors"
                            >
                                <MoreHorizontal className="h-5 w-5" />
                            </button>
                            {showMenu && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowMenu(false)}
                                    />
                                    <div className="absolute right-0 mt-1 w-44 bg-surface rounded-xl shadow-xl border border-line py-1.5 z-20">
                                        {canPin && (
                                            <button
                                                onClick={async () => {
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
                                                className="w-full px-4 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2.5"
                                            >
                                                {isPinned ? (
                                                    <>
                                                        <PinOff className="h-4 w-4 text-muted" />
                                                        Unpin Post
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pin className="h-4 w-4 text-amber-500" />
                                                        Pin Post
                                                    </>
                                                )}
                                            </button>
                                        )}
                                        {canDelete && (
                                            <>
                                                {canPin && <div className="my-1 border-t border-line" />}
                                                <button
                                                    onClick={() => {
                                                        setShowMenu(false);
                                                        onDelete();
                                                    }}
                                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-500/10 flex items-center gap-2.5"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    Delete Post
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4">
                {/* Text content */}
                <p className="text-heading whitespace-pre-wrap leading-relaxed">{post.content}</p>

                {/* Image Gallery */}
                {allImageUrls.length > 0 && (
                    <ImageGallery urls={allImageUrls} />
                )}

                {/* Files */}
                {attachments.filter(a => a.type === 'files').map((attachment) => (
                    attachment.type === 'files' && (
                        <FileList key={`files-${attachment.files.map(f => f.name).join('-')}`} files={attachment.files} />
                    )
                ))}

                {/* Poll */}
                {attachments.filter(a => a.type === 'poll').map((attachment) => (
                    attachment.type === 'poll' && (
                        <PollDisplay
                            key={`poll-${attachment.question}`}
                            postId={post.id}
                            question={attachment.question}
                            options={attachment.options}
                            settings={attachment.settings}
                        />
                    )
                ))}

                {/* Sign-Up */}
                {attachments.filter(a => a.type === 'signup').map((attachment) => (
                    attachment.type === 'signup' && (
                        <SignupDisplay
                            key={`signup-${attachment.title}`}
                            postId={post.id}
                            title={attachment.title}
                            description={attachment.description}
                            slots={attachment.slots}
                            settings={attachment.settings}
                        />
                    )
                ))}

                {/* RSVP */}
                {attachments.filter(a => a.type === 'rsvp').map((attachment) => (
                    attachment.type === 'rsvp' && (
                        <RsvpDisplay
                            key={`rsvp-${attachment.title}`}
                            postId={post.id}
                            title={attachment.title}
                            date={attachment.date}
                            time={attachment.time}
                            location={attachment.location}
                        />
                    )
                ))}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-gradient-to-b from-surface-alt/80 to-surface-hover/50 border-t border-line">
                <div className="flex items-center justify-between">
                    {/* Reactions */}
                    <div className="flex items-center gap-0.5">
                        <button
                            onClick={() => handleReaction('like')}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                                userReaction === 'like'
                                    ? 'bg-blue-500/10 text-blue-600 shadow-sm'
                                    : 'hover:bg-surface-hover text-faint hover:text-blue-600'
                            }`}
                            title="Like"
                        >
                            <ThumbsUp className={`h-[18px] w-[18px] transition-transform group-hover:scale-110 ${userReaction === 'like' ? 'fill-current' : ''}`} />
                            {reactions.like > 0 && <span className="text-xs font-semibold">{reactions.like}</span>}
                        </button>
                        <button
                            onClick={() => handleReaction('heart')}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                                userReaction === 'heart'
                                    ? 'bg-pink-500/10 text-pink-500 shadow-sm'
                                    : 'hover:bg-surface-hover text-faint hover:text-pink-500'
                            }`}
                            title="Love"
                        >
                            <Heart className={`h-[18px] w-[18px] transition-transform group-hover:scale-110 ${userReaction === 'heart' ? 'fill-current' : ''}`} />
                            {reactions.heart > 0 && <span className="text-xs font-semibold">{reactions.heart}</span>}
                        </button>
                        <button
                            onClick={() => handleReaction('celebrate')}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all ${
                                userReaction === 'celebrate'
                                    ? 'bg-amber-500/10 text-amber-600 shadow-sm'
                                    : 'hover:bg-surface-hover text-faint hover:text-amber-600'
                            }`}
                            title="Celebrate"
                        >
                            <PartyPopper className={`h-[18px] w-[18px] transition-transform group-hover:scale-110`} />
                            {reactions.celebrate > 0 && <span className="text-xs font-semibold">{reactions.celebrate}</span>}
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {viewCount > 0 && (
                            <span className="flex items-center gap-1 px-2 py-1.5 text-xs text-faint">
                                <Eye className="h-3.5 w-3.5" /> {viewCount}
                            </span>
                        )}
                        {/* Comments button */}
                        <button
                            onClick={fetchComments}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all ${
                                showComments
                                    ? 'bg-accent-500/15 text-accent-600 shadow-sm'
                                    : 'text-muted hover:bg-surface-hover hover:text-accent-600'
                            }`}
                        >
                            <MessageSquare className="h-[18px] w-[18px]" />
                            <span className="font-medium">{post._count?.comments || 0}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="px-5 pb-5 border-t border-line">
                    <div className="space-y-4 pt-4">
                        {comments.length === 0 ? (
                            <p className="text-sm text-muted text-center py-2">No comments yet. Be the first!</p>
                        ) : (
                            comments.map((comment) => (
                                <div key={comment.id} className="flex gap-3">
                                    <div className="flex-shrink-0">
                                        {comment.profiles?.avatar_url ? (
                                            <img
                                                className="h-8 w-8 rounded-full"
                                                src={comment.profiles.avatar_url}
                                                alt=""
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="h-8 w-8 rounded-full bg-surface-active flex items-center justify-center">
                                                <User className="h-4 w-4 text-muted" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="bg-surface-hover rounded-2xl px-4 py-2.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-semibold text-heading">
                                                    {comment.profiles?.full_name || 'Unknown'}
                                                </span>
                                                <span className="text-xs text-faint">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-body mt-0.5">{comment.content}</p>
                                        </div>
                                        {(isAdmin || comment.user_id === currentUserId) && (
                                            <button
                                                onClick={() => handleDeleteComment(comment.id)}
                                                className="text-xs text-faint hover:text-red-500 mt-1 ml-4"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}

                        {/* Add Comment Form */}
                        <form onSubmit={handleAddComment} className="flex gap-3 pt-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-heading shadow-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-shadow"
                            />
                            <button
                                type="submit"
                                disabled={submittingComment || !newComment.trim()}
                                className="px-5 py-2 rounded-full bg-accent-600 text-white text-sm font-medium hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Post
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
});
