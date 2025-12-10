import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, Lock, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CreateGroupModal } from '../../components/groups/CreateGroupModal';
import type { Group as GroupType } from '../../types';

interface Group extends GroupType {
    _count?: {
        members: number;
    };
}

export default function Groups() {
    const { hub, currentRole } = useHub();
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (hub) {
            fetchGroups();
        }
    }, [hub]);

    const fetchGroups = async () => {
        if (!hub?.id) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('groups')
                .select(`
                    *,
                    members:group_members(count)
                `)
                .eq('hub_id', hub?.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform data to include member count
            const groupsWithCount = data?.map(g => ({
                ...g,
                _count: {
                    members: g.members?.[0]?.count || 0
                }
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
                    <h1 className="text-2xl font-semibold text-chalk-50">Groups</h1>
                    <p className="mt-2 text-sm text-slate-400">
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
                        <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
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
                            <div className="h-4 w-1/3 rounded bg-slate-700"></div>
                            <div className="mt-4 h-4 w-full rounded bg-slate-700"></div>
                            <div className="mt-2 h-4 w-2/3 rounded bg-slate-700"></div>
                        </div>
                    ))
                ) : filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                        <Link
                            key={group.id}
                            to={`/hub/${hub?.id}/groups/${group.id}`}
                            className="group card hover:border-mint-500/50 transition-all"
                        >
                            <div className="flex flex-1 flex-col p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-mint-500/10 border border-mint-500/30">
                                            <Users className="h-5 w-5 text-mint-400" />
                                        </div>
                                        <h3 className="ml-3 text-lg font-medium text-chalk-50 group-hover:text-mint-400 transition-colors">
                                            {group.name}
                                        </h3>
                                    </div>
                                    {group.type === 'private' ? (
                                        <Lock className="h-4 w-4 text-slate-500" />
                                    ) : (
                                        <Globe className="h-4 w-4 text-slate-500" />
                                    )}
                                </div>
                                <p className="mt-4 flex-1 text-sm text-slate-400 line-clamp-2">
                                    {group.description || 'No description provided.'}
                                </p>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center text-sm text-slate-400">
                                        <Users className="mr-1.5 h-4 w-4 flex-shrink-0 text-slate-500" />
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
                    <div className="col-span-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-slate-600" />
                        <h3 className="mt-2 text-sm font-medium text-chalk-50">No groups found</h3>
                        <p className="mt-1 text-sm text-slate-400">
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
