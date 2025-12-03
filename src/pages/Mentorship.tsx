import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { HeartHandshake, Plus, Search, Filter, Loader2, Calendar, Users, Shuffle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { PairingCard } from '../components/mentorship/PairingCard';
import { CreatePairingModal } from '../components/mentorship/CreatePairingModal';
import { CreateMentorshipEventModal } from '../components/mentorship/CreateMentorshipEventModal';
import { RandomAssignModal } from '../components/mentorship/RandomAssignModal';
import { MentorshipEventCard } from '../components/mentorship/MentorshipEventCard';
import type { Competition, GymnastProfile } from '../types';

// Calendar event structure for mentorship events
interface CalendarMentorshipEvent {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
}

type MobileTab = 'pairings' | 'events';
type StatusFilter = 'all' | 'active' | 'inactive';

interface LittleWithCompetition {
    id: string; // pairing id for deletion
    gymnast: GymnastProfile;
    next_competition?: { name: string; start_date: string } | null;
}

// Grouped pairing: one Big with multiple Littles
export interface GroupedPairing {
    big_gymnast_id: string;
    big_gymnast: GymnastProfile;
    big_next_competition?: { name: string; start_date: string } | null;
    littles: LittleWithCompetition[];
    status: 'active' | 'inactive';
    notes: string | null;
}

export function Mentorship() {
    const { hubId } = useParams();
    const { currentRole, getPermissionScope, linkedGymnasts } = useHub();

    const [groupedPairings, setGroupedPairings] = useState<GroupedPairing[]>([]);
    const [events, setEvents] = useState<CalendarMentorshipEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
    const [mobileTab, setMobileTab] = useState<MobileTab>('pairings');
    const [showCreatePairingModal, setShowCreatePairingModal] = useState(false);
    const [showCreateEventModal, setShowCreateEventModal] = useState(false);
    const [showRandomAssignModal, setShowRandomAssignModal] = useState(false);
    const [showPastEvents, setShowPastEvents] = useState(false);

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
    const mentorshipScope = getPermissionScope('mentorship');

    // Filter pairings based on permission scope for parent accounts
    const visiblePairings = useMemo(() => {
        if (mentorshipScope === 'none') return [];
        if (mentorshipScope === 'own') {
            const linkedIds = linkedGymnasts.map(g => g.id);
            // Show pairings where the parent's linked gymnast is either the Big or a Little
            return groupedPairings.filter(group => {
                const bigIsLinked = linkedIds.includes(group.big_gymnast_id);
                const anyLittleIsLinked = group.littles.some(l => linkedIds.includes(l.gymnast.id));
                return bigIsLinked || anyLittleIsLinked;
            });
        }
        return groupedPairings;
    }, [groupedPairings, mentorshipScope, linkedGymnasts]);

    useEffect(() => {
        if (hubId) {
            fetchData();
        }
    }, [hubId]);

    const fetchData = async () => {
        setLoading(true);
        await Promise.all([fetchPairings(), fetchEvents()]);
        setLoading(false);
    };

    const fetchPairings = async () => {
        // Fetch pairings with gymnast profiles
        const { data: pairingsData, error: pairingsError } = await supabase
            .from('mentorship_pairs')
            .select(`
                *,
                big_gymnast:gymnast_profiles!mentorship_pairs_big_gymnast_id_fkey(*),
                little_gymnast:gymnast_profiles!mentorship_pairs_little_gymnast_id_fkey(*)
            `)
            .eq('hub_id', hubId)
            .order('created_at', { ascending: false });

        if (pairingsError) {
            console.error('Error fetching pairings:', pairingsError);
            return;
        }

        // Fetch upcoming competitions for all gymnasts in pairings
        const gymnastIds = new Set<string>();
        pairingsData?.forEach(p => {
            gymnastIds.add(p.big_gymnast_id);
            gymnastIds.add(p.little_gymnast_id);
        });

        const today = new Date().toISOString().split('T')[0];

        // Get competition assignments for these gymnasts
        const { data: competitionData } = await supabase
            .from('competition_gymnasts')
            .select(`
                gymnast_profile_id,
                competitions!inner(id, name, start_date)
            `)
            .in('gymnast_profile_id', Array.from(gymnastIds))
            .gte('competitions.start_date', today)
            .order('competitions(start_date)', { ascending: true });

        // Build a map of gymnast_id -> next competition
        const nextCompetitionMap = new Map<string, { name: string; start_date: string }>();
        competitionData?.forEach(cg => {
            const comp = cg.competitions as unknown as Competition;
            if (comp && !nextCompetitionMap.has(cg.gymnast_profile_id)) {
                nextCompetitionMap.set(cg.gymnast_profile_id, {
                    name: comp.name,
                    start_date: comp.start_date
                });
            }
        });

        // Group pairings by Big gymnast
        const groupedMap = new Map<string, GroupedPairing>();

        (pairingsData || []).forEach(p => {
            const bigId = p.big_gymnast_id;

            if (!groupedMap.has(bigId)) {
                groupedMap.set(bigId, {
                    big_gymnast_id: bigId,
                    big_gymnast: p.big_gymnast as GymnastProfile,
                    big_next_competition: nextCompetitionMap.get(bigId) || null,
                    littles: [],
                    status: p.status,
                    notes: p.notes
                });
            }

            const group = groupedMap.get(bigId)!;
            group.littles.push({
                id: p.id,
                gymnast: p.little_gymnast as GymnastProfile,
                next_competition: nextCompetitionMap.get(p.little_gymnast_id) || null
            });
        });

        setGroupedPairings(Array.from(groupedMap.values()));
    };

    const fetchEvents = async () => {
        // Pull mentorship events from the calendar events table
        const { data, error } = await supabase
            .from('events')
            .select('id, title, description, start_time, end_time, location')
            .eq('hub_id', hubId)
            .eq('type', 'mentorship')
            .order('start_time', { ascending: true });

        if (error) {
            console.error('Error fetching events:', error);
            return;
        }

        setEvents(data || []);
    };

    const handlePairingCreated = () => {
        fetchPairings();
        setShowCreatePairingModal(false);
    };

    const handleEventCreated = () => {
        fetchEvents();
        setShowCreateEventModal(false);
    };

    const handleRandomAssignCreated = () => {
        fetchPairings();
        setShowRandomAssignModal(false);
    };

    const handleDeleteLittle = async (pairingId: string) => {
        const { error } = await supabase
            .from('mentorship_pairs')
            .delete()
            .eq('id', pairingId);

        if (!error) {
            fetchPairings();
        }
    };

    const handleDeleteGroup = async (bigGymnastId: string) => {
        // Delete all pairings for this Big gymnast
        const { error } = await supabase
            .from('mentorship_pairs')
            .delete()
            .eq('hub_id', hubId)
            .eq('big_gymnast_id', bigGymnastId);

        if (!error) {
            fetchPairings();
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        // Delete from the calendar events table
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', eventId);

        if (!error) {
            fetchEvents();
        }
    };

    // Filter visible pairings by search and status
    const filteredPairings = visiblePairings.filter(group => {
        // Status filter
        if (statusFilter !== 'all' && group.status !== statusFilter) return false;

        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const bigName = `${group.big_gymnast?.first_name} ${group.big_gymnast?.last_name}`.toLowerCase();
            const littleNames = group.littles.map(l =>
                `${l.gymnast?.first_name} ${l.gymnast?.last_name}`.toLowerCase()
            );
            return bigName.includes(query) || littleNames.some(name => name.includes(query));
        }

        return true;
    });

    // Split events into upcoming and past
    const now = new Date().toISOString();
    const upcomingEvents = events.filter(e => e.start_time >= now);
    const pastEvents = events.filter(e => e.start_time < now).reverse();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3">
                    <HeartHandshake className="h-8 w-8 text-brand-600" />
                    <h1 className="text-2xl font-bold text-slate-900">Mentorship</h1>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                    Manage pairings, events, and mentorship programs
                </p>
            </div>

            {/* Mobile Tab Navigation */}
            <div className="lg:hidden flex border-b border-slate-200">
                <button
                    onClick={() => setMobileTab('pairings')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        mobileTab === 'pairings'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Users className="inline-block h-4 w-4 mr-2" />
                    Pairings
                </button>
                <button
                    onClick={() => setMobileTab('events')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                        mobileTab === 'events'
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Calendar className="inline-block h-4 w-4 mr-2" />
                    Events
                </button>
            </div>

            {/* Main Content - Side by Side on Desktop */}
            <div className="lg:flex lg:gap-6">
                {/* Pairings Section */}
                <div className={`lg:flex-1 lg:w-2/3 ${mobileTab !== 'pairings' ? 'hidden lg:block' : ''}`}>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                        {/* Pairings Header */}
                        <div className="p-4 border-b border-slate-200">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">Pairings</h2>
                                {isStaff && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setShowRandomAssignModal(true)}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 bg-brand-50 border border-brand-200 rounded-lg hover:bg-brand-100"
                                        >
                                            <Shuffle className="h-4 w-4" />
                                            Random Assign
                                        </button>
                                        <button
                                            onClick={() => setShowCreatePairingModal(true)}
                                            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Create Pairing
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Search and Filter */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                                        className="pl-10 pr-8 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent appearance-none bg-white"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="all">All</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pairings Grid */}
                        <div className="p-4">
                            {filteredPairings.length === 0 ? (
                                <div className="text-center py-12">
                                    <HeartHandshake className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500">
                                        {visiblePairings.length === 0
                                            ? (isStaff ? 'No pairings yet. Create your first Big/Little pairing!' : 'No pairings to display.')
                                            : 'No pairings match your search.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {filteredPairings.map((group) => (
                                        <PairingCard
                                            key={group.big_gymnast_id}
                                            groupedPairing={group}
                                            onDeleteLittle={isStaff ? handleDeleteLittle : undefined}
                                            onDeleteGroup={isStaff ? handleDeleteGroup : undefined}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Events Section */}
                <div className={`lg:w-1/3 mt-6 lg:mt-0 ${mobileTab !== 'events' ? 'hidden lg:block' : ''}`}>
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                        {/* Events Header */}
                        <div className="p-4 border-b border-slate-200">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900">Upcoming Events</h2>
                                {isStaff && (
                                    <button
                                        onClick={() => setShowCreateEventModal(true)}
                                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Event
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Events List */}
                        <div className="p-4 space-y-3">
                            {upcomingEvents.length === 0 ? (
                                <div className="text-center py-8">
                                    <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500">No upcoming events</p>
                                </div>
                            ) : (
                                upcomingEvents.map((event) => (
                                    <MentorshipEventCard
                                        key={event.id}
                                        event={event}
                                        onDelete={isStaff ? handleDeleteEvent : undefined}
                                    />
                                ))
                            )}

                            {/* Past Events Section */}
                            {pastEvents.length > 0 && (
                                <div className="pt-4">
                                    <button
                                        onClick={() => setShowPastEvents(!showPastEvents)}
                                        className="w-full text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2"
                                    >
                                        <div className="h-px flex-1 bg-slate-200" />
                                        <span>{showPastEvents ? 'Hide' : 'Show'} Past Events ({pastEvents.length})</span>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </button>

                                    {showPastEvents && (
                                        <div className="mt-3 space-y-3 opacity-60">
                                            {pastEvents.map((event) => (
                                                <MentorshipEventCard
                                                    key={event.id}
                                                    event={event}
                                                    isPast
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <CreatePairingModal
                isOpen={showCreatePairingModal}
                onClose={() => setShowCreatePairingModal(false)}
                onCreated={handlePairingCreated}
                hubId={hubId || ''}
            />

            <CreateMentorshipEventModal
                isOpen={showCreateEventModal}
                onClose={() => setShowCreateEventModal(false)}
                onCreated={handleEventCreated}
                hubId={hubId || ''}
            />

            <RandomAssignModal
                isOpen={showRandomAssignModal}
                onClose={() => setShowRandomAssignModal(false)}
                onCreated={handleRandomAssignCreated}
                hubId={hubId || ''}
            />
        </div>
    );
}
