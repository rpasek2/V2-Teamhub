import { useState, useEffect } from 'react';
import { Trophy, Loader2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { SeasonPicker } from '../ui/SeasonPicker';
import type { Competition, CompetitionScore, Season, GymEvent } from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS, EVENT_FULL_NAMES } from '../../types';

interface GymnastScoresTabProps {
    gymnastId: string;
    gymnastGender: 'Male' | 'Female' | null;
}

interface CompetitionWithScores extends Competition {
    scores: CompetitionScore[];
}

export function GymnastScoresTab({ gymnastId, gymnastGender }: GymnastScoresTabProps) {
    const { hub } = useHub();
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [competitions, setCompetitions] = useState<CompetitionWithScores[]>([]);
    const [loading, setLoading] = useState(true);

    const events = gymnastGender === 'Male' ? MAG_EVENTS : WAG_EVENTS;

    // Fetch competitions and scores when season changes
    useEffect(() => {
        if (hub && selectedSeasonId && gymnastId) {
            fetchCompetitionsWithScores();
        } else if (hub && !selectedSeasonId) {
            setLoading(false);
        }
    }, [hub, selectedSeasonId, gymnastId]);

    const handleSeasonChange = (seasonId: string, _season: Season) => {
        setSelectedSeasonId(seasonId);
    };

    const fetchCompetitionsWithScores = async () => {
        if (!hub || !selectedSeasonId || !gymnastId) return;
        setLoading(true);

        // First get competitions this gymnast participated in for this season
        const { data: competitionGymnasts, error: cgError } = await supabase
            .from('competition_gymnasts')
            .select(`
                competition_id,
                competitions(*)
            `)
            .eq('gymnast_profile_id', gymnastId);

        if (cgError) {
            console.error('Error fetching competition gymnasts:', cgError);
            setLoading(false);
            return;
        }

        // Filter to only competitions in the selected season
        // Note: competitions is returned as an object (not array) for single joins
        const seasonCompetitions: Competition[] = (competitionGymnasts || [])
            .map(cg => cg.competitions as unknown as Competition)
            .filter((comp): comp is Competition =>
                comp !== null && comp.season_id === selectedSeasonId
            );

        if (seasonCompetitions.length === 0) {
            setCompetitions([]);
            setLoading(false);
            return;
        }

        // Get scores for this gymnast in these competitions
        const competitionIds = seasonCompetitions.map(c => c.id);
        const { data: scores, error: scoresError } = await supabase
            .from('competition_scores')
            .select('*')
            .eq('gymnast_profile_id', gymnastId)
            .in('competition_id', competitionIds);

        if (scoresError) {
            console.error('Error fetching scores:', scoresError);
        }

        // Combine competitions with their scores
        const competitionsWithScores: CompetitionWithScores[] = seasonCompetitions
            .map(comp => ({
                ...comp,
                scores: (scores || []).filter(s => s.competition_id === comp.id)
            }))
            .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

        setCompetitions(competitionsWithScores);
        setLoading(false);
    };

    const formatPlacement = (placement: number | null | undefined): string => {
        if (placement == null) return '-';
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = placement % 100;
        return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };

    const getScoreForEvent = (scores: CompetitionScore[], event: GymEvent): CompetitionScore | undefined => {
        return scores.find(s => s.event === event);
    };

    const calculateAllAround = (scores: CompetitionScore[]): number | null => {
        const eventScores = events.map(event => {
            const score = scores.find(s => s.event === event);
            return score?.score;
        }).filter((s): s is number => s !== null && s !== undefined);

        if (eventScores.length === 0) return null;
        return eventScores.reduce((sum, s) => sum + s, 0);
    };

    return (
        <div className="space-y-6">
            {/* Season Picker */}
            <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-700">Season:</span>
                <SeasonPicker
                    selectedSeasonId={selectedSeasonId}
                    onSeasonChange={handleSeasonChange}
                />
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
            ) : !selectedSeasonId ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="rounded-full bg-slate-100 p-4">
                        <Calendar className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">Select a Season</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        Choose a season above to view competition scores.
                    </p>
                </div>
            ) : competitions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="rounded-full bg-slate-100 p-4">
                        <Trophy className="h-8 w-8 text-slate-400" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">No Competitions</h3>
                    <p className="mt-2 text-sm text-slate-500">
                        No competition scores found for this season.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {competitions.map((competition) => {
                        const allAround = calculateAllAround(competition.scores);

                        return (
                            <div key={competition.id} className="card overflow-hidden">
                                {/* Competition Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                            <Trophy className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">
                                                {competition.name}
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                {format(parseISO(competition.start_date), 'MMM d, yyyy')}
                                                {competition.location && ` • ${competition.location}`}
                                            </p>
                                        </div>
                                    </div>
                                    {allAround !== null && (
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase tracking-wide">All-Around</p>
                                            <p className="text-lg font-bold text-amber-600">
                                                {allAround.toFixed(3)}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Scores Grid */}
                                <div className="p-4">
                                    {competition.scores.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-4">
                                            No scores recorded yet
                                        </p>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            {events.map((event) => {
                                                const scoreData = getScoreForEvent(competition.scores, event);
                                                const hasScore = scoreData?.score !== null && scoreData?.score !== undefined;

                                                return (
                                                    <div
                                                        key={event}
                                                        className={`rounded-lg p-3 ${
                                                            hasScore
                                                                ? 'bg-white border border-slate-200'
                                                                : 'bg-slate-50 border border-dashed border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-slate-500 uppercase">
                                                                {EVENT_LABELS[event]}
                                                            </span>
                                                            {scoreData?.placement && (
                                                                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                                    scoreData.placement === 1
                                                                        ? 'bg-amber-100 text-amber-700'
                                                                        : scoreData.placement === 2
                                                                        ? 'bg-slate-200 text-slate-700'
                                                                        : scoreData.placement === 3
                                                                        ? 'bg-orange-100 text-orange-700'
                                                                        : 'bg-slate-100 text-slate-600'
                                                                }`}>
                                                                    {formatPlacement(scoreData.placement)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className={`text-lg font-semibold ${
                                                            hasScore ? 'text-slate-900' : 'text-slate-300'
                                                        }`}>
                                                            {hasScore ? scoreData.score?.toFixed(3) : '-'}
                                                        </p>
                                                        <p className="text-xs text-slate-400 mt-0.5">
                                                            {EVENT_FULL_NAMES[event]}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Summary Footer */}
                    <p className="text-xs text-slate-500 text-center">
                        {competitions.length} competition{competitions.length !== 1 ? 's' : ''} this season
                    </p>
                </div>
            )}
        </div>
    );
}
