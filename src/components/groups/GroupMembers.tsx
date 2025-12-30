import { useState, useEffect } from 'react';
import { Users, Shield, UserMinus, UserPlus, Search, Crown, Loader2, User, MoreHorizontal, X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { formatDistanceToNow } from 'date-fns';
import { createPortal } from 'react-dom';

interface GroupMembersProps {
    groupId: string;
    isAdmin: boolean;
    onMemberCountChange: (count: number) => void;
}

interface GroupMember {
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
        email: string;
    };
}

interface HubMember {
    user_id: string;
    profiles: {
        full_name: string;
        avatar_url: string | null;
        email: string;
    };
}

export function GroupMembers({ groupId, isAdmin, onMemberCountChange }: GroupMembersProps) {
    const { user, hub } = useHub();
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showMenu, setShowMenu] = useState<string | null>(null);

    // Add member modal state
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [hubMembers, setHubMembers] = useState<HubMember[]>([]);
    const [loadingHubMembers, setLoadingHubMembers] = useState(false);
    const [addMemberSearch, setAddMemberSearch] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
    const [addingMembers, setAddingMembers] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, [groupId]);

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('group_members')
                .select('user_id, role, joined_at, profiles(full_name, avatar_url, email)')
                .eq('group_id', groupId)
                .order('role', { ascending: true })
                .order('joined_at', { ascending: true });

            if (error) throw error;
            setMembers(data as any || []);
            onMemberCountChange(data?.length || 0);
        } catch (err) {
            console.error('Error fetching members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePromoteToAdmin = async (userId: string) => {
        if (!isAdmin) return;
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('group_members')
                .update({ role: 'admin' })
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'admin' } : m));
        } catch (err) {
            console.error('Error promoting member:', err);
        } finally {
            setActionLoading(null);
            setShowMenu(null);
        }
    };

    const handleDemoteToMember = async (userId: string) => {
        if (!isAdmin) return;
        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('group_members')
                .update({ role: 'member' })
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;
            setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: 'member' } : m));
        } catch (err) {
            console.error('Error demoting member:', err);
        } finally {
            setActionLoading(null);
            setShowMenu(null);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!isAdmin || userId === user?.id) return;
        if (!confirm('Are you sure you want to remove this member from the group?')) return;

        setActionLoading(userId);
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

            if (error) throw error;
            setMembers(prev => prev.filter(m => m.user_id !== userId));
            onMemberCountChange(members.length - 1);
        } catch (err) {
            console.error('Error removing member:', err);
        } finally {
            setActionLoading(null);
            setShowMenu(null);
        }
    };

    const openAddMemberModal = async () => {
        setShowAddMemberModal(true);
        setSelectedMembers(new Set());
        setAddMemberSearch('');
        await fetchHubMembers();
    };

    const fetchHubMembers = async () => {
        if (!hub) return;
        setLoadingHubMembers(true);

        try {
            const { data, error } = await supabase
                .from('hub_members')
                .select('user_id, profiles(full_name, avatar_url, email)')
                .eq('hub_id', hub.id);

            if (error) throw error;

            // Filter out members already in the group
            const existingMemberIds = new Set(members.map(m => m.user_id));
            const availableMembers = (data || []).filter(
                (m: any) => !existingMemberIds.has(m.user_id)
            );

            setHubMembers(availableMembers as any);
        } catch (err) {
            console.error('Error fetching hub members:', err);
        } finally {
            setLoadingHubMembers(false);
        }
    };

    const toggleMemberSelection = (userId: string) => {
        setSelectedMembers(prev => {
            const newSet = new Set(prev);
            if (newSet.has(userId)) {
                newSet.delete(userId);
            } else {
                newSet.add(userId);
            }
            return newSet;
        });
    };

    const handleAddSelectedMembers = async () => {
        if (selectedMembers.size === 0) return;
        setAddingMembers(true);

        try {
            const membersToAdd = Array.from(selectedMembers).map(userId => ({
                group_id: groupId,
                user_id: userId,
                role: 'member' as const
            }));

            const { error } = await supabase
                .from('group_members')
                .insert(membersToAdd);

            if (error) throw error;

            // Refresh members list
            await fetchMembers();
            setShowAddMemberModal(false);
        } catch (err) {
            console.error('Error adding members:', err);
        } finally {
            setAddingMembers(false);
        }
    };

    const filteredHubMembers = hubMembers.filter(member =>
        member.profiles?.full_name?.toLowerCase().includes(addMemberSearch.toLowerCase()) ||
        member.profiles?.email?.toLowerCase().includes(addMemberSearch.toLowerCase())
    );

    const filteredMembers = members.filter(member =>
        member.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const admins = filteredMembers.filter(m => m.role === 'admin');
    const regularMembers = filteredMembers.filter(m => m.role === 'member');

    if (loading) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                    <span className="text-slate-500">Loading members...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">Group Members</h3>
                            <p className="text-sm text-slate-500">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={openAddMemberModal}
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Add Member
                        </button>
                    )}
                </div>

                {/* Search */}
                <div className="mt-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search members..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                    />
                </div>
            </div>

            {/* Admins Section */}
            {admins.length > 0 && (
                <div className="border-b border-slate-100">
                    <div className="px-6 py-3 bg-amber-50/50">
                        <div className="flex items-center gap-2 text-amber-700">
                            <Crown className="h-4 w-4" />
                            <span className="text-sm font-semibold">Admins</span>
                            <span className="text-xs bg-amber-100 px-2 py-0.5 rounded-full">{admins.length}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {admins.map((member) => (
                            <MemberRow
                                key={member.user_id}
                                member={member}
                                currentUserId={user?.id}
                                isAdmin={isAdmin}
                                actionLoading={actionLoading}
                                showMenu={showMenu}
                                setShowMenu={setShowMenu}
                                onPromote={handlePromoteToAdmin}
                                onDemote={handleDemoteToMember}
                                onRemove={handleRemoveMember}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Regular Members Section */}
            {regularMembers.length > 0 && (
                <div>
                    <div className="px-6 py-3 bg-slate-50/50">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Users className="h-4 w-4" />
                            <span className="text-sm font-semibold">Members</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{regularMembers.length}</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-50">
                        {regularMembers.map((member) => (
                            <MemberRow
                                key={member.user_id}
                                member={member}
                                currentUserId={user?.id}
                                isAdmin={isAdmin}
                                actionLoading={actionLoading}
                                showMenu={showMenu}
                                setShowMenu={setShowMenu}
                                onPromote={handlePromoteToAdmin}
                                onDemote={handleDemoteToMember}
                                onRemove={handleRemoveMember}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {filteredMembers.length === 0 && (
                <div className="p-8 text-center">
                    <p className="text-slate-500">No members found</p>
                </div>
            )}

            {/* Add Member Modal */}
            {showAddMemberModal && createPortal(
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddMemberModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                                        <UserPlus className="h-5 w-5 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">Add Members</h3>
                                        <p className="text-sm text-slate-500">Select hub members to add</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowAddMemberModal(false)}
                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Search */}
                            <div className="px-6 py-4 border-b border-slate-100">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={addMemberSearch}
                                        onChange={(e) => setAddMemberSearch(e.target.value)}
                                        placeholder="Search hub members..."
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Member List */}
                            <div className="max-h-80 overflow-y-auto">
                                {loadingHubMembers ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                                    </div>
                                ) : filteredHubMembers.length === 0 ? (
                                    <div className="py-12 text-center">
                                        <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">No members available</p>
                                        <p className="text-sm text-slate-400 mt-1">
                                            {hubMembers.length === 0
                                                ? 'All hub members are already in this group'
                                                : 'No members match your search'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-50">
                                        {filteredHubMembers.map((member) => (
                                            <button
                                                key={member.user_id}
                                                onClick={() => toggleMemberSelection(member.user_id)}
                                                className="w-full flex items-center gap-4 px-6 py-3 hover:bg-slate-50 transition-colors text-left"
                                            >
                                                {/* Avatar */}
                                                {member.profiles?.avatar_url ? (
                                                    <img
                                                        src={member.profiles.avatar_url}
                                                        alt=""
                                                        loading="lazy"
                                                        className="h-10 w-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                                                        <span className="text-white font-semibold text-sm">
                                                            {member.profiles?.full_name?.charAt(0) || 'U'}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-900 truncate">
                                                        {member.profiles?.full_name || 'Unknown User'}
                                                    </p>
                                                    <p className="text-sm text-slate-500 truncate">
                                                        {member.profiles?.email}
                                                    </p>
                                                </div>

                                                {/* Checkbox */}
                                                <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                    selectedMembers.has(member.user_id)
                                                        ? 'bg-brand-600 border-brand-600'
                                                        : 'border-slate-300'
                                                }`}>
                                                    {selectedMembers.has(member.user_id) && (
                                                        <Check className="h-3.5 w-3.5 text-white" />
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-slate-500">
                                        {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setShowAddMemberModal(false)}
                                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddSelectedMembers}
                                            disabled={selectedMembers.size === 0 || addingMembers}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {addingMembers ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <UserPlus className="h-4 w-4" />
                                            )}
                                            Add to Group
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

interface MemberRowProps {
    member: GroupMember;
    currentUserId?: string;
    isAdmin: boolean;
    actionLoading: string | null;
    showMenu: string | null;
    setShowMenu: (id: string | null) => void;
    onPromote: (userId: string) => void;
    onDemote: (userId: string) => void;
    onRemove: (userId: string) => void;
}

function MemberRow({ member, currentUserId, isAdmin, actionLoading, showMenu, setShowMenu, onPromote, onDemote, onRemove }: MemberRowProps) {
    const isCurrentUser = member.user_id === currentUserId;

    return (
        <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors">
            {/* Avatar */}
            <div className="flex-shrink-0">
                {member.profiles?.avatar_url ? (
                    <img
                        src={member.profiles.avatar_url}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 rounded-full ring-2 ring-white"
                    />
                ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center ring-2 ring-white">
                        <span className="text-white font-semibold text-sm">
                            {member.profiles?.full_name?.charAt(0) || 'U'}
                        </span>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">
                        {member.profiles?.full_name || 'Unknown User'}
                    </p>
                    {isCurrentUser && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">You</span>
                    )}
                    {member.role === 'admin' && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            <Shield className="h-3 w-3" />
                            Admin
                        </span>
                    )}
                </div>
                <p className="text-sm text-slate-500 truncate">{member.profiles?.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                    Joined {formatDistanceToNow(new Date(member.joined_at), { addSuffix: true })}
                </p>
            </div>

            {/* Actions */}
            {isAdmin && !isCurrentUser && (
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(showMenu === member.user_id ? null : member.user_id)}
                        disabled={actionLoading === member.user_id}
                        className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        {actionLoading === member.user_id ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <MoreHorizontal className="h-5 w-5" />
                        )}
                    </button>

                    {showMenu === member.user_id && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(null)} />
                            <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-20">
                                {member.role === 'member' ? (
                                    <button
                                        onClick={() => onPromote(member.user_id)}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                    >
                                        <Shield className="h-4 w-4 text-amber-500" />
                                        Make Admin
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onDemote(member.user_id)}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5"
                                    >
                                        <User className="h-4 w-4 text-slate-500" />
                                        Remove Admin
                                    </button>
                                )}
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                    onClick={() => onRemove(member.user_id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5"
                                >
                                    <UserMinus className="h-4 w-4" />
                                    Remove from Group
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
