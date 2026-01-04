import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, Users, Settings, Lock, Globe, Image, FileText, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CreatePostModal } from '../../components/groups/CreatePostModal';
import { PostCard } from '../../components/groups/PostCard';
import { GroupPhotos } from '../../components/groups/GroupPhotos';
import { GroupFiles } from '../../components/groups/GroupFiles';
import { GroupMembers } from '../../components/groups/GroupMembers';
import { GroupSettings } from '../../components/groups/GroupSettings';
import type { Group, Post } from '../../types';

type TabType = 'posts' | 'photos' | 'files' | 'members' | 'settings';

export default function GroupDetails() {
    const { groupId } = useParams<{ groupId: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user, currentRole } = useHub();
    const [group, setGroup] = useState<Group | null>(null);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [memberCount, setMemberCount] = useState(0);
    const [activeTab, setActiveTab] = useState<TabType>('posts');
    const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null);
    const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (groupId && user) {
            fetchGroupDetails();
            fetchPosts();
            checkMembership();
            fetchMemberCount();
            markGroupAsViewed();
        }
    }, [groupId, user]);

    // Mark the group as viewed to clear unread count
    const markGroupAsViewed = async () => {
        if (!groupId || !user?.id) return;

        const { error } = await supabase
            .from('group_members')
            .update({ last_viewed_at: new Date().toISOString() })
            .eq('group_id', groupId)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error marking group as viewed:', error);
        }
    };

    // Handle scrolling to highlighted post from URL query param
    useEffect(() => {
        const postId = searchParams.get('post');
        if (postId && posts.length > 0 && !loading) {
            setHighlightedPostId(postId);
            // Scroll to the post after a brief delay to ensure DOM is ready
            setTimeout(() => {
                const postElement = postRefs.current[postId];
                if (postElement) {
                    postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            // Clear the highlight after 3 seconds
            setTimeout(() => {
                setHighlightedPostId(null);
                // Remove the query param from URL
                setSearchParams({}, { replace: true });
            }, 3000);
        }
    }, [posts, loading, searchParams]);

    const fetchGroupDetails = async () => {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', groupId)
            .single();

        if (error) console.error('Error fetching group:', error);
        else setGroup(data);
    };

    const fetchMemberCount = async () => {
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
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching posts:', error);
        } else {
            // Transform to include comment count
            const postsWithCount = data?.map(p => ({
                ...p,
                attachments: p.attachments || [],
                is_pinned: p.is_pinned || false,
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
            setMemberCount(prev => prev + 1);
            fetchPosts();
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

    const handlePinToggle = (postId: string, isPinned: boolean) => {
        // Re-sort posts with pinned at top
        setPosts(prev => {
            const updated = prev.map(p => p.id === postId ? { ...p, is_pinned: isPinned } : p);
            return updated.sort((a, b) => {
                if (a.is_pinned && !b.is_pinned) return -1;
                if (!a.is_pinned && b.is_pinned) return 1;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        });
    };

    const tabs = [
        { id: 'posts' as TabType, label: 'Posts', icon: MessageSquare },
        { id: 'photos' as TabType, label: 'Photos', icon: Image },
        { id: 'files' as TabType, label: 'Files', icon: FileText },
        { id: 'members' as TabType, label: 'Members', icon: Users, count: memberCount },
        ...(isAdmin ? [{ id: 'settings' as TabType, label: 'Settings', icon: Settings }] : []),
    ];

    if (!group) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-pulse flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200" />
                    <div className="h-4 w-32 rounded bg-slate-200" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    {/* Top row */}
                    <div className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link
                                    to="../groups"
                                    className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </Link>
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
                                        <Users className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-xl font-bold text-slate-900">{group.name}</h1>
                                            {group.type === 'private' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">
                                                    <Lock className="h-3 w-3" />
                                                    Private
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                                                    <Globe className="h-3 w-3" />
                                                    Public
                                                </span>
                                            )}
                                        </div>
                                        {group.description && (
                                            <p className="text-sm text-slate-500 mt-0.5 max-w-md truncate">{group.description}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {!isMember && (
                                    <button
                                        onClick={handleJoinGroup}
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all hover:shadow-brand-500/40"
                                    >
                                        <Users className="h-4 w-4" />
                                        Join Group
                                    </button>
                                )}
                                {isMember && activeTab === 'posts' && (
                                    <button
                                        onClick={() => setIsCreatePostOpen(true)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all hover:shadow-brand-500/40"
                                    >
                                        <Plus className="h-4 w-4" />
                                        New Post
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 -mb-px overflow-x-auto scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-brand-600 text-brand-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                        activeTab === tab.id
                                            ? 'bg-brand-100 text-brand-700'
                                            : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'posts' && (
                    <div className="max-w-2xl mx-auto">
                        {loading ? (
                            <div className="space-y-6">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="animate-pulse rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                                        <div className="flex gap-3">
                                            <div className="h-11 w-11 rounded-full bg-slate-200"></div>
                                            <div className="flex-1 space-y-2 py-1">
                                                <div className="h-4 w-1/4 rounded bg-slate-200"></div>
                                                <div className="h-3 w-1/6 rounded bg-slate-200"></div>
                                            </div>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <div className="h-4 rounded bg-slate-200"></div>
                                            <div className="h-4 rounded bg-slate-200 w-5/6"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : posts.length > 0 ? (
                            <div className="space-y-6">
                                {posts.map((post) => (
                                    <div
                                        key={post.id}
                                        ref={(el) => { postRefs.current[post.id] = el; }}
                                        className={`transition-all duration-500 rounded-2xl ${
                                            highlightedPostId === post.id
                                                ? 'ring-2 ring-brand-500 ring-offset-2'
                                                : ''
                                        }`}
                                    >
                                        <PostCard
                                            post={post}
                                            onDelete={() => handleDeletePost(post.id)}
                                            onPinToggle={handlePinToggle}
                                            currentUserId={user?.id || ''}
                                            isAdmin={isAdmin}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-slate-200">
                                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto">
                                    <MessageSquare className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-slate-900">No posts yet</h3>
                                <p className="mt-1 text-sm text-slate-500">Be the first to share something with the group!</p>
                                {isMember && (
                                    <button
                                        onClick={() => setIsCreatePostOpen(true)}
                                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-700 transition-all"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Create First Post
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'photos' && groupId && (
                    <GroupPhotos groupId={groupId} posts={posts} />
                )}

                {activeTab === 'files' && groupId && (
                    <GroupFiles groupId={groupId} posts={posts} />
                )}

                {activeTab === 'members' && groupId && (
                    <GroupMembers groupId={groupId} isAdmin={isAdmin} onMemberCountChange={setMemberCount} />
                )}

                {activeTab === 'settings' && groupId && group && (
                    <GroupSettings group={group} onUpdate={fetchGroupDetails} />
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
