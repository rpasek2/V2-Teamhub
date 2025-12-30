import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Clock, FileText, Plus, UserPlus, ChevronDown, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useHub } from '../../context/HubContext';
import { CreateSessionModal } from '../../components/competitions/CreateSessionModal';
import { AssignCoachModal } from '../../components/competitions/AssignCoachModal';
import { ManageCompetitionRosterModal } from '../../components/competitions/ManageCompetitionRosterModal';
import { AssignSessionGymnastsModal } from '../../components/competitions/AssignSessionGymnastsModal';
import { CompetitionDocuments } from '../../components/competitions/CompetitionDocuments';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS, type GymEvent } from '../../types';

interface Competition {
    id: string;
    hub_id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
}

interface Gymnast {
    gymnast_profile_id: string;
    events: GymEvent[];
    gymnast_profiles: {
        id: string;
        first_name: string;
        last_name: string;
        level: string | null;
        gymnast_id: string;
        gender: 'Male' | 'Female' | null;
    };
}

interface Session {
    id: string;
    name: string;
    date: string;
    warmup_time: string | null;
    awards_time: string | null;
    session_coaches: {
        user_id: string;
        profiles: {
            full_name: string;
        };
    }[];
    session_gymnasts: {
        gymnast_profile_id: string;
        gymnast_profiles: {
            first_name: string;
            last_name: string;
            level: string | null;
        };
    }[];
}

