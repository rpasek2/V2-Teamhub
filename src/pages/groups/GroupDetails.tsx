import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CreatePostModal } from '../../components/groups/CreatePostModal';
import { PostCard } from '../../components/groups/PostCard';
import type { Group, Post } from '../../types';

export default function GroupDetails() {
    const { groupId } = useParams<{ groupId: string }>();
    const { user, currentRole } = useHub();
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (groupId && user) {
            fetchGroupDetails();
            fetchPosts();
            checkMembership();
        }
    }, [groupId, user]);

    const fetchGroupDetails = async () => {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (error) console.error('Error fetching group:', error);
        else setGroup(data);
    };

    const checkMembership = async () => {
        if (!user || !groupId) return;
        const { data, error } = await supabase
            .from('group_members')
            .select('role')
            .eq('group_id', groupId)
            .eq('user_id', user.id)
            .single();

        if (!error && data) {
            setIsMember(true);
            setIsAdmin(data.role === 'admin');
        } else {
            // Check if hub staff (owner/admin/director/coach) - they are effectively admins
            if (['owner', 'admin', 'director', 'coach'].includes(currentRole || '')) {
                setIsAdmin(true);
                setIsMember(true); // Staff can see everything
            }
        }
    };

    const fetchPosts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('posts')
            .select(`
                *,
                profiles (
                    full_name,
                    avatar_url
                ),
                comments:comments(count)
            `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            // Transform to include comment count
            const postsWithCount = data?.map(p => ({
                ...p,
                _count: {
                    comments: p.comments?.[0]?.count || 0
                }
            })) || [];
            setPosts(postsWithCount as any);
        }
        setLoading(false);
    };

    const handleJoinGroup = async () => {
        if (!user || !groupId) return;
        try {
            const { error } = await supabase
                .from('group_members')
                .insert({
                    group_id: groupId,
                    user_id: user.id,
                    role: 'member'
                });

            if (error) throw error;
            setIsMember(true);
            fetchPosts(); // Refresh posts as they might be hidden for non-members
        } catch (error) {
            console.error('Error joining group:', error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm('Are you sure you want to delete this post?')) return;
        try {
            const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId);

            if (error) throw error;
            setPosts(prev => prev.filter(p => p.id !== postId));
        } catch (error) {
            console.error('Error deleting post:', error);
        }
    };

    if (!group) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <Link to="../groups" className="mr-4 text-gray-500 hover:text-gray-700">
                                    <ArrowLeft className="h-6 w-6" />
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                                    <p className="text-sm text-gray-500">{group.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4">
                                {!isMember && (
                                    <button
                                        onClick={handleJoinGroup}
                                        className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
                                    >
                                        Join Group
                                    </button>
                                )}
                                {isMember && (
                                    <button
                                        onClick={() => setIsCreatePostOpen(true)}
                                        className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Post
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow">
                                <div className="flex space-x-3">
                                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                                    <div className="flex-1 space-y-2 py-1">
                                        <div className="h-4 w-1/4 rounded bg-gray-200"></div>
                                        <div className="h-4 w-1/2 rounded bg-gray-200"></div>
                                    </div>
                                </div>
                                <div className="mt-4 space-y-2">
                                    <div className="h-4 rounded bg-gray-200"></div>
                                    <div className="h-4 rounded bg-gray-200"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : posts.length > 0 ? (
                    <div className="space-y-6">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                onDelete={() => handleDeletePost(post.id)}
                                currentUserId={user?.id || ''}
                                isAdmin={isAdmin}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-lg shadow">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No posts yet</h3>
                        <p className="mt-1 text-sm text-gray-500">Be the first to post in this group!</p>
                    </div>
                )}
            </div>

            {groupId && (
                <CreatePostModal
                    isOpen={isCreatePostOpen}
                    onClose={() => setIsCreatePostOpen(false)}
                    groupId={groupId}
                    onPostCreated={fetchPosts}
                />
            )}
        </div>
    );
}
