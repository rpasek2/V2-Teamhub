import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowRight, Loader2, Ticket, Trophy, Music, Megaphone, Waves, Swords, MoreVertical, EyeOff, Eye, LogOut, Trash2, Building2, LayoutDashboard } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { CreateHubModal } from '../../components/hubs/CreateHubModal';
import { JoinHubModal } from '../../components/hubs/JoinHubModal';
import { DeleteHubModal } from '../../components/hubs/DeleteHubModal';
import type { SportType } from '../../types';
import { SPORT_CONFIGS } from '../../types';

const SPORT_ICONS = {
    Trophy,
    Music,
    Megaphone,
    Waves,
    Swords
};

interface Hub {
    id: string;
    name: string;
    role: string;
    sport_type: SportType;
    is_hidden?: boolean;
    owner_name?: string;
    owner_organization?: string;
}

export function HubSelection() {
    const { user } = useAuth();
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedHub, setSelectedHub] = useState<Hub | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [showHidden, setShowHidden] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchMyHubs = async () => {
        if (!user) return;
        try {
            // Fetch hubs
            const { data, error } = await supabase
                .from('hub_members')
                .select(`
                    role,
                    hub:hubs (
                        id,
                        name,
                        sport_type
                    )
                `)
                .eq('user_id', user.id);

            if (error) throw error;

            // Fetch hidden hubs
            const { data: hiddenData } = await supabase
                .from('hidden_hubs')
                .select('hub_id')
                .eq('user_id', user.id);

            const hiddenIds = new Set((hiddenData || []).map(h => h.hub_id));

            // Get hub IDs to fetch owner info
            const hubIds = data.map((item: any) => item.hub.id);

            // Fetch owner information for each hub
            const { data: ownerData } = await supabase
                .from('hub_members')
                .select(`
                    hub_id,
                    user:profiles (
                        full_name,
                        organization
                    )
                `)
                .in('hub_id', hubIds)
                .eq('role', 'owner');

            // Create a map of hub_id to owner info
            const ownerMap = new Map<string, { name: string; organization: string | null }>();
            if (ownerData) {
                ownerData.forEach((owner: any) => {
                    if (owner.user) {
                        ownerMap.set(owner.hub_id, {
                            name: owner.user.full_name,
                            organization: owner.user.organization
                        });
                    }
                });
            }

            const formattedHubs = data.map((item: any) => {
                const ownerInfo = ownerMap.get(item.hub.id);
                return {
                    id: item.hub.id,
                    name: item.hub.name,
                    role: item.role,
                    sport_type: item.hub.sport_type || 'gymnastics',
                    is_hidden: hiddenIds.has(item.hub.id),
                    owner_name: ownerInfo?.name,
                    owner_organization: ownerInfo?.organization || undefined,
                };
            });

            setHubs(formattedHubs);
        } catch (error) {
            console.error('Error fetching hubs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyHubs();
    }, [user]);

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

    const handleToggleHide = async (hub: Hub) => {
        if (!user) return;

        try {
            if (hub.is_hidden) {
                // Unhide
                await supabase
                    .from('hidden_hubs')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('hub_id', hub.id);
            } else {
                // Hide
                await supabase
                    .from('hidden_hubs')
                    .insert({ user_id: user.id, hub_id: hub.id });
            }

            // Update local state
            setHubs(prev => prev.map(h =>
                h.id === hub.id ? { ...h, is_hidden: !h.is_hidden } : h
            ));
        } catch (error) {
            console.error('Error toggling hub visibility:', error);
        }

        setOpenMenuId(null);
    };

    const handleLeaveHub = async (hub: Hub) => {
        if (!user) return;

        if (hub.role === 'owner') {
            alert('Owners cannot leave their hub. Transfer ownership or delete the hub instead.');
            setOpenMenuId(null);
            return;
        }

        const confirmed = window.confirm(`Are you sure you want to leave "${hub.name}"? You'll need a new invite to rejoin.`);
        if (!confirmed) {
            setOpenMenuId(null);
            return;
        }

        try {
            const { error } = await supabase
                .from('hub_members')
                .delete()
                .eq('hub_id', hub.id)
                .eq('user_id', user.id);

            if (error) throw error;

            // Remove from local state
            setHubs(prev => prev.filter(h => h.id !== hub.id));
        } catch (error) {
            console.error('Error leaving hub:', error);
            alert('Failed to leave hub. Please try again.');
        }

        setOpenMenuId(null);
    };

    const handleDeleteHub = (hub: Hub) => {
        setSelectedHub(hub);
        setIsDeleteModalOpen(true);
        setOpenMenuId(null);
    };

    const onHubDeleted = () => {
        setHubs(prev => prev.filter(h => h.id !== selectedHub?.id));
        setSelectedHub(null);
    };

    const visibleHubs = showHidden ? hubs : hubs.filter(h => !h.is_hidden);
    const hiddenCount = hubs.filter(h => h.is_hidden).length;

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">My Hubs</h1>
                    <p className="mt-1 text-slate-600">Select a hub to manage or create a new one.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsJoinModalOpen(true)}
                        className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
                    >
                        <Ticket className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                        Join Hub
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                        <Plus className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
                        Create Hub
                    </button>
                </div>
            </div>

            {/* Show/Hide hidden hubs toggle */}
            {hiddenCount > 0 && (
                <div className="mb-4">
                    <button
                        onClick={() => setShowHidden(!showHidden)}
                        className="inline-flex items-center text-sm text-slate-500 hover:text-slate-700"
                    >
                        {showHidden ? (
                            <>
                                <EyeOff className="mr-1.5 h-4 w-4" />
                                Hide {hiddenCount} hidden hub{hiddenCount > 1 ? 's' : ''}
                            </>
                        ) : (
                            <>
                                <Eye className="mr-1.5 h-4 w-4" />
                                Show {hiddenCount} hidden hub{hiddenCount > 1 ? 's' : ''}
                            </>
                        )}
                    </button>
                </div>
            )}

            {visibleHubs.length === 0 ? (
                <div className="text-center py-16 px-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                    <div className="mx-auto w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <LayoutDashboard className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No hubs yet</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        Create a new hub or join an existing one to get started. Your hubs will appear here.
                    </p>
                </div>
            ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {visibleHubs.map((hub) => {
                    const sportConfig = SPORT_CONFIGS[hub.sport_type];
                    const SportIcon = SPORT_ICONS[sportConfig.icon as keyof typeof SPORT_ICONS];

                    // Get sport-specific color classes
                    const getSportColorClasses = (color: string) => {
                        const colorMap: Record<string, { badge: string; icon: string }> = {
                            purple: { badge: 'bg-purple-100 text-purple-700', icon: 'text-purple-500' },
                            pink: { badge: 'bg-pink-100 text-pink-700', icon: 'text-pink-500' },
                            red: { badge: 'bg-red-100 text-red-700', icon: 'text-red-500' },
                            blue: { badge: 'bg-blue-100 text-blue-700', icon: 'text-blue-500' },
                            amber: { badge: 'bg-amber-100 text-amber-700', icon: 'text-amber-500' }
                        };
                        return colorMap[color] || colorMap.purple;
                    };

                    const sportColors = getSportColorClasses(sportConfig.color);
                    const isOwner = hub.role === 'owner';

                    return (
                        <div
                            key={hub.id}
                            className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-white p-6 shadow-sm transition-all hover:shadow-md ${hub.is_hidden ? 'border-slate-300 opacity-60' : 'border-slate-200 hover:border-brand-200'
                                }`}
                        >
                            {/* 3-dot menu */}
                            <div className="absolute top-3 right-3" ref={openMenuId === hub.id ? menuRef : null}>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setOpenMenuId(openMenuId === hub.id ? null : hub.id);
                                    }}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                >
                                    <MoreVertical className="h-5 w-5" />
                                </button>

                                {openMenuId === hub.id && (
                                    <div className="absolute right-0 mt-1 w-48 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                                        <div className="py-1">
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    handleToggleHide(hub);
                                                }}
                                                className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                            >
                                                {hub.is_hidden ? (
                                                    <>
                                                        <Eye className="mr-3 h-4 w-4 text-slate-400" />
                                                        Show Hub
                                                    </>
                                                ) : (
                                                    <>
                                                        <EyeOff className="mr-3 h-4 w-4 text-slate-400" />
                                                        Hide Hub
                                                    </>
                                                )}
                                            </button>

                                            {!isOwner && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleLeaveHub(hub);
                                                    }}
                                                    className="flex w-full items-center px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                                                >
                                                    <LogOut className="mr-3 h-4 w-4 text-slate-400" />
                                                    Leave Hub
                                                </button>
                                            )}

                                            {isOwner && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleDeleteHub(hub);
                                                    }}
                                                    className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="mr-3 h-4 w-4" />
                                                    Delete Hub
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Link to={`/hub/${hub.id}`} className="flex flex-col flex-1">
                                <div>
                                    <div className="flex items-start justify-between pr-8">
                                        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-brand-600">
                                            {hub.name}
                                        </h3>
                                        <SportIcon className={`h-5 w-5 ${sportColors.icon}`} />
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sportColors.badge}`}>
                                            {sportConfig.name}
                                        </span>
                                        <span className="text-xs text-slate-500 capitalize">{hub.role}</span>
                                        {hub.is_hidden && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">
                                                Hidden
                                            </span>
                                        )}
                                    </div>
                                    {hub.owner_organization && (
                                        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                            <Building2 className="h-3.5 w-3.5" />
                                            <span>{hub.owner_organization}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center text-sm font-medium text-brand-600">
                                    Enter Hub
                                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                </div>
                            </Link>
                        </div>
                    );
                })}
            </div>
            )}

            <CreateHubModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onHubCreated={fetchMyHubs}
            />

            <JoinHubModal
                isOpen={isJoinModalOpen}
                onClose={() => setIsJoinModalOpen(false)}
                onHubJoined={fetchMyHubs}
            />

            {selectedHub && (
                <DeleteHubModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setSelectedHub(null);
                    }}
                    hub={selectedHub}
                    onHubDeleted={onHubDeleted}
                />
            )}
        </div>
    );
}