export function CompetitionDetails() {
    const { competitionId } = useParams();
    const { currentRole, hub } = useHub();
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [activeTab, setActiveTab] = useState<'roster' | 'sessions' | 'documents'>('roster');
    const [loading, setLoading] = useState(true);
    const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
    const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState(false);
    const [isManageRosterModalOpen, setIsManageRosterModalOpen] = useState(false);

    // Staff roles that can manage competition rosters
    const canManageRoster = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
    const [isAssignGymnastsModalOpen, setIsAssignGymnastsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    // Tab Data States
    const [roster, setRoster] = useState<Gymnast[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

    // Get levels from hub settings
    const hubLevels = hub?.settings?.levels || [];

    // Group roster by level
    const rosterByLevel = useMemo(() => {
        const grouped: Record<string, Gymnast[]> = {};

        roster.forEach(gymnast => {
            const level = gymnast.gymnast_profiles.level || 'Unassigned';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(gymnast);
        });

        // Sort levels based on the hub settings order
        const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
        const unlistedLevels = Object.keys(grouped).filter(l => !hubLevels.includes(l) && l !== 'Unassigned');
        const orderedKeys = [...sortedLevels, ...unlistedLevels];
        if (grouped['Unassigned']) orderedKeys.push('Unassigned');

        const result: Record<string, Gymnast[]> = {};
        orderedKeys.forEach(level => {
            // Sort gymnasts alphabetically by last name within each level
            result[level] = grouped[level].sort((a, b) =>
                (a.gymnast_profiles.last_name || '').localeCompare(b.gymnast_profiles.last_name || '')
            );
        });

        return result;
    }, [roster, hubLevels]);

    const toggleLevelCollapse = (level: string) => {
        setCollapsedLevels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(level)) {
                newSet.delete(level);
            } else {
                newSet.add(level);
            }
            return newSet;
        });
    };

    useEffect(() => {
        if (competitionId) {
            fetchCompetitionDetails();
            fetchRoster();
            fetchSessions();
        }
    }, [competitionId]);

    const fetchCompetitionDetails = async () => {
        if (!competitionId) return;
        const { data, error } = await supabase
            .from('competitions')
            .select('*')
            .eq('id', competitionId)
            .single();

        if (error) console.error('Error fetching competition:', error);
        else setCompetition(data);
        setLoading(false);
    };

    const fetchRoster = async () => {
        if (!competitionId) return;
        const { data, error } = await supabase
            .from('competition_gymnasts')
            .select('gymnast_profile_id, events, gymnast_profiles(id, first_name, last_name, level, gymnast_id, gender)')
            .eq('competition_id', competitionId);

        if (error) {
            console.error('Error fetching roster:', error);
        } else if (data) {
            const mapped = data.map((d: { gymnast_profile_id: string; events: string[] | null; gymnast_profiles: { id: string; first_name: string; last_name: string; level: string | null; gymnast_id: string; gender: 'Male' | 'Female' | null } | { id: string; first_name: string; last_name: string; level: string | null; gymnast_id: string; gender: 'Male' | 'Female' | null }[] }) => ({
                gymnast_profile_id: d.gymnast_profile_id,
                events: (d.events || []) as GymEvent[],
                gymnast_profiles: Array.isArray(d.gymnast_profiles) ? d.gymnast_profiles[0] : d.gymnast_profiles
            }));
            setRoster(mapped as Gymnast[]);
        }
    };

    const toggleEvent = async (gymnastProfileId: string, event: GymEvent, currentEvents: GymEvent[]) => {
        if (!canManageRoster || !competitionId) return;

        const newEvents = currentEvents.includes(event)
            ? currentEvents.filter(e => e !== event)
            : [...currentEvents, event];

        const { error } = await supabase
            .from('competition_gymnasts')
            .update({ events: newEvents })
            .eq('competition_id', competitionId)
            .eq('gymnast_profile_id', gymnastProfileId);

        if (error) {
            console.error('Error updating events:', error);
        } else {
            // Update local state
            setRoster(prev => prev.map(g =>
                g.gymnast_profile_id === gymnastProfileId
                    ? { ...g, events: newEvents }
                    : g
            ));
        }
    };

    const getEventsForGender = (gender: 'Male' | 'Female' | null): GymEvent[] => {
        return gender === 'Male' ? MAG_EVENTS : WAG_EVENTS;
    };

    const fetchSessions = async () => {
        if (!competitionId) return;
        const { data, error } = await supabase
            .from('competition_sessions')
            .select(`
                *,
                session_coaches (
                    user_id,
                    profiles (full_name)
                ),
                session_gymnasts (
                    gymnast_profile_id,
                    gymnast_profiles (first_name, last_name, level)
                )
            `)
            .eq('competition_id', competitionId)
            .order('date', { ascending: true })
            .order('warmup_time', { ascending: true });

        if (error) console.error('Error fetching sessions:', error);
        else setSessions(data as Session[] || []);
    };

    // Helper function to group session gymnasts by level
    const groupSessionGymnastsByLevel = (sessionGymnasts: Session['session_gymnasts']) => {
        const grouped: Record<string, Session['session_gymnasts']> = {};

        sessionGymnasts.forEach(gymnast => {
            const level = gymnast.gymnast_profiles.level || 'Unassigned';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(gymnast);
        });

        // Sort levels based on the hub settings order
        const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
        const unlistedLevels = Object.keys(grouped).filter(l => !hubLevels.includes(l) && l !== 'Unassigned');
        const orderedKeys = [...sortedLevels, ...unlistedLevels];
        if (grouped['Unassigned']) orderedKeys.push('Unassigned');

        const result: Record<string, Session['session_gymnasts']> = {};
        orderedKeys.forEach(level => {
            // Sort gymnasts alphabetically by last name within each level
            result[level] = grouped[level].sort((a, b) =>
                (a.gymnast_profiles.last_name || '').localeCompare(b.gymnast_profiles.last_name || '')
            );
        });

        return result;
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!competition) {
        return <div className="p-6">Competition not found</div>;
    }

    return (
        <div className="flex h-full flex-col bg-white rounded-xl border border-slate-200">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4">
                <div className="mb-4">
                    <Link
                        to={`/hub/${competition.hub_id}/competitions`}
                        className="inline-flex items-center text-sm text-slate-500 hover:text-mint-600"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Competitions
                    </Link>
                </div>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{competition.name}</h1>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-slate-500">
                            <div className="flex items-center">
                                <Calendar className="mr-1.5 h-4 w-4 text-slate-400" />
                                {format(parseISO(competition.start_date), 'MMM d')} - {format(parseISO(competition.end_date), 'MMM d, yyyy')}
                            </div>
                            {competition.location && (
                                <div className="flex items-center">
                                    <MapPin className="mr-1.5 h-4 w-4 text-slate-400" />
                                    {competition.location}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 px-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={clsx(
                            activeTab === 'roster'
                                ? 'border-mint-500 text-mint-600'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                            'flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                        )}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Roster
                        <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                            {roster.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={clsx(
                            activeTab === 'sessions'
                                ? 'border-mint-500 text-mint-600'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                            'flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                        )}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        Sessions
                    </button>
                    <button
                        onClick={() => setActiveTab('documents')}
                        className={clsx(
                            activeTab === 'documents'
                                ? 'border-mint-500 text-mint-600'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700',
                            'flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                        )}
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Documents
                    </button>
                </nav>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {activeTab === 'roster' && (
                    <div>
                        {canManageRoster && (
                            <div className="mb-4 flex justify-end">
                                <button
                                    onClick={() => setIsManageRosterModalOpen(true)}
                                    className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                                >
                                    <Plus className="-ml-0.5 mr-1.5 h-4 w-4 text-slate-400" />
                                    Manage Roster
                                </button>
                            </div>
                        )}
                        {roster.length === 0 ? (
                            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm p-8 text-center text-slate-500">
                                No gymnasts assigned to this competition yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(rosterByLevel).map(([level, gymnasts]) => (
                                    <div key={level} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                        {/* Level Header */}
                                        <button
                                            onClick={() => toggleLevelCollapse(level)}
                                            className="flex w-full items-center justify-between bg-slate-50 px-4 py-3 text-left hover:bg-slate-100"
                                        >
                                            <div className="flex items-center gap-2">
                                                {collapsedLevels.has(level) ? (
                                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                                )}
                                                <span className="text-sm font-semibold text-slate-900">{level}</span>
                                                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                    {gymnasts.length}
                                                </span>
                                            </div>
                                        </button>
                                        {/* Gymnasts List */}
                                        {!collapsedLevels.has(level) && (
                                            <ul className="divide-y divide-slate-100">
                                                {gymnasts.map((gymnast) => {
                                                    const availableEvents = getEventsForGender(gymnast.gymnast_profiles.gender);
                                                    return (
                                                        <li key={gymnast.gymnast_profile_id} className="flex items-center justify-between p-3 hover:bg-slate-50">
                                                            <div className="flex items-center">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-100 text-mint-700 text-sm font-semibold">
                                                                    {gymnast.gymnast_profiles.first_name[0]}{gymnast.gymnast_profiles.last_name[0]}
                                                                </div>
                                                                <p className="ml-3 text-sm font-medium text-slate-900">
                                                                    {gymnast.gymnast_profiles.first_name} {gymnast.gymnast_profiles.last_name}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {availableEvents.map((event) => {
                                                                    const isActive = gymnast.events.includes(event);
                                                                    return (
                                                                        <button
                                                                            key={event}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                if (canManageRoster) {
                                                                                    toggleEvent(gymnast.gymnast_profile_id, event, gymnast.events);
                                                                                }
                                                                            }}
                                                                            disabled={!canManageRoster}
                                                                            className={clsx(
                                                                                'px-2 py-1 text-xs font-semibold rounded transition-colors',
                                                                                isActive
                                                                                    ? 'bg-mint-500 text-white'
                                                                                    : 'bg-slate-100 text-slate-400',
                                                                                canManageRoster && 'hover:bg-mint-400 hover:text-white cursor-pointer',
                                                                                !canManageRoster && 'cursor-default'
                                                                            )}
                                                                            title={canManageRoster ? `Toggle ${EVENT_LABELS[event]}` : EVENT_LABELS[event]}
                                                                        >
                                                                            {EVENT_LABELS[event]}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'sessions' && (
                    <div>
                        {canManageRoster && (
                            <div className="mb-4 flex justify-end">
                                <button
                                    onClick={() => setIsCreateSessionModalOpen(true)}
                                    className="btn-primary"
                                >
                                    <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
                                    Add Session
                                </button>
                            </div>
                        )}
                        <div className="space-y-4">
                            {sessions.map((session) => (
                                <div key={session.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    {/* Session Header */}
                                    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-base font-semibold leading-6 text-slate-900">{session.name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                                    <span className="flex items-center">
                                                        <Calendar className="mr-1 h-4 w-4 text-slate-400" />
                                                        {format(parseISO(session.date), 'MMM d, yyyy')}
                                                    </span>
                                                    {session.warmup_time && (
                                                        <span className="flex items-center">
                                                            <Clock className="mr-1 h-4 w-4 text-slate-400" />
                                                            {format(parseISO(`2000-01-01T${session.warmup_time}`), 'h:mm a')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                {session.session_coaches && session.session_coaches.length > 0 ? (
                                                    <span className="text-slate-600">
                                                        {session.session_coaches.map(c => c.profiles.full_name).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">No coaches</span>
                                                )}
                                                {canManageRoster && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsAssignCoachModalOpen(true);
                                                        }}
                                                        className="text-mint-600 hover:text-mint-500"
                                                        title="Assign coaches"
                                                    >
                                                        <UserPlus className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {/* Session Gymnasts */}
                                    <div className="px-4 py-4 sm:px-6">
                                        {session.session_gymnasts && session.session_gymnasts.length > 0 ? (
                                            <div className="space-y-4">
                                                {Object.entries(groupSessionGymnastsByLevel(session.session_gymnasts)).map(([level, gymnasts], index) => (
                                                    <div key={level}>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-semibold text-slate-700">{level}</span>
                                                                <span className="text-xs text-slate-400">({gymnasts.length})</span>
                                                            </div>
                                                            {index === 0 && canManageRoster && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedSession(session);
                                                                        setIsAssignGymnastsModalOpen(true);
                                                                    }}
                                                                    className="text-xs text-mint-600 hover:text-mint-500 flex items-center"
                                                                >
                                                                    <Users className="h-3 w-3 mr-1" />
                                                                    Manage
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                            {gymnasts.map((gymnast) => (
                                                                <div key={gymnast.gymnast_profile_id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                                                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-mint-100 text-mint-700 text-xs font-semibold">
                                                                        {gymnast.gymnast_profiles.first_name[0]}{gymnast.gymnast_profiles.last_name[0]}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-slate-900 truncate">
                                                                        {gymnast.gymnast_profiles.first_name} {gymnast.gymnast_profiles.last_name}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-slate-400 italic">No gymnasts assigned</span>
                                                {canManageRoster && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsAssignGymnastsModalOpen(true);
                                                        }}
                                                        className="text-xs text-mint-600 hover:text-mint-500 flex items-center"
                                                    >
                                                        <Users className="h-3 w-3 mr-1" />
                                                        Manage
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
                                    <Clock className="mx-auto h-12 w-12 text-slate-400" />
                                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No sessions</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        {canManageRoster ? 'Get started by creating a new session.' : 'No sessions have been scheduled yet.'}
                                    </p>
                                    {canManageRoster && (
                                        <div className="mt-6">
                                            <button
                                                onClick={() => setIsCreateSessionModalOpen(true)}
                                                className="btn-primary"
                                            >
                                                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                                Add Session
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <CompetitionDocuments competitionId={competition.id} canManage={canManageRoster} />
                )}
            </div>

            {competition && (
                <CreateSessionModal
                    isOpen={isCreateSessionModalOpen}
                    onClose={() => setIsCreateSessionModalOpen(false)}
                    onSessionCreated={fetchSessions}
                    competitionId={competition.id}
                    defaultDate={competition.start_date}
                />
            )}

            {selectedSession && (
                <AssignCoachModal
                    isOpen={isAssignCoachModalOpen}
                    onClose={() => {
                        setIsAssignCoachModalOpen(false);
                        setSelectedSession(null);
                    }}
                    onCoachesAssigned={fetchSessions}
                    sessionId={selectedSession.id}
                    currentCoachIds={selectedSession.session_coaches.map(sc => sc.user_id)}
                />
            )}

            {competition && (
                <ManageCompetitionRosterModal
                    isOpen={isManageRosterModalOpen}
                    onClose={() => setIsManageRosterModalOpen(false)}
                    onRosterUpdated={fetchRoster}
                    competitionId={competition.id}
                    currentRosterIds={roster.map(g => g.gymnast_profile_id)}
                />
            )}

            {selectedSession && competition && (
                <AssignSessionGymnastsModal
                    isOpen={isAssignGymnastsModalOpen}
                    onClose={() => {
                        setIsAssignGymnastsModalOpen(false);
                        setSelectedSession(null);
                    }}
                    onGymnastsAssigned={fetchSessions}
                    sessionId={selectedSession.id}
                    competitionId={competition.id}
                    currentGymnastIds={selectedSession.session_gymnasts?.map(sg => sg.gymnast_profile_id) || []}
                />
            )}
        </div>
    );
}
