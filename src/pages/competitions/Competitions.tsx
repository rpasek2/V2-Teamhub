import { useState, useEffect } from 'react';
import { Plus, Trophy, MapPin, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CreateCompetitionModal } from '../../components/competitions/CreateCompetitionModal';
import type { Competition as BaseCompetition } from '../../types';

// Extended type with joined count data
interface CompetitionWithCount extends BaseCompetition {
    competition_gymnasts?: { count: number }[];
}

export function Competitions() {
    const { hub, currentRole } = useHub();
    const [competitions, setCompetitions] = useState<CompetitionWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    useEffect(() => {
        if (hub) {
            fetchCompetitions();
        }
    }, [hub]);

    const fetchCompetitions = async () => {
        if (!hub) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('competitions')
            .select('*, competition_gymnasts(count)')
            .eq('hub_id', hub.id)
            .order('start_date', { ascending: true });

        if (error) {
            console.error('Error fetching competitions:', error);
        } else {
            setCompetitions(data || []);
        }
        setLoading(false);
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <h1 className="text-2xl font-bold text-slate-900">Competitions</h1>
                {isStaff && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                        <Plus className="-ml-0.5 mr-1.5 h-5 w-5" aria-hidden="true" />
                        New Competition
                    </button>
                )}
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent"></div>
                    </div>
                ) : competitions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {competitions.map((comp) => (
                            <Link
                                key={comp.id}
                                to={`/hub/${hub?.id}/competitions/${comp.id}`}
                                className="group relative flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-brand-300"
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 group-hover:bg-brand-100">
                                            <Trophy className="h-6 w-6" />
                                        </div>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800">
                                            {comp.competition_gymnasts?.[0]?.count || 0} Gymnasts
                                        </span>
                                    </div>
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-brand-600">
                                        {comp.name}
                                    </h3>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center text-sm text-slate-500">
                                            <Calendar className="mr-2 h-4 w-4 text-slate-400" />
                                            {format(parseISO(comp.start_date), 'MMM d')} - {format(parseISO(comp.end_date), 'MMM d, yyyy')}
                                        </div>
                                        {comp.location && (
                                            <div className="flex items-center text-sm text-slate-500">
                                                <MapPin className="mr-2 h-4 w-4 text-slate-400" />
                                                {comp.location}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-auto border-t border-slate-100 bg-slate-50 px-6 py-3">
                                    <span className="text-sm font-medium text-brand-600 group-hover:text-brand-700">
                                        View Details &rarr;
                                    </span>
                                </div>
                            </Link>
                        ))}
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
                                className="mt-6 inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500"
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
            />
        </div>
    );
}
