import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Plus, Search, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { StaffCard } from '../components/staff/StaffCard';
import { StaffProfileModal } from '../components/staff/StaffProfileModal';
import { CreateStaffProfileModal } from '../components/staff/CreateStaffProfileModal';

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

export function Staff() {
    const { hubId } = useParams();
    const { currentRole } = useHub();

    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    const isOwner = currentRole === 'owner';
    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    useEffect(() => {
        if (hubId) {
            fetchStaffMembers();
        }
    }, [hubId]);

    const fetchStaffMembers = async () => {
        setLoading(true);

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
            setLoading(false);
            return;
        }

        // Fetch staff profiles for these members
        const userIds = membersData?.map(m => m.user_id) || [];

        const { data: staffProfiles } = await supabase
            .from('staff_profiles')
            .select('*')
            .eq('hub_id', hubId)
            .in('user_id', userIds);

        // Fetch pending time off counts
        const { data: timeOffCounts } = await supabase
            .from('staff_time_off')
            .select('staff_user_id')
            .eq('hub_id', hubId)
            .eq('status', 'pending');

        // Fetch pending task counts
        const { data: taskCounts } = await supabase
            .from('staff_tasks')
            .select('staff_user_id')
            .eq('hub_id', hubId)
            .in('status', ['pending', 'in_progress']);

        // Combine data
        const combined: StaffMember[] = (membersData || []).map(member => {
            const staffProfile = staffProfiles?.find(sp => sp.user_id === member.user_id);
            const pendingTimeOff = timeOffCounts?.filter(t => t.staff_user_id === member.user_id).length || 0;
            const pendingTasks = taskCounts?.filter(t => t.staff_user_id === member.user_id).length || 0;

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

    // Filter staff members
    const filteredStaff = staffMembers.filter(member => {
        const matchesSearch = searchQuery === '' ||
            member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            member.staff_profile?.title?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesRole = roleFilter === 'all' || member.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (!isStaff) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-500">You don't have permission to view this page.</p>
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
                        <h1 className="text-2xl font-bold text-slate-800">Staff</h1>
                        <p className="text-sm text-slate-500">{staffMembers.length} staff members</p>
                    </div>
                </div>

                {isOwner && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Staff Profile</span>
                    </button>
                )}
            </div>

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
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
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
                                    ? 'bg-brand-600 text-white'
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
                    <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                </div>
            ) : filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-600 mb-2">No staff members found</h3>
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
                            onClick={() => setSelectedStaff(member)}
                        />
                    ))}
                </div>
            )}

            {/* Staff Profile Modal */}
            {selectedStaff && (
                <StaffProfileModal
                    isOpen={!!selectedStaff}
                    onClose={() => setSelectedStaff(null)}
                    staffMember={selectedStaff}
                    onUpdate={fetchStaffMembers}
                />
            )}

            {/* Create Staff Profile Modal */}
            {showCreateModal && (
                <CreateStaffProfileModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    existingStaff={staffMembers}
                    onCreated={fetchStaffMembers}
                />
            )}
        </div>
    );
}
