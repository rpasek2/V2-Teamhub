import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Clock, FileText, Plus, UserPlus, ChevronDown, ChevronRight, ExternalLink, Pencil, Trash2, Award, Medal, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { useHub } from '../../context/HubContext';
import { CreateSessionModal } from '../../components/competitions/CreateSessionModal';
import { AssignCoachModal } from '../../components/competitions/AssignCoachModal';
import { ManageCompetitionRosterModal } from '../../components/competitions/ManageCompetitionRosterModal';
import { AssignSessionGymnastsModal } from '../../components/competitions/AssignSessionGymnastsModal';
import { CompetitionDocuments } from '../../components/competitions/CompetitionDocuments';
import { CreateCompetitionModal } from '../../components/competitions/CreateCompetitionModal';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS, type GymEvent, type ChampionshipType } from '../../types';

const CHAMPIONSHIP_BADGE: Record<string, { icon: typeof Award; label: string; color: string }> = {
    state: { icon: Award, label: 'State Championship', color: 'bg-blue-500/15 text-blue-600' },
    regional: { icon: Medal, label: 'Regional Championship', color: 'bg-purple-500/15 text-purple-600' },
    national: { icon: Trophy, label: 'National Championship', color: 'bg-amber-500/15 text-amber-600' },
};

// Helper function to create Google Maps URL from location
const getGoogleMapsUrl = (location: string): string => {
    const encoded = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
};

interface Competition {
    id: string;
    hub_id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
    championship_type: ChampionshipType;
}

interface Gymnast {
    gymnast_profile_id: string;
    events: GymEvent[];
    age_group: string | null;
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
    const canManageRoster = ['owner', 'director', 'coach'].includes(currentRole || '');
    const [isAssignGymnastsModalOpen, setIsAssignGymnastsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);
    const [editSession, setEditSession] = useState<Session | null>(null);
    const [isEditCompetitionModalOpen, setIsEditCompetitionModalOpen] = useState(false);
    const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

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
            .select('id, hub_id, name, start_date, end_date, location, championship_type')
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
            .select('gymnast_profile_id, events, age_group, gymnast_profiles(id, first_name, last_name, level, gymnast_id, gender)')
            .eq('competition_id', competitionId);

