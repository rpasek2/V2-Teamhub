import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Clock, FileText, Plus, Trash2, UserPlus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { clsx } from 'clsx';
import { CreateSessionModal } from '../../components/competitions/CreateSessionModal';
import { AssignCoachModal } from '../../components/competitions/AssignCoachModal';
import { ManageCompetitionRosterModal } from '../../components/competitions/ManageCompetitionRosterModal';
import { AssignSessionGymnastsModal } from '../../components/competitions/AssignSessionGymnastsModal';
import { CompetitionDocuments } from '../../components/competitions/CompetitionDocuments';

interface Competition {
    id: string;
    hub_id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string;
}

interface Gymnast {
    user_id: string;
    profiles: {
        full_name: string;
        email: string;
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
        user_id: string;
        profiles: {
            full_name: string;
        };
    }[];
}

export function CompetitionDetails() {
    const { competitionId } = useParams();
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [activeTab, setActiveTab] = useState<'roster' | 'sessions' | 'documents'>('roster');
    const [loading, setLoading] = useState(true);
    const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
    const [isAssignCoachModalOpen, setIsAssignCoachModalOpen] = useState(false);
    const [isManageRosterModalOpen, setIsManageRosterModalOpen] = useState(false);
    const [isAssignGymnastsModalOpen, setIsAssignGymnastsModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<Session | null>(null);

    // Tab Data States
    const [roster, setRoster] = useState<Gymnast[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);

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
            .select('user_id, profiles(full_name, email)')
            .eq('competition_id', competitionId);

        if (error) console.error('Error fetching roster:', error);
        else setRoster(data as any || []);
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
                    user_id,
                    profiles (full_name)
                )
            `)
            .eq('competition_id', competitionId)
            .order('date', { ascending: true })
            .order('warmup_time', { ascending: true });

        if (error) console.error('Error fetching sessions:', error);
        else setSessions(data as any || []);
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
        <div className="flex h-full flex-col bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 px-6 py-4">
                <div className="mb-4">
                    <Link
                        to={`/hub/${competition.hub_id}/competitions`}
                        className="inline-flex items-center text-sm text-slate-500 hover:text-brand-600"
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
                                ? 'border-brand-500 text-brand-600'
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
                                ? 'border-brand-500 text-brand-600'
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
                                ? 'border-brand-500 text-brand-600'
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
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setIsManageRosterModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                            >
                                <Plus className="-ml-0.5 mr-1.5 h-4 w-4 text-slate-400" />
                                Manage Roster
                            </button>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                            <ul className="divide-y divide-slate-200">
                                {roster.map((gymnast) => (
                                    <li key={gymnast.user_id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                                        <div className="flex items-center">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 font-semibold">
                                                {gymnast.profiles.full_name[0]}
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-slate-900">{gymnast.profiles.full_name}</p>
                                                <p className="text-sm text-slate-500">{gymnast.profiles.email}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {roster.length === 0 && (
                                    <li className="p-8 text-center text-slate-500">
                                        No gymnasts assigned to this competition yet.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'sessions' && (
                    <div>
                        <div className="mb-4 flex justify-end">
                            <button
                                onClick={() => setIsCreateSessionModalOpen(true)}
                                className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
                            >
                                <Plus className="-ml-0.5 mr-1.5 h-4 w-4" />
                                Add Session
                            </button>
                        </div>
                        <div className="space-y-4">
                            {sessions.map((session) => (
                                <div key={session.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-base font-semibold leading-6 text-slate-900">{session.name}</h3>
                                            <div className="flex items-center text-sm text-slate-500">
                                                <Calendar className="mr-1.5 h-4 w-4 text-slate-400" />
                                                {format(parseISO(session.date), 'MMM d, yyyy')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                            <div className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-slate-500">Times</dt>
                                                <dd className="mt-1 text-sm text-slate-900">
                                                    <div className="flex items-center">
                                                        <span className="w-20 text-slate-500">Warmup:</span>
                                                        {session.warmup_time ? format(parseISO(`2000-01-01T${session.warmup_time}`), 'h:mm a') : 'TBD'}
                                                    </div>
                                                    <div className="flex items-center mt-1">
                                                        <span className="w-20 text-slate-500">Awards:</span>
                                                        {session.awards_time ? format(parseISO(`2000-01-01T${session.awards_time}`), 'h:mm a') : 'TBD'}
                                                    </div>
                                                </dd>
                                            </div>
                                            <div className="sm:col-span-1">
                                                <dt className="text-sm font-medium text-slate-500 flex items-center justify-between">
                                                    Coaches
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsAssignCoachModalOpen(true);
                                                        }}
                                                        className="text-xs text-brand-600 hover:text-brand-500 flex items-center"
                                                    >
                                                        <UserPlus className="h-3 w-3 mr-1" />
                                                        Assign
                                                    </button>
                                                </dt>
                                                <dd className="mt-1 text-sm text-slate-900">
                                                    {session.session_coaches && session.session_coaches.length > 0 ? (
                                                        <ul className="list-disc pl-4 space-y-1">
                                                            {session.session_coaches.map((coach) => (
                                                                <li key={coach.user_id}>{coach.profiles.full_name}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No coaches assigned</span>
                                                    )}
                                                </dd>
                                            </div>
                                            <div className="sm:col-span-2 border-t border-slate-100 pt-4 mt-2">
                                                <dt className="text-sm font-medium text-slate-500 flex items-center justify-between">
                                                    Gymnasts ({session.session_gymnasts?.length || 0})
                                                    <button
                                                        onClick={() => {
                                                            setSelectedSession(session);
                                                            setIsAssignGymnastsModalOpen(true);
                                                        }}
                                                        className="text-xs text-brand-600 hover:text-brand-500 flex items-center"
                                                    >
                                                        <Users className="h-3 w-3 mr-1" />
                                                        Manage
                                                    </button>
                                                </dt>
                                                <dd className="mt-2 text-sm text-slate-900">
                                                    {session.session_gymnasts && session.session_gymnasts.length > 0 ? (
                                                        <div className="flex flex-wrap gap-2">
                                                            {session.session_gymnasts.map((gymnast) => (
                                                                <span key={gymnast.user_id} className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                                                    {gymnast.profiles.full_name}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400 italic">No gymnasts assigned</span>
                                                    )}
                                                </dd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {sessions.length === 0 && (
                                <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
                                    <Clock className="mx-auto h-12 w-12 text-slate-400" />
                                    <h3 className="mt-2 text-sm font-semibold text-slate-900">No sessions</h3>
                                    <p className="mt-1 text-sm text-slate-500">Get started by creating a new session.</p>
                                    <div className="mt-6">
                                        <button
                                            onClick={() => setIsCreateSessionModalOpen(true)}
                                            className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
                                        >
                                            <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                            Add Session
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'documents' && (
                    <CompetitionDocuments competitionId={competition.id} />
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
                    currentRosterIds={roster.map(g => g.user_id)}
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
                    currentGymnastIds={selectedSession.session_gymnasts?.map(sg => sg.user_id) || []}
                />
            )}
        </div>
    );
}
