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
        <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Connect with your team, parents, and coaches in dedicated spaces.
                    </p>
                </div>
                {canCreateGroup && (
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Create Group
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-6 flex items-center">
                <div className="relative w-full max-w-md">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-brand-500 focus:ring-brand-500 sm:text-sm"
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
                        <div key={i} className="animate-pulse rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="h-4 w-1/3 rounded bg-gray-200"></div>
                            <div className="mt-4 h-4 w-full rounded bg-gray-200"></div>
                            <div className="mt-2 h-4 w-2/3 rounded bg-gray-200"></div>
                        </div>
                    ))
                ) : filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                        <Link
                            key={group.id}
                            to={`/hub/${hub?.id}/groups/${group.id}`}
                            className="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm hover:border-brand-300 hover:shadow-md transition-all"
                        >
                            <div className="flex flex-1 flex-col p-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50">
                                            <Users className="h-6 w-6 text-brand-600" />
                                        </div>
                                        <h3 className="ml-3 text-lg font-medium text-gray-900 group-hover:text-brand-600">
                                            {group.name}
                                        </h3>
                                    </div>
                                    {group.type === 'private' ? (
                                        <Lock className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <Globe className="h-4 w-4 text-gray-400" />
                                    )}
                                </div>
                                <p className="mt-4 flex-1 text-sm text-gray-500 line-clamp-2">
                                    {group.description || 'No description provided.'}
                                </p>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center text-sm text-gray-500">
                                        <Users className="mr-1.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                                        {group._count?.members || 0} members
                                    </div>
                                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                                        {group.type}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                        <Users className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No groups found</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            {searchQuery ? 'Try adjusting your search terms.' : 'Get started by creating a new group.'}
                        </p>
                        {canCreateGroup && !searchQuery && (
                            <div className="mt-6">
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="inline-flex items-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                >
                                    <Plus className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
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
