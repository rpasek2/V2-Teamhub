import { useState, useEffect, useMemo } from 'react';
import { Loader2, Search, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface Member {
    user_id: string;
    role: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
}

const ROLE_ORDER = ['owner', 'director', 'admin', 'coach', 'parent', 'athlete'];
const ASSIGNABLE_ROLES = ['parent', 'coach', 'admin', 'director'];

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
    owner: { label: 'Owner', color: 'text-amber-700 bg-amber-500/10' },
    director: { label: 'Director', color: 'text-purple-700 bg-purple-500/10' },
    admin: { label: 'Admin', color: 'text-blue-700 bg-blue-500/10' },
    coach: { label: 'Coach', color: 'text-green-700 bg-green-500/10' },
    parent: { label: 'Parent', color: 'text-slate-600 bg-slate-500/10' },
    athlete: { label: 'Athlete', color: 'text-orange-700 bg-orange-500/10' },
};

export function MemberRolesSection() {
    const { hub } = useHub();
    const { user } = useAuth();
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [successId, setSuccessId] = useState<string | null>(null);

    useEffect(() => {
        if (!hub) return;

        const fetchMembers = async () => {
            const { data, error } = await supabase
                .from('hub_members')
                .select('user_id, role, profiles(id, full_name, email, avatar_url)')
                .eq('hub_id', hub.id)
                .eq('status', 'active');

            if (error) {
                console.error('Error fetching members:', error);
                setLoading(false);
                return;
            }

            const mapped: Member[] = (data || [])
                .filter(m => m.profiles)
                .map(m => ({
                    user_id: m.user_id,
                    role: m.role,
                    profile: m.profiles as any,
                }))
                .sort((a, b) => {
                    const ri = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
                    if (ri !== 0) return ri;
                    return (a.profile.full_name || '').localeCompare(b.profile.full_name || '');
                });

            setMembers(mapped);
            setLoading(false);
        };

        fetchMembers();
    }, [hub]);

    const filtered = useMemo(() => {
        if (!search.trim()) return members;
        const q = search.toLowerCase();
        return members.filter(m =>
            m.profile.full_name?.toLowerCase().includes(q) ||
            m.profile.email?.toLowerCase().includes(q)
        );
    }, [members, search]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        if (!hub) return;
        setUpdatingId(userId);

        const { error } = await supabase
            .from('hub_members')
            .update({ role: newRole })
            .eq('hub_id', hub.id)
            .eq('user_id', userId);

        if (error) {
            console.error('Error updating role:', error);
        } else {
            setMembers(prev => prev.map(m =>
                m.user_id === userId ? { ...m, role: newRole } : m
            ));
            setSuccessId(userId);
            setTimeout(() => setSuccessId(null), 2000);
        }
        setUpdatingId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {members.length > 5 && (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search members..."
                        className="input w-full pl-9 text-sm"
                    />
                </div>
            )}

            <div className="divide-y divide-line border border-line rounded-lg overflow-hidden">
                {filtered.map(member => {
                    const isCurrentUser = member.user_id === user?.id;
                    const isOwner = member.role === 'owner';
                    const canChange = !isCurrentUser && !isOwner;
                    const badge = ROLE_BADGE[member.role] || ROLE_BADGE.parent;

                    return (
                        <div key={member.user_id} className="flex items-center gap-3 px-4 py-3">
                            {member.profile.avatar_url ? (
                                <img
                                    src={member.profile.avatar_url}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-accent-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-accent-700">
                                        {(member.profile.full_name || '?')[0].toUpperCase()}
                                    </span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-heading truncate">
                                    {member.profile.full_name}
                                    {isCurrentUser && <span className="text-muted font-normal ml-1">(you)</span>}
                                </p>
                                <p className="text-xs text-muted truncate">{member.profile.email}</p>
                            </div>

                            {canChange ? (
                                <div className="relative flex items-center gap-2 flex-shrink-0">
                                    {updatingId === member.user_id && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted" />
                                    )}
                                    {successId === member.user_id && (
                                        <Check className="h-3.5 w-3.5 text-green-600" />
                                    )}
                                    <select
                                        value={member.role}
                                        onChange={e => handleRoleChange(member.user_id, e.target.value)}
                                        disabled={updatingId === member.user_id}
                                        className="text-xs font-medium border border-line rounded-lg px-2 py-1.5 bg-surface text-heading cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent-500 disabled:opacity-50"
                                    >
                                        {ASSIGNABLE_ROLES.map(r => (
                                            <option key={r} value={r}>
                                                {ROLE_BADGE[r]?.label || r}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${badge.color}`}>
                                    {badge.label}
                                </span>
                            )}
                        </div>
                    );
                })}

                {filtered.length === 0 && (
                    <div className="px-4 py-6 text-center text-sm text-muted">
                        No members found.
                    </div>
                )}
            </div>
        </div>
    );
}
