import { useState, useEffect } from 'react';
import { Trophy, Loader2, Calendar, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { SeasonPicker } from '../ui/SeasonPicker';
import type { Competition, CompetitionScore, Season, GymEvent } from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS, EVENT_FULL_NAMES } from '../../types';
import { getQualifyingLevels } from '../../lib/qualifyingScores';
import { QualifyingBadges } from '../scores/QualifyingBadge';
import { GymnastScoreMetrics } from '../scores/GymnastScoreMetrics';

interface GymnastScoresTabProps {
    gymnastId: string;
    gymnastGender: 'Male' | 'Female' | null;
    gymnastLevel: string | null;
}

interface CompetitionWithScores extends Competition {
    scores: CompetitionScore[];
}

export function GymnastScoresTab({ gymnastId, gymnastGender, gymnastLevel }: GymnastScoresTabProps) {
    const { hub } = useHub();
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [competitions, setCompetitions] = useState<CompetitionWithScores[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'by-meet' | 'metrics'>('by-meet');

    const events = gymnastGender === 'Male' ? MAG_EVENTS : WAG_EVENTS;
    const qualifyingScores = hub?.settings?.qualifyingScores;

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

        // Single query: start from competitions (parent), join both children via their FKs
        const { data, error } = await supabase
            .from('competitions')
            .select(`
                id, name, start_date, end_date, location, season_id, hub_id, championship_type,
                competition_gymnasts!inner(gymnast_profile_id),
                competition_scores(id, competition_id, gymnast_profile_id, event, score, placement)
            `)
            .eq('hub_id', hub.id)
            .eq('season_id', selectedSeasonId)
            .eq('competition_gymnasts.gymnast_profile_id', gymnastId)
            .eq('competition_scores.gymnast_profile_id', gymnastId);

        if (error) {
            console.error('Error fetching competitions with scores:', error);
            setLoading(false);
            return;
        }

        // Build competitions with scores from the joined result
        const competitionsWithScores: CompetitionWithScores[] = (data || [])
            .map(comp => ({
                ...comp as unknown as Competition,
                scores: (comp.competition_scores || []) as unknown as CompetitionScore[],
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
            {/* Season Picker + View Toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-body">Season:</span>
                    <SeasonPicker
                        selectedSeasonId={selectedSeasonId}
                        onSeasonChange={handleSeasonChange}
                    />
                </div>
                <div className="flex bg-surface-hover rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setViewMode('by-meet')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            viewMode === 'by-meet'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-subtle hover:text-heading'
                        }`}
                    >
                        <Trophy className="w-3.5 h-3.5" />
                        By Meet
                    </button>
                    <button
                        onClick={() => setViewMode('metrics')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                            viewMode === 'metrics'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-subtle hover:text-heading'
                        }`}
                    >
                        <TrendingUp className="w-3.5 h-3.5" />
                        Metrics
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
                </div>
            ) : !selectedSeasonId ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="rounded-full bg-surface-hover p-4">
                        <Calendar className="h-8 w-8 text-faint" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-heading">Select a Season</h3>
                    <p className="mt-2 text-sm text-muted">
                        Choose a season above to view competition scores.
                    </p>
                </div>
            ) : competitions.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="rounded-full bg-surface-hover p-4">
                        <Trophy className="h-8 w-8 text-faint" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-heading">No Competitions</h3>
                    <p className="mt-2 text-sm text-muted">
                        No competition scores found for this season.
                    </p>
                </div>
            ) : viewMode === 'metrics' ? (
                <GymnastScoreMetrics
                    gymnastGender={gymnastGender}
                    competitions={competitions}
                />
            ) : (
                <div className="space-y-6">
                    {competitions.map((competition) => {
                        const allAround = calculateAllAround(competition.scores);

                        return (
                            <div key={competition.id} className="card overflow-hidden">
                                {/* Competition Header */}
                                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                            <Trophy className="h-5 w-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-heading">
                                                {competition.name}
                                            </h3>
                                            <p className="text-xs text-muted">
                                                {format(parseISO(competition.start_date), 'MMM d, yyyy')}
                                                {competition.location && ` • ${competition.location}`}
                                            </p>
                                        </div>
                                    </div>
                                    {allAround !== null && (
                                        <div className="text-right">
                                            <p className="text-xs text-muted uppercase tracking-wide">All-Around</p>
                                            <div className="flex items-center justify-end gap-2">
                                                <p className="text-lg font-bold text-amber-600">
                                                    {allAround.toFixed(3)}
                                                </p>
                                                <QualifyingBadges
                                                    levels={getQualifyingLevels(
                                                        allAround,
                                                        gymnastLevel,
                                                        gymnastGender,
                                                        'all_around',
                                                        qualifyingScores,
                                                        competition.championship_type
                                                    )}
                                                    size="sm"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Scores Grid */}
                                <div className="p-4">
                                    {competition.scores.length === 0 ? (
                                        <p className="text-sm text-muted text-center py-4">
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
                                                                ? 'bg-surface border border-line'
                                                                : 'bg-surface-alt border border-dashed border-line'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-muted uppercase">
                                                                {EVENT_LABELS[event]}
                                                            </span>
                                                            <div className="flex items-center gap-1">
                                                                {hasScore && (
                                                                    <QualifyingBadges
                                                                        levels={getQualifyingLevels(
                                                                            scoreData?.score ?? null,
                                                                            gymnastLevel,
                                                                            gymnastGender,
                                                                            'individual_event',
                                                                            qualifyingScores,
                                                                            competition.championship_type
                                                                        )}
                                                                        size="sm"
                                                                    />
                                                                )}
                                                                {scoreData?.placement && (
                                                                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                                                                        scoreData.placement === 1
                                                                            ? 'bg-amber-500/15 text-amber-600'
                                                                            : scoreData.placement === 2
                                                                            ? 'bg-surface-active text-body'
                                                                            : scoreData.placement === 3
                                                                            ? 'bg-orange-500/15 text-orange-600'
                                                                            : 'bg-surface-hover text-subtle'
                                                                    }`}>
                                                                        {formatPlacement(scoreData.placement)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className={`text-lg font-semibold ${
                                                            hasScore ? 'text-heading' : 'text-faint'
                                                        }`}>
                                                            {hasScore ? scoreData.score?.toFixed(3) : '-'}
                                                        </p>
                                                        <p className="text-xs text-faint mt-0.5">
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
                    <p className="text-xs text-muted text-center">
                        {competitions.length} competition{competitions.length !== 1 ? 's' : ''} this season
                    </p>
                </div>
            )}
        </div>
    );
}
