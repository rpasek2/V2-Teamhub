import { useState, useEffect, useMemo } from 'react';
import { Trophy, ChevronDown, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { ScoresTable } from '../components/scores/ScoresTable';
import { ScoreMetrics } from '../components/scores/ScoreMetrics';
import { SeasonPicker } from '../components/ui/SeasonPicker';
import type { Competition, GymnastProfile, CompetitionScore, CompetitionTeamPlacement, Season } from '../types';

interface CompetitionWithGymnasts extends Competition {
    competition_gymnasts: {
        gymnast_profile_id: string;
        age_group: string | null;
        gymnast_profiles: GymnastProfile;
    }[];
}

export function Scores() {
    const { hub, linkedGymnasts } = useHub();
    const { markAsViewed } = useNotifications();
    const { isStaff, isParent } = useRoleChecks();
    const [competitions, setCompetitions] = useState<CompetitionWithGymnasts[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<CompetitionWithGymnasts | null>(null);
    const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [scores, setScores] = useState<CompetitionScore[]>([]);
    const [teamPlacements, setTeamPlacements] = useState<CompetitionTeamPlacement[]>([]);
    const userGymnastIds = useMemo(() => linkedGymnasts.map(g => g.id), [linkedGymnasts]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'by-meet' | 'metrics'>('by-meet');

    // Mark scores as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('scores');
        }
    }, [hub, markAsViewed]);

    // Fetch competitions when season changes
    useEffect(() => {
        if (hub && selectedSeasonId) {
            fetchCompetitions();
        }
    }, [hub, selectedSeasonId]);

    const handleSeasonChange = (seasonId: string, _season: Season) => {
        setSelectedSeasonId(seasonId);
        setSelectedCompetition(null); // Reset competition when season changes
    };

    // Fetch scores when competition selection changes (use ID to avoid object reference issues)
    useEffect(() => {
        if (selectedCompetition) {
            fetchScores();
            fetchTeamPlacements();
        }
    }, [selectedCompetition?.id]);

    const fetchCompetitions = async () => {
        if (!hub || !selectedSeasonId) return;
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('competitions')
            .select(`
                id, hub_id, name, start_date, end_date, location, created_by, created_at, season_id, championship_type,
                competition_gymnasts(
                    gymnast_profile_id,
                    age_group,
                    gymnast_profiles(id, first_name, last_name, gender, level)
                )
            `)
            .eq('hub_id', hub.id)
            .eq('season_id', selectedSeasonId)
            .order('start_date', { ascending: false });

        if (fetchError) {
            console.error('Error fetching competitions:', fetchError);
            setError('Failed to load data. Please try refreshing.');
        } else {
            setCompetitions((data || []) as unknown as CompetitionWithGymnasts[]);
            if (data && data.length > 0) {
                setSelectedCompetition(data[0] as unknown as CompetitionWithGymnasts);
            }
        }
        setLoading(false);
    };

    const fetchScores = async () => {
        if (!selectedCompetition) return;

        const { data, error } = await supabase
            .from('competition_scores')
            .select('id, competition_id, gymnast_profile_id, event, score, placement, gymnast_level, created_at, updated_at, created_by')
            .eq('competition_id', selectedCompetition.id);

        if (error) {
            console.error('Error fetching scores:', error);
        } else {
            setScores((data || []) as unknown as CompetitionScore[]);
        }
    };

    const fetchTeamPlacements = async () => {
        if (!selectedCompetition) return;

        const { data, error } = await supabase
            .from('competition_team_placements')
            .select('id, competition_id, level, gender, event, placement, created_at, updated_at')
            .eq('competition_id', selectedCompetition.id);

        if (error) {
            console.error('Error fetching team placements:', error);
        } else {
            setTeamPlacements((data || []) as unknown as CompetitionTeamPlacement[]);
        }
    };

    // Get gymnasts for the selected competition filtered by gender
    const getGymnastsForGender = () => {
        if (!selectedCompetition) return [];
        return selectedCompetition.competition_gymnasts
            .filter(cg => cg.gymnast_profiles?.gender === activeGender)
            .map(cg => cg.gymnast_profiles);
    };

    // Build age group map from competition gymnasts
    const ageGroupMap = useMemo(() => {
        if (!selectedCompetition) return {};
        const map: Record<string, string> = {};
        selectedCompetition.competition_gymnasts.forEach(cg => {
            if (cg.age_group) {
                map[cg.gymnast_profile_id] = cg.age_group;
            }
        });
        return map;
    }, [selectedCompetition]);

    // Get unique levels from hub settings
    const getLevels = (): string[] => {
        return hub?.settings?.levels || [];
    };

    // Build set of gymnast IDs for the active gender across ALL competitions in the season
    const genderGymnastIds = useMemo(() => {
        const ids = new Set<string>();
        competitions.forEach(comp => {
            comp.competition_gymnasts.forEach(cg => {
                if (cg.gymnast_profiles?.gender === activeGender) {
                    ids.add(cg.gymnast_profile_id);
                }
            });
        });
        return ids;
    }, [competitions, activeGender]);

    // Check if there are gymnasts of each gender in the selected competition
    const hasGender = (gender: 'Female' | 'Male') => {
        if (!selectedCompetition) return false;
        return selectedCompetition.competition_gymnasts.some(
            cg => cg.gymnast_profiles?.gender === gender
        );
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line bg-surface px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-heading">Scores</h1>
                    <SeasonPicker
                        selectedSeasonId={selectedSeasonId}
                        onSeasonChange={handleSeasonChange}
                    />
                </div>
                <div className="flex bg-surface-hover rounded-lg p-1 w-fit">
                    <button
                        onClick={() => setViewMode('by-meet')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'by-meet'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-subtle hover:text-heading'
                        }`}
                    >
                        <Trophy className="w-4 h-4" />
                        By Meet
                    </button>
                    <button
                        onClick={() => setViewMode('metrics')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'metrics'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-subtle hover:text-heading'
                        }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        Metrics
                    </button>
                </div>
            </header>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                    {error}
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-6">
                {viewMode === 'metrics' ? (
                    <div className="space-y-6">
                        {/* Gender Tabs */}
                        <div className="flex rounded-lg bg-surface-hover p-1 w-fit">
                            <button
                                onClick={() => setActiveGender('Female')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeGender === 'Female'
                                        ? 'bg-surface text-heading shadow-sm'
                                        : 'text-muted hover:text-heading'
                                }`}
                            >
                                Women's
                            </button>
                            <button
                                onClick={() => setActiveGender('Male')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeGender === 'Male'
                                        ? 'bg-surface text-heading shadow-sm'
                                        : 'text-muted hover:text-heading'
                                }`}
                            >
                                Men's
                            </button>
                        </div>

                        {hub && selectedSeasonId ? (
                            <ScoreMetrics
                                hubId={hub.id}
                                seasonId={selectedSeasonId}
                                gender={activeGender}
                                isParent={isParent}
                                linkedGymnasts={linkedGymnasts}
                                levels={getLevels()}
                                genderGymnastIds={genderGymnastIds}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center py-16">
                                <div className="rounded-full bg-surface-hover p-4">
                                    <TrendingUp className="h-8 w-8 text-faint" />
                                </div>
                                <h3 className="mt-4 text-lg font-semibold text-heading">Select a Season</h3>
                                <p className="mt-2 text-sm text-muted">
                                    Choose a season above to view score metrics.
                                </p>
                            </div>
                        )}
                    </div>
                ) : loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
                    </div>
                ) : competitions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-surface-hover p-4">
                            <Trophy className="h-8 w-8 text-faint" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-heading">No competitions yet</h3>
                        <p className="mt-2 text-sm text-muted">
                            Scores will appear here once competitions are created.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Competition Selector */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="relative">
                                <select
                                    value={selectedCompetition?.id || ''}
                                    onChange={(e) => {
                                        const comp = competitions.find(c => c.id === e.target.value);
                                        setSelectedCompetition(comp || null);
                                    }}
                                    className="block w-full sm:w-80 appearance-none rounded-lg border border-line-strong bg-surface py-2.5 pl-4 pr-10 text-sm font-medium text-heading shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                                >
                                    {competitions.map((comp) => (
                                        <option key={comp.id} value={comp.id}>
                                            {comp.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
                            </div>

                            {/* Gender Tabs */}
                            <div className="flex rounded-lg bg-surface-hover p-1">
                                <button
                                    onClick={() => setActiveGender('Female')}
                                    disabled={!hasGender('Female')}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                        activeGender === 'Female'
                                            ? 'bg-surface text-heading shadow-sm'
                                            : 'text-muted hover:text-heading'
                                    } ${!hasGender('Female') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Women's
                                </button>
                                <button
                                    onClick={() => setActiveGender('Male')}
                                    disabled={!hasGender('Male')}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                        activeGender === 'Male'
                                            ? 'bg-surface text-heading shadow-sm'
                                            : 'text-muted hover:text-heading'
                                    } ${!hasGender('Male') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Men's
                                </button>
                            </div>
                        </div>

                        {/* Scores Table */}
                        {selectedCompetition && (
                            <ScoresTable
                                competition={selectedCompetition}
                                gymnasts={getGymnastsForGender()}
                                scores={scores}
                                teamPlacements={teamPlacements}
                                levels={getLevels()}
                                gender={activeGender}
                                isStaff={isStaff}
                                isParent={isParent}
                                userGymnastIds={userGymnastIds}
                                ageGroupMap={ageGroupMap}
                                onScoresUpdated={fetchScores}
                                onTeamPlacementsUpdated={fetchTeamPlacements}
                            />
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
