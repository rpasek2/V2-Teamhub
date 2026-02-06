import { useState, useEffect } from 'react';
import { Plus, Trophy, MapPin, Calendar, Trash2, Loader2, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useNotifications } from '../../context/NotificationContext';
import { useRoleChecks } from '../../hooks/useRoleChecks';
import { CreateCompetitionModal } from '../../components/competitions/CreateCompetitionModal';
import { SeasonPicker } from '../../components/ui/SeasonPicker';
import type { Competition as BaseCompetition, Season } from '../../types';

// Helper to determine competition status
type CompetitionStatus = 'past' | 'active' | 'upcoming';

const getCompetitionStatus = (startDate: string, endDate: string): CompetitionStatus => {
    const now = new Date();
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    if (isAfter(now, end)) {
        return 'past';
    } else if (isBefore(now, start)) {
        return 'upcoming';
    } else {
        return 'active';
    }
};

// Helper function to create Google Maps URL from location
const getGoogleMapsUrl = (location: string): string => {
    const encoded = encodeURIComponent(location);
    return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
};

// Extended type with joined count data
interface CompetitionWithCount extends BaseCompetition {
    competition_gymnasts?: { count: number }[];
}

export function Competitions() {
    const { hub } = useHub();
    const { markAsViewed } = useNotifications();
    const { isStaff, canManage } = useRoleChecks();
    const [competitions, setCompetitions] = useState<CompetitionWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

    // Mark competitions as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('competitions');
        }
    }, [hub, markAsViewed]);

    // Fetch competitions when season changes
    useEffect(() => {
        if (hub && selectedSeasonId) {
            fetchCompetitions();
        }
    }, [hub, selectedSeasonId]);

    const fetchCompetitions = async () => {
        if (!hub || !selectedSeasonId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('competitions')
            .select('*, competition_gymnasts(count)')
            .eq('hub_id', hub.id)
            .eq('season_id', selectedSeasonId)
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching competitions:', error);
        } else {
            setCompetitions(data || []);
        }
        setLoading(false);
    };

    const handleSeasonChange = (seasonId: string, _season: Season) => {
        setSelectedSeasonId(seasonId);
    };

    const handleDelete = async (compId: string) => {
        setDeletingId(compId);
        try {
            // Get competition details first to find associated calendar event
            const competition = competitions.find(c => c.id === compId);

            // Delete the competition (cascade handles related records)
            const { error } = await supabase
                .from('competitions')
                .delete()
                .eq('id', compId);

            if (error) throw error;

            // Also delete the associated calendar event if it exists
            // The event was created with the same title and type='competition'
            if (competition && hub) {
                await supabase
                    .from('events')
                    .delete()
                    .eq('hub_id', hub.id)
                    .eq('title', competition.name)
                    .eq('type', 'competition');
            }

            // Remove from local state
            setCompetitions(prev => prev.filter(c => c.id !== compId));
            setConfirmDeleteId(null);
        } catch (err) {
            console.error('Error deleting competition:', err);
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">Competitions</h1>
                    <SeasonPicker
                        selectedSeasonId={selectedSeasonId}
                        onSeasonChange={handleSeasonChange}
                    />
                </div>
                {isStaff && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        New Competition
                    </button>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                    </div>
                ) : competitions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {competitions.map((comp) => {
                            const status = getCompetitionStatus(comp.start_date, comp.end_date);
                            const isPast = status === 'past';
                            const isActive = status === 'active';

                            return (
                            <div
                                key={comp.id}
                                className={`group relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all ${
                                    isPast
                                        ? 'border-slate-200 bg-slate-50 opacity-70'
                                        : isActive
                                            ? 'border-green-300 bg-white hover:shadow-md hover:border-green-400 ring-2 ring-green-100'
                                            : 'border-slate-200 bg-white hover:shadow-md hover:border-brand-300'
                                }`}
                            >
                                {/* Delete confirmation overlay */}
                                {confirmDeleteId === comp.id && (
                                    <div className="absolute inset-0 z-10 bg-white/95 flex flex-col items-center justify-center p-4">
                                        <p className="text-sm font-medium text-slate-900 text-center mb-4">
                                            Delete "{comp.name}"?
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setConfirmDeleteId(null)}
                                                className="btn-secondary text-sm py-1.5 px-3"
                                                disabled={deletingId === comp.id}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={() => handleDelete(comp.id)}
                                                className="btn-danger text-sm py-1.5 px-3 flex items-center gap-1.5"
                                                disabled={deletingId === comp.id}
                                            >
                                                {deletingId === comp.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <Link
                                    to={`/hub/${hub?.id}/competitions/${comp.id}`}
                                    className="flex-1 p-6"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                                            isPast
                                                ? 'bg-slate-200 text-slate-400'
                                                : isActive
                                                    ? 'bg-green-100 text-green-600'
                                                    : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'
                                        }`}>
                                            <Trophy className="h-5 w-5" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Status badge */}
                                            {isPast && (
                                                <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                                                    Completed
                                                </span>
                                            )}
                                            {isActive && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                                                    <Clock className="h-3 w-3" />
                                                    In Progress
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                isPast ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {comp.competition_gymnasts?.[0]?.count || 0} Gymnasts
                                            </span>
                                        </div>
                                    </div>
                                    <h3 className={`mt-4 text-lg font-semibold ${
                                        isPast
                                            ? 'text-slate-500'
                                            : isActive
                                                ? 'text-slate-900 group-hover:text-green-600'
                                                : 'text-slate-900 group-hover:text-brand-600'
                                    }`}>
                                        {comp.name}
                                    </h3>
                                    <div className="mt-4 space-y-2">
                                        <div className={`flex items-center text-sm ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                                            <Calendar className={`mr-2 h-4 w-4 ${isPast ? 'text-slate-300' : 'text-slate-400'}`} />
                                            {format(parseISO(comp.start_date), 'MMM d')} - {format(parseISO(comp.end_date), 'MMM d, yyyy')}
                                        </div>
                                        {comp.location && (
                                            <div className={`flex items-center text-sm ${isPast ? 'text-slate-400' : 'text-slate-500'}`}>
                                                <MapPin className={`mr-2 h-4 w-4 ${isPast ? 'text-slate-300' : 'text-slate-400'}`} />
                                                <span>{comp.location}</span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {/* Location link - outside of main Link to avoid nested <a> tags */}
                                {comp.location && (
                                    <a
                                        href={getGoogleMapsUrl(comp.location)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mx-6 mb-4 -mt-2 flex items-center text-xs text-brand-600 hover:text-brand-700 transition-colors"
                                    >
                                        <ExternalLink className="mr-1 h-3 w-3" />
                                        Open in Google Maps
                                    </a>
                                )}

                                <div className="mt-auto border-t border-slate-200 bg-slate-50 px-6 py-3 flex items-center justify-between">
                                    <Link
                                        to={`/hub/${hub?.id}/competitions/${comp.id}`}
                                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                                    >
                                        View Details &rarr;
                                    </Link>
                                    {canManage && (
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setConfirmDeleteId(comp.id);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete competition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-4">
                            <Trophy className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">No competitions yet</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            {isStaff
                                ? 'Get started by creating your first competition.'
                                : 'Competitions will appear here once they are created.'}
                        </p>
                        {isStaff && (
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="btn-primary mt-6"
                            >
                                <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                                New Competition
                            </button>
                        )}
                    </div>
                )}
            </main>

            <CreateCompetitionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onCompetitionCreated={fetchCompetitions}
                defaultSeasonId={selectedSeasonId}
            />
        </div>
    );
}
