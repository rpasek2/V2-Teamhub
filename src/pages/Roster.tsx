import { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { AddMemberModal } from '../components/hubs/AddMemberModal';
import type { GymnastProfile } from '../types';

type SortColumn = 'id' | 'name' | 'role' | 'level' | 'guardian' | 'contact';
type SortDirection = 'asc' | 'desc';



interface DisplayMember {
    id: string;
    name: string;
    email: string;
    role: string;
    gymnast_id?: string;
    level?: string;
    guardian_name?: string;
    guardian_phone?: string;
    type: 'hub_member' | 'gymnast_profile';
    full_profile?: GymnastProfile;
}

type TabType = 'All' | 'Admins' | 'Coaches' | 'Gymnasts' | 'Parents';

export function Roster() {
    const navigate = useNavigate();
    const { hub, getPermissionScope, linkedGymnasts, user, currentRole } = useHub();
    const [members, setMembers] = useState<DisplayMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('All');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<DisplayMember | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [sortColumn, setSortColumn] = useState<SortColumn>('level');
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const canManageMembers = ['owner', 'director', 'admin'].includes(currentRole || '');

    useEffect(() => {
        if (hub) {
            fetchMembers();
        }
    }, [hub]);

    const fetchMembers = async () => {
        try {
            // Run both queries in parallel
            const [hubMembersResult, gymnastProfilesResult] = await Promise.all([
                supabase
                    .from('hub_members')
                    .select(`user_id, role, profile:profiles (full_name, email)`)
                    .eq('hub_id', hub?.id),
                supabase
                    .from('gymnast_profiles')
                    .select('*')
                    .eq('hub_id', hub?.id)
                    .order('gymnast_id', { ascending: true })
            ]);

            if (hubMembersResult.error) throw hubMembersResult.error;
            if (gymnastProfilesResult.error) throw gymnastProfilesResult.error;

            const hubMembersData = hubMembersResult.data;
            const gymnastProfilesData = gymnastProfilesResult.data;

            // Combine both into DisplayMember format
            const hubMembers: DisplayMember[] = (hubMembersData || []).map((m: any) => ({
                id: m.user_id,
                name: m.profile?.full_name || 'Unknown',
                email: m.profile?.email || '',
                role: m.role,
                type: 'hub_member' as const,
            }));

            const gymnastMembers: DisplayMember[] = (gymnastProfilesData || []).map((g: GymnastProfile) => {
                // Handle both guardian name formats: {name: "..."} or {first_name: "...", last_name: "..."}
                let guardianName = '';
                if (g.guardian_1) {
                    if (g.guardian_1.name) {
                        guardianName = g.guardian_1.name;
                    } else if (g.guardian_1.first_name || g.guardian_1.last_name) {
                        guardianName = `${g.guardian_1.first_name || ''} ${g.guardian_1.last_name || ''}`.trim();
                    }
                }

                return {
                    id: g.id,
                    name: `${g.first_name} ${g.last_name}`,
                    email: g.guardian_1?.email || '',
                    role: 'gymnast',
                    gymnast_id: g.gymnast_id,
                    level: g.level || '',
                    guardian_name: guardianName || '-',
                    guardian_phone: g.guardian_1?.phone || '-',
                    type: 'gymnast_profile' as const,
                    full_profile: g,
                };
            });

            setMembers([...hubMembers, ...gymnastMembers]);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMember = async (member: DisplayMember) => {
        const confirmMessage = member.type === 'gymnast_profile'
            ? `Are you sure you want to remove ${member.name} from the roster? This will permanently delete their profile.`
            : `Are you sure you want to remove ${member.name} from this hub?`;

        if (!confirm(confirmMessage)) return;

        try {
            if (member.type === 'gymnast_profile') {
                const { error } = await supabase
                    .from('gymnast_profiles')
                    .delete()
                    .eq('id', member.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('hub_members')
                    .delete()
                    .eq('hub_id', hub?.id)
                    .eq('user_id', member.id);
                if (error) throw error;
            }
            fetchMembers();
            setOpenMenuId(null);
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Failed to remove member. Please try again.');
        }
    };

    const tabs: { name: TabType; roles: string[] }[] = [
        { name: 'All', roles: [] },
        { name: 'Admins', roles: ['owner', 'admin', 'director'] },
        { name: 'Coaches', roles: ['coach'] },
        { name: 'Gymnasts', roles: ['gymnast'] },
        { name: 'Parents', roles: ['parent'] },
    ];

    const handleSort = (column: SortColumn) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column: SortColumn) => {
        if (sortColumn !== column) {
            return <ChevronsUpDown className="h-4 w-4 text-slate-500" />;
        }
        return sortDirection === 'asc'
            ? <ChevronUp className="h-4 w-4 text-mint-400" />
            : <ChevronDown className="h-4 w-4 text-mint-400" />;
    };

    // Memoized filtering and sorting
    const filteredMembers = useMemo(() => {
        const scope = getPermissionScope('roster');
        const hubLevels = hub?.settings?.levels || [];
        const direction = sortDirection === 'asc' ? 1 : -1;

        const getSortValue = (member: DisplayMember): string | number => {
            switch (sortColumn) {
                case 'id':
                    return member.gymnast_id || '';
                case 'name':
                    return member.name.toLowerCase();
                case 'role':
                    return member.role;
                case 'level': {
                    const levelIndex = member.level ? hubLevels.indexOf(member.level) : 999;
                    return levelIndex === -1 ? 998 : levelIndex;
                }
                case 'guardian':
                    return (member.guardian_name || '').toLowerCase();
                case 'contact':
                    return (member.type === 'gymnast_profile' ? (member.guardian_phone || '') : (member.email || '')).toLowerCase();
                default:
                    return '';
            }
        };

        return members.filter((member) => {
            // 1. Check Permission Scope
            if (scope === 'none') return false;

            if (scope === 'own') {
                // If scope is 'own', only show linked gymnasts and self
                if (member.type === 'gymnast_profile') {
                    const isLinked = linkedGymnasts.some(g => g.id === member.id);
                    if (!isLinked) return false;
                } else {
                    // For hub members, only show self
                    if (member.id !== user?.id) return false;
                }
            }

            // 2. Search Filter
            const matchesSearch =
                member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                member.email.toLowerCase().includes(searchTerm.toLowerCase());

            if (!matchesSearch) return false;

            // 3. Tab Filter
            if (activeTab === 'All') return true;

            const currentTabRoles = tabs.find(t => t.name === activeTab)?.roles || [];
            return currentTabRoles.includes(member.role);
        }).sort((a, b) => {
            const aValue = getSortValue(a);
            const bValue = getSortValue(b);

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return (aValue - bValue) * direction;
            }

            const aStr = String(aValue);
            const bStr = String(bValue);

            // Handle empty strings - push them to the end
            if (!aStr && bStr) return 1;
            if (aStr && !bStr) return -1;
            if (!aStr && !bStr) return 0;

            return aStr.localeCompare(bStr) * direction;
        });
    }, [members, searchTerm, activeTab, sortColumn, sortDirection, getPermissionScope, linkedGymnasts, user?.id, hub?.settings?.levels]);

    if (loading) return <div className="p-8 text-slate-400">Loading roster...</div>;

    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-chalk-50">Roster</h1>
                    <p className="mt-2 text-sm text-slate-400">
                        Manage your team members, assign roles, and view contact info.
                    </p>
                </div>
                <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        Add Member
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Tabs */}
                <div className="flex space-x-1 rounded-lg bg-slate-800 p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.name}
                            onClick={() => setActiveTab(tab.name)}
                            className={`
                                rounded-md py-2 px-4 text-sm font-medium transition-all
                                ${activeTab === tab.name
                                    ? 'bg-slate-700 text-chalk-50 shadow'
                                    : 'text-slate-400 hover:text-chalk-50 hover:bg-slate-700/50'
                                }
                            `}
                        >
                            {tab.name}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full max-w-xs">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="input pl-10"
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="mt-8 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden card">
                            <table className="min-w-full divide-y divide-slate-700/50">
                                <thead className="bg-slate-800/50">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="py-3.5 pl-4 pr-3 text-left text-sm font-medium text-slate-400 sm:pl-6 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('id')}
                                        >
                                            <div className="flex items-center gap-1">
                                                ID
                                                {getSortIcon('id')}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-medium text-slate-400 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Name
                                                {getSortIcon('name')}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-medium text-slate-400 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('role')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Role
                                                {getSortIcon('role')}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-medium text-slate-400 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('level')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Level
                                                {getSortIcon('level')}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-medium text-slate-400 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('guardian')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Guardian
                                                {getSortIcon('guardian')}
                                            </div>
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3.5 text-left text-sm font-medium text-slate-400 cursor-pointer hover:bg-slate-700/50 transition-colors"
                                            onClick={() => handleSort('contact')}
                                        >
                                            <div className="flex items-center gap-1">
                                                Contact
                                                {getSortIcon('contact')}
                                            </div>
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700/50">
                                    {filteredMembers.length > 0 ? (
                                        filteredMembers.map((member) => (
                                            <tr
                                                key={member.id}
                                                onClick={() => {
                                                    if (member.type === 'gymnast_profile') {
                                                        navigate(`/hub/${hub?.id}/roster/${member.id}`);
                                                    }
                                                }}
                                                className={member.type === 'gymnast_profile' ? 'cursor-pointer hover:bg-slate-700/30' : ''}
                                            >
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-slate-400 sm:pl-6">
                                                    {member.type === 'gymnast_profile' ? member.gymnast_id : '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-chalk-50">
                                                    {member.name}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400 capitalize">
                                                    {member.role}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400">
                                                    {member.level || '-'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-400">
                                                    {member.guardian_name || '-'}
                                                </td>
                                                <td className="px-3 py-4 text-sm text-slate-400">
                                                    <div>{member.type === 'gymnast_profile' ? member.guardian_phone : member.email}</div>
                                                    {member.type === 'gymnast_profile' && member.email && (
                                                        <div className="text-xs text-slate-500">{member.email}</div>
                                                    )}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    {canManageMembers && (
                                                        <div className="relative inline-block text-left" ref={openMenuId === member.id ? menuRef : null}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setOpenMenuId(openMenuId === member.id ? null : member.id);
                                                                }}
                                                                className="text-slate-500 hover:text-chalk-50 p-1 rounded hover:bg-slate-700"
                                                            >
                                                                <MoreHorizontal className="h-5 w-5" />
                                                            </button>

                                                            {openMenuId === member.id && (
                                                                <div className="absolute right-0 z-10 mt-1 w-48 origin-top-right rounded-lg bg-slate-800 shadow-lg ring-1 ring-slate-700 focus:outline-none">
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingMember(member);
                                                                                setIsAddModalOpen(true);
                                                                                setOpenMenuId(null);
                                                                            }}
                                                                            className="flex w-full items-center px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"
                                                                        >
                                                                            <Pencil className="mr-3 h-4 w-4 text-slate-400" />
                                                                            Edit
                                                                        </button>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleDeleteMember(member);
                                                                            }}
                                                                            className="flex w-full items-center px-4 py-2 text-sm text-error-400 hover:bg-error-500/10"
                                                                        >
                                                                            <Trash2 className="mr-3 h-4 w-4" />
                                                                            Remove
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                                                No members found in this category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <AddMemberModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditingMember(null);
                }}
                onMemberAdded={fetchMembers}
                initialData={editingMember}
            />
        </div>
    );
}
