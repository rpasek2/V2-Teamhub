import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Search, Loader2, LayoutGrid, UsersRound, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { StaffCard } from '../components/staff/StaffCard';
import { AddMemberModal } from '../components/hubs/AddMemberModal';
import { TeamViewDashboard } from '../components/staff/TeamViewDashboard';

interface StaffMember {
    user_id: string;
    role: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
    staff_profile?: {
        id: string;
        title: string | null;
        bio: string | null;
        phone: string | null;
        email: string | null;
        hire_date: string | null;
        status: string;
    } | null;
    pending_time_off: number;
    pending_tasks: number;
}

type RoleFilter = 'all' | 'owner' | 'director' | 'admin' | 'coach';
type ViewTab = 'individual' | 'team';

export function Staff() {
    const { hubId } = useParams();
    const { isOwner, isStaff, canManage } = useRoleChecks();

    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeTab, setActiveTab] = useState<ViewTab>('individual');

    useEffect(() => {
        if (hubId) {
            fetchStaffMembers();
        }
    }, [hubId]);

    const fetchStaffMembers = async () => {
        setLoading(true);
        setError(null);

        // Fetch hub members with staff roles
        const { data: membersData, error: membersError } = await supabase
            .from('hub_members')
            .select(`
                user_id,
                role,
                profile:profiles(id, full_name, email, avatar_url)
            `)
            .eq('hub_id', hubId)
            .in('role', ['owner', 'director', 'admin', 'coach']);

        if (membersError) {
            console.error('Error fetching staff members:', membersError);
            setError('Failed to load data. Please try refreshing.');
            setLoading(false);
            return;
        }

        const userIds = membersData?.map(m => m.user_id) || [];

        // Run remaining 3 queries in parallel
        const [staffProfilesResult, timeOffResult, tasksResult] = await Promise.all([
            supabase
                .from('staff_profiles')
                .select('id, user_id, title, bio, phone, email, hire_date, status, emergency_contact')
                .eq('hub_id', hubId)
                .in('user_id', userIds),
            supabase
                .from('staff_time_off')
                .select('staff_user_id')
                .eq('hub_id', hubId)
                .eq('status', 'pending'),
            supabase
                .from('staff_tasks')
                .select('staff_user_id')
                .eq('hub_id', hubId)
                .in('status', ['pending', 'in_progress'])
        ]);

        const staffProfiles = staffProfilesResult.data;
        const timeOffCounts = timeOffResult.data;
        const taskCounts = tasksResult.data;

        // Build O(1) lookup maps to avoid N+1 .filter() calls per member
        const staffProfileMap = new Map<string, (typeof staffProfiles extends (infer T)[] | null ? T : never)>();
        staffProfiles?.forEach(sp => staffProfileMap.set(sp.user_id, sp));

        const timeOffCountMap = new Map<string, number>();
        timeOffCounts?.forEach(t => {
            timeOffCountMap.set(t.staff_user_id, (timeOffCountMap.get(t.staff_user_id) || 0) + 1);
        });

        const taskCountMap = new Map<string, number>();
        taskCounts?.forEach(t => {
            taskCountMap.set(t.staff_user_id, (taskCountMap.get(t.staff_user_id) || 0) + 1);
        });

        // Combine data
        const combined: StaffMember[] = (membersData || []).map(member => {
            const staffProfile = staffProfileMap.get(member.user_id);
            const pendingTimeOff = timeOffCountMap.get(member.user_id) || 0;
            const pendingTasks = taskCountMap.get(member.user_id) || 0;

            // Profile comes from a join and could be an array or single object
            const profileData = Array.isArray(member.profile) ? member.profile[0] : member.profile;

            return {
                user_id: member.user_id,
                role: member.role,
                profile: profileData as StaffMember['profile'],
                staff_profile: staffProfile || null,
                pending_time_off: pendingTimeOff,
                pending_tasks: pendingTasks,
            };
        });

        // Sort: owners first, then by name
        combined.sort((a, b) => {
            const roleOrder = ['owner', 'director', 'admin', 'coach'];
            const aIndex = roleOrder.indexOf(a.role);
            const bIndex = roleOrder.indexOf(b.role);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
        });

        setStaffMembers(combined);
        setLoading(false);
    };

    // Filter staff members (memoized)
    const filteredStaff = useMemo(() => {
        return staffMembers.filter(member => {
            const matchesSearch = searchQuery === '' ||
                member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                member.staff_profile?.title?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesRole = roleFilter === 'all' || member.role === roleFilter;

            return matchesSearch && matchesRole;
        });
    }, [staffMembers, searchQuery, roleFilter]);

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    if (!isStaff) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 rounded-lg">
                        <Users className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Staff</h1>
                        <p className="text-sm text-slate-500">{staffMembers.length} staff members</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggle - only for managers */}
                    {canManage && (
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('individual')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === 'individual'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <LayoutGrid className="w-4 h-4" />
                                Individual
                            </button>
                            <button
                                onClick={() => setActiveTab('team')}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                                    activeTab === 'team'
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <UsersRound className="w-4 h-4" />
                                Team View
                            </button>
                        </div>
                    )}

                    {isOwner && activeTab === 'individual' && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="btn-primary"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Invite Staff</span>
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                    {error}
                </div>
            )}

            {/* Content Container with smooth transitions */}
            <div className="relative">
                {/* Team View */}
                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'team' && canManage
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    {canManage && hubId && (
                        <TeamViewDashboard hubId={hubId} />
                    )}
                </div>

                {/* Individual View */}
                <div
                    className={`transition-all duration-200 ease-in-out space-y-6 ${
                        activeTab === 'individual'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input w-full pl-10"
                            />
                        </div>

                        {/* Role Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {(['all', 'owner', 'director', 'admin', 'coach'] as RoleFilter[]).map((role) => (
                                <button
                                    key={role}
                                    onClick={() => setRoleFilter(role)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                        roleFilter === role
                                            ? 'bg-mint-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {role === 'all' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Staff List */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="w-8 h-8 text-mint-500 animate-spin" />
                        </div>
                    ) : filteredStaff.length === 0 ? (
                        <div className="text-center py-12">
                            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">No staff members found</h3>
                            <p className="text-slate-500">
                                {searchQuery || roleFilter !== 'all'
                                    ? 'Try adjusting your search or filters'
                                    : 'Add staff profiles to get started'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStaff.map((member) => (
                                <StaffCard
                                    key={member.user_id}
                                    member={member}
                                    getRoleBadgeColor={getRoleBadgeColor}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Staff Modal */}
            {showInviteModal && (
                <AddMemberModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    onMemberAdded={fetchStaffMembers}
                />
            )}
        </div>
    );
}
