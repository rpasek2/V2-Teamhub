import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, Lock, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { CreateGroupModal } from '../../components/groups/CreateGroupModal';
import type { Group as GroupType } from '../../types';

interface Group extends GroupType {
    _count?: {
        members: number;
    };
    unread_count?: number;
}

export default function Groups() {
    const { hub, currentRole, getPermissionScope } = useHub();
    const { user } = useAuth();
    const { markAsViewed } = useNotifications();
    const groupsScope = getPermissionScope('groups');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Mark groups as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('groups');
        }
    }, [hub, markAsViewed]);

    useEffect(() => {
        if (hub) {
            fetchGroups();
        }
    }, [hub, groupsScope]);

    const fetchGroups = async () => {
        if (!hub?.id || !user?.id) return;
        setLoading(true);
        try {
            // For 'own' scope, first get the groups the user is a member of
            let memberGroupIds: string[] | null = null;
            if (groupsScope === 'own') {
                const { data: memberRows } = await supabase
                    .from('group_members')
                    .select('group_id')
                    .eq('user_id', user.id);
                memberGroupIds = (memberRows || []).map(r => r.group_id);
            }

            // Build groups query
            let groupsQuery = supabase
                .from('groups')
                .select(`
                    *,
                    members:group_members(count)
                `)
                .eq('hub_id', hub.id)
                .order('created_at', { ascending: false });

            // Filter to member-only groups for 'own' scope
            if (memberGroupIds !== null) {
                if (memberGroupIds.length === 0) {
                    // User is not a member of any groups
                    setGroups([]);
                    setLoading(false);
                    return;
                }
                groupsQuery = groupsQuery.in('id', memberGroupIds);
            }

            // Fetch groups and unread counts in parallel
            const [groupsResult, unreadResult] = await Promise.all([
                groupsQuery,
                supabase.rpc('get_group_unread_counts', {
                    p_user_id: user.id,
                    p_hub_id: hub.id
                })
            ]);

            if (groupsResult.error) throw groupsResult.error;

            // Create a map of group_id -> unread_count
            const unreadMap = new Map<string, number>();
            (unreadResult.data || []).forEach((item: { group_id: string; unread_count: number }) => {
                unreadMap.set(item.group_id, item.unread_count);
            });

            // Transform data to include member count and unread count
            const groupsWithCount = groupsResult.data?.map(g => ({
                ...g,
                _count: {
                    members: g.members?.[0]?.count || 0
                },
                unread_count: unreadMap.get(g.id) || 0
            })) || [];

            setGroups(groupsWithCount);
        } catch (error) {
            console.error('Error fetching groups:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const canCreateGroup = ['owner', 'admin', 'director', 'coach'].includes(currentRole || '');

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-heading">Groups</h1>
                    <p className="mt-2 text-sm text-muted">
                        Connect with your team, parents, and coaches in dedicated spaces.
                    </p>
                </div>
                {canCreateGroup && (
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="btn-primary"
                        >
                            <Plus className="h-4 w-4" />
                            Create Group
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center">
                <div className="relative w-full max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-muted" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Search groups..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    // Skeleton loading
                    [...Array(3)].map((_, i) => (
                        <div key={i} className="animate-pulse card p-6">
                            <div className="h-4 w-1/3 rounded bg-surface-active"></div>
                            <div className="mt-4 h-4 w-full rounded bg-surface-active"></div>
                            <div className="mt-2 h-4 w-2/3 rounded bg-surface-active"></div>
                        </div>
                    ))
                ) : filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                        <Link
                            key={group.id}
                            to={`/hub/${hub?.id}/groups/${group.id}`}
                            className="group card hover:border-accent-500 transition-all relative"
                        >
                            {/* Unread badge */}
                            {group.unread_count !== undefined && group.unread_count > 0 && (
                                <span className="absolute -top-2 -right-2 h-6 min-w-6 px-2 text-xs font-bold text-white bg-error-500 rounded-full flex items-center justify-center z-10">
                                    {group.unread_count > 99 ? '99+' : group.unread_count}
                                </span>
                            )}
                            <div className="flex flex-1 flex-col p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/15 border border-accent-500/20">
                                            <Users className="h-5 w-5 text-accent-600" />
                                        </div>
                                        <h3 className="ml-3 text-lg font-medium text-heading group-hover:text-accent-600 transition-colors">
                                            {group.name}
                                        </h3>
                                    </div>
                                    {group.type === 'private' ? (
                                        <Lock className="h-4 w-4 text-faint" />
                                    ) : (
                                        <Globe className="h-4 w-4 text-faint" />
                                    )}
                                </div>
                                <p className="mt-4 flex-1 text-sm text-muted line-clamp-2">
                                    {group.description || 'No description provided.'}
                                </p>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center text-sm text-muted">
                                        <Users className="mr-1.5 h-4 w-4 flex-shrink-0 text-faint" />
                                        {group._count?.members || 0} members
                                    </div>
                                    <span className="badge-slate">
                                        {group.type}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-faint" />
                        <h3 className="mt-2 text-sm font-medium text-heading">No groups found</h3>
                        <p className="mt-1 text-sm text-muted">
                            {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating a new group.'}
                        </p>
                        {canCreateGroup && !searchQuery && (
                            <div className="mt-6">
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="btn-primary"
                                >
                                    <Plus className="h-4 w-4" />
                                    Create Group
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <CreateGroupModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onGroupCreated={fetchGroups}
            />
        </div>
    );
}