        if (error) {
            console.error('Error fetching roster:', error);
        } else if (data) {
            const mapped = data.map((d: { gymnast_profile_id: string; events: string[] | null; age_group: string | null; gymnast_profiles: { id: string; first_name: string; last_name: string; level: string | null; gymnast_id: string; gender: 'Male' | 'Female' | null } | { id: string; first_name: string; last_name: string; level: string | null; gymnast_id: string; gender: 'Male' | 'Female' | null }[] }) => ({
                gymnast_profile_id: d.gymnast_profile_id,
                events: (d.events || []) as GymEvent[],
                age_group: d.age_group || null,
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

    const updateAgeGroup = async (gymnastProfileId: string, ageGroup: string) => {
        if (!canManageRoster || !competitionId) return;

        const value = ageGroup.trim() || null;
        const { error } = await supabase
            .from('competition_gymnasts')
            .update({ age_group: value })
            .eq('competition_id', competitionId)
            .eq('gymnast_profile_id', gymnastProfileId);

        if (error) {
            console.error('Error updating age group:', error);
        } else {
            setRoster(prev => prev.map(g =>
                g.gymnast_profile_id === gymnastProfileId
                    ? { ...g, age_group: value }
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

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm('Are you sure you want to delete this session? This will also remove all gymnast and coach assignments.')) {
            return;
        }

        setDeletingSessionId(sessionId);
        try {
            // Delete session (cascade will handle session_gymnasts and session_coaches)
            const { error } = await supabase
                .from('competition_sessions')
                .delete()
                .eq('id', sessionId);

            if (error) throw error;
            fetchSessions();
        } catch (err) {
            console.error('Error deleting session:', err);
            setActionError('Failed to delete session. Please try again.');
        } finally {
            setDeletingSessionId(null);
        }
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
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-600 border-t-transparent"></div>
            </div>
        );
    }

    if (!competition) {
        return <div className="p-6">Competition not found</div>;
    }

    return (
        <div className="flex h-full flex-col bg-surface-alt rounded-xl border border-line">
            {actionError && (
                <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm flex items-center justify-between">
                    <span>{actionError}</span>
                    <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 ml-2 font-medium text-xs">Dismiss</button>
                </div>
            )}
            {/* Header */}
            <div className="border-b border-line px-6 py-4">
                <div className="mb-4">
                    <Link
                        to={`/hub/${competition.hub_id}/competitions`}
                        className="inline-flex items-center text-sm text-muted hover:text-accent-600"
                    >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        Back to Competitions
                    </Link>
                </div>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl font-bold text-heading">{competition.name}</h1>
                            {competition.championship_type && CHAMPIONSHIP_BADGE[competition.championship_type] && (() => {
                                const badge = CHAMPIONSHIP_BADGE[competition.championship_type!];
                                const Icon = badge.icon;
                                return (
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}>
                                        <Icon className="h-3.5 w-3.5" />
                                        {badge.label}
                                    </span>
                                );
                            })()}
                            {canManageRoster && (
                                <button
                                    onClick={() => setIsEditCompetitionModalOpen(true)}
                                    className="p-1.5 text-faint hover:text-accent-600 hover:bg-surface-hover rounded-lg transition-colors"
                                    title="Edit competition details"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-muted">
                            <div className="flex items-center">
                                <Calendar className="mr-1.5 h-4 w-4 text-faint" />
                                {format(parseISO(competition.start_date), 'MMM d')} - {format(parseISO(competition.end_date), 'MMM d, yyyy')}
                            </div>
                            {competition.location && (
                                <a
                                    href={getGoogleMapsUrl(competition.location)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center hover:text-accent-600 transition-colors group"
                                >
                                    <MapPin className="mr-1.5 h-4 w-4 text-faint group-hover:text-accent-500" />
                                    <span className="group-hover:underline">{competition.location}</span>
                                    <ExternalLink className="ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-line px-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('roster')}
                        className={clsx(
                            activeTab === 'roster'
                                ? 'border-accent-500 text-accent-600'
                                : 'border-transparent text-muted hover:border-line-strong hover:text-body',
                            'flex items-center whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium'
                        )}
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Roster
                        <span className="ml-2 rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-subtle">
                            {roster.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={clsx(
                            activeTab === 'sessions'
                                ? 'border-accent-500 text-accent-600'
                                : 'border-transparent text-muted hover:border-line-strong hover:text-body',
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
                                ? 'border-accent-500 text-accent-600'
                                : 'border-transparent text-muted hover:border-line-strong hover:text-body',
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
                                    className="inline-flex items-center rounded-md bg-surface px-3 py-2 text-sm font-semibold text-body shadow-sm ring-1 ring-inset ring-line-strong hover:bg-surface-hover"
                                >
                                    <Plus className="-ml-0.5 mr-1.5 h-4 w-4 text-faint" />
                                    Manage Roster
                                </button>
                            </div>
                        )}
                        {roster.length === 0 ? (
                            <div className="overflow-hidden rounded-lg border border-line bg-surface-alt shadow-sm p-8 text-center text-muted">
                                No gymnasts assigned to this competition yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(rosterByLevel).map(([level, gymnasts]) => (
                                    <div key={level} className="overflow-hidden rounded-lg border border-line bg-surface-alt shadow-sm">
                                        {/* Level Header */}
                                        <button
                                            onClick={() => toggleLevelCollapse(level)}
                                            className="flex w-full items-center justify-between bg-surface px-4 py-3 text-left hover:bg-surface-hover"
                                        >
                                            <div className="flex items-center gap-2">
                                                {collapsedLevels.has(level) ? (
                                                    <ChevronRight className="h-4 w-4 text-faint" />
                                                ) : (
                                                    <ChevronDown className="h-4 w-4 text-faint" />
                                                )}
                                                <span className="text-sm font-semibold text-heading">{level}</span>
                                                <span className="rounded-full bg-surface-active px-2 py-0.5 text-xs font-medium text-subtle">
                                                    {gymnasts.length}
                                                </span>
                                            </div>
                                        </button>
                                        {/* Gymnasts List */}
                                        {!collapsedLevels.has(level) && (
                                            <ul className="divide-y divide-line">
                                                {gymnasts.map((gymnast) => {
                                                    const availableEvents = getEventsForGender(gymnast.gymnast_profiles.gender);
                                                    return (
                                                        <li key={gymnast.gymnast_profile_id} className="flex items-center justify-between p-3 hover:bg-surface-hover">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-accent-700 text-sm font-semibold flex-shrink-0">
                                                                    {gymnast.gymnast_profiles.first_name[0]}{gymnast.gymnast_profiles.last_name[0]}
                                                                </div>
                                                                <p className="text-sm font-medium text-heading">
                                                                    {gymnast.gymnast_profiles.first_name} {gymnast.gymnast_profiles.last_name}
                                                                </p>
                                                                {canManageRoster ? (
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Age group"
                                                                        defaultValue={gymnast.age_group || ''}
                                                                        onBlur={(e) => updateAgeGroup(gymnast.gymnast_profile_id, e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                                        }}
                                                                        className="w-24 px-2 py-1 text-xs rounded-md border border-line bg-surface text-subtle placeholder:text-faint focus:border-accent-500 focus:ring-1 focus:ring-accent-500 focus:outline-none"
                                                                    />
                                                                ) : gymnast.age_group ? (
                                                                    <span className="inline-flex items-center rounded-full bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-600">
                                                                        {gymnast.age_group}
                                                                    </span>
                                                                ) : null}
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
                                                                                    ? 'bg-accent-500 text-white'
                                                                                    : 'bg-surface-hover text-faint',
                                                                                canManageRoster && 'hover:bg-accent-400 hover:text-white cursor-pointer',
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
                                <div key={session.id} className="overflow-hidden rounded-lg border border-line bg-surface-alt shadow-sm">
                                    {/* Session Header */}
                                    <div className="border-b border-line bg-surface px-4 py-3 sm:px-6">
                                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                                <h3 className="text-base font-semibold leading-6 text-heading">{session.name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-muted">
                                                    <span className="flex items-center">
                                                        <Calendar className="mr-1 h-4 w-4 text-faint" />
                                                        {format(parseISO(session.date), 'MMM d, yyyy')}
                                                    </span>
                                                    {session.warmup_time && (
                                                        <span className="flex items-center">
                                                            <Clock className="mr-1 h-4 w-4 text-faint" />
                                                            {format(parseISO(`2000-01-01T${session.warmup_time}`), 'h:mm a')}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm">
                                                {session.session_coaches && session.session_coaches.length > 0 ? (
                                                    <span className="text-subtle">
                                                        {session.session_coaches.map(c => c.profiles.full_name).join(', ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-faint italic">No coaches</span>
                                                )}
                                                {canManageRoster && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSession(session);
                                                                setIsAssignCoachModalOpen(true);
                                                            }}
                                                            className="text-accent-600 hover:text-accent-500"
                                                            title="Assign coaches"
                                                        >
                                                            <UserPlus className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setEditSession(session);
                                                                setIsCreateSessionModalOpen(true);
                                                            }}
                                                            className="text-faint hover:text-subtle"
                                                            title="Edit session"
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteSession(session.id)}
                                                            disabled={deletingSessionId === session.id}
                                                            className="text-faint hover:text-red-600 disabled:opacity-50"
                                                            title="Delete session"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </>
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
                                                                <span className="text-sm font-semibold text-body">{level}</span>
                                                                <span className="text-xs text-faint">({gymnasts.length})</span>
                                                            </div>
                                                            {index === 0 && canManageRoster && (
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedSession(session);
                                                                        setIsAssignGymnastsModalOpen(true);
                                                                    }}
                                                                    className="text-xs text-accent-600 hover:text-accent-500 flex items-center"
                                                                >
                                                                    <Users className="h-3 w-3 mr-1" />
                                                                    Manage
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                                            {gymnasts.map((gymnast) => (
                                                                <div key={gymnast.gymnast_profile_id} className="flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2">
                                                                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
                                                                        {gymnast.gymnast_profiles.first_name[0]}{gymnast.gymnast_profiles.last_name[0]}
                                                                    </div>
                                                                    <span className="text-sm font-medium text-heading truncate">
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
                                                <span className="text-sm text-faint italic">No gymnasts assigned</span>
                                                {canManageRoster && (
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsAssignGymnastsModalOpen(true);
                                                        }}
                                                        className="text-xs text-accent-600 hover:text-accent-500 flex items-center"
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
                                <div className="rounded-lg border-2 border-dashed border-line p-12 text-center">
                                    <Clock className="mx-auto h-12 w-12 text-faint" />
                                    <h3 className="mt-2 text-sm font-semibold text-heading">No sessions</h3>
                                    <p className="mt-1 text-sm text-muted">
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
                    onClose={() => {
                        setIsCreateSessionModalOpen(false);
                        setEditSession(null);
                    }}
                    onSessionCreated={fetchSessions}
                    competitionId={competition.id}
                    defaultDate={competition.start_date}
                    editSession={editSession}
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

            {competition && (
                <CreateCompetitionModal
                    isOpen={isEditCompetitionModalOpen}
                    onClose={() => setIsEditCompetitionModalOpen(false)}
                    onCompetitionCreated={fetchCompetitionDetails}
                    competition={competition}
                />
            )}
        </div>
    );
}
