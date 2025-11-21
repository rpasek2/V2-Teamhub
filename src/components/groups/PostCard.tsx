import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Trash2, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

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

interface Post {
    id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
    comments?: Comment[];
    _count?: {
        comments: number;
    };
}

interface PostCardProps {
    post: Post;
    onDelete: () => void;
    currentUserId: string;
    isAdmin: boolean;
}

export function PostCard({ post, onDelete, currentUserId, isAdmin }: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loadingComments, setLoadingComments] = useState(false);
    const [submittingComment, setSubmittingComment] = useState(false);

    const canDelete = isAdmin || post.user_id === currentUserId;

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
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6">
                <div className="flex space-x-3">
                    <div className="flex-shrink-0">
                        {post.profiles?.avatar_url ? (
                            <img
                                className="h-10 w-10 rounded-full"
                                src={post.profiles.avatar_url}
                                alt=""
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <User className="h-6 w-6 text-gray-400" />
                            </div>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                            {post.profiles?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-500">
                            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                    </div>
                    {canDelete && (
                        <div className="flex-shrink-0 self-center flex">
                            <button
                                onClick={onDelete}
                                className="-m-2 p-2 text-gray-400 hover:text-red-500"
                            >
                                <span className="sr-only">Delete</span>
                                <Trash2 className="h-5 w-5" />
                            </button>
                        </div>
                    )}
                </div>
                <div className="mt-4 text-sm text-gray-700 space-y-4">
                    <p className="whitespace-pre-wrap">{post.content}</p>
                    {post.image_url && (
                        <div className="mt-2">
                            <img
                                src={post.image_url}
                                alt="Post attachment"
                                className="rounded-lg max-h-96 object-cover"
                            />
                        </div>
                    )}
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={fetchComments}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                    >
                        <MessageSquare className="mr-1.5 h-4 w-4" />
                        {post._count?.comments || 0} Comments
                    </button>
                </div>
            </div>

            {showComments && (
                <div className="bg-gray-50 px-4 pb-4 sm:px-6 border-t border-gray-200">
                    <div className="space-y-4 mt-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex space-x-3">
                                <div className="flex-shrink-0">
                                    {comment.profiles?.avatar_url ? (
                                        <img
                                            className="h-6 w-6 rounded-full"
                                            src={comment.profiles.avatar_url}
                                            alt=""
                                        />
                                    ) : (
                                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                            <User className="h-4 w-4 text-gray-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 bg-white rounded-lg px-4 py-2 shadow-sm">
                                    <div className="flex justify-between">
                                        <span className="text-xs font-medium text-gray-900">
                                            {comment.profiles?.full_name}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                    {(isAdmin || comment.user_id === currentUserId) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="text-xs text-red-400 hover:text-red-600 mt-1"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
                            />
                            <button
                                type="submit"
                                disabled={submittingComment || !newComment.trim()}
                                className="inline-flex items-center rounded-md border border-transparent bg-brand-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
                            >
                                Post
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
