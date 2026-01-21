import { useState, useEffect } from 'react';
import { Trophy, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { ScoresTable } from '../components/scores/ScoresTable';
import { SeasonPicker } from '../components/ui/SeasonPicker';
import type { Competition, GymnastProfile, CompetitionScore, CompetitionTeamPlacement, Season } from '../types';

interface CompetitionWithGymnasts extends Competition {
    competition_gymnasts: {
        gymnast_profile_id: string;
        gymnast_profiles: GymnastProfile;
    }[];
}

export function Scores() {
    const { hub } = useHub();
    const { user } = useAuth();
    const { markAsViewed } = useNotifications();
    const { isStaff, isParent } = useRoleChecks();
    const [competitions, setCompetitions] = useState<CompetitionWithGymnasts[]>([]);
    const [selectedCompetition, setSelectedCompetition] = useState<CompetitionWithGymnasts | null>(null);
    const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<CompetitionScore[]>([]);
    const [teamPlacements, setTeamPlacements] = useState<CompetitionTeamPlacement[]>([]);
    const [userGymnastIds, setUserGymnastIds] = useState<string[]>([]);
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

    // Mark scores as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('scores');
        }
    }, [hub, markAsViewed]);

    // Fetch user's linked gymnasts if parent
    useEffect(() => {
        if (isParent && user && hub) {
            fetchUserGymnasts();
        }
    }, [hub, user, isParent]);

    // Fetch competitions when season changes
    useEffect(() => {
        if (hub && selectedSeasonId) {
            fetchCompetitions();
        } else if (hub && !selectedSeasonId) {
            // Season not yet selected, stop loading state
            setLoading(false);
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

        const { data, error } = await supabase
            .from('competitions')
            .select(`
                *,
                competition_gymnasts(
                    gymnast_profile_id,
                    gymnast_profiles(id, first_name, last_name, gender, level)
                )
            `)
            .eq('hub_id', hub.id)
            .eq('season_id', selectedSeasonId)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Error fetching competitions:', error);
        } else {
            setCompetitions(data || []);
            if (data && data.length > 0) {
                setSelectedCompetition(data[0]);
            }
        }
        setLoading(false);
    };

    const fetchUserGymnasts = async () => {
        if (!hub || !user) return;

        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('id')
            .eq('hub_id', hub.id)
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching user gymnasts:', error);
        } else {
            setUserGymnastIds(data?.map(g => g.id) || []);
        }
    };

    const fetchScores = async () => {
        if (!selectedCompetition) return;

        const { data, error } = await supabase
            .from('competition_scores')
            .select('*, gymnast_profiles(*)')
            .eq('competition_id', selectedCompetition.id);

        if (error) {
            console.error('Error fetching scores:', error);
        } else {
            setScores(data || []);
        }
    };

    const fetchTeamPlacements = async () => {
        if (!selectedCompetition) return;

        const { data, error } = await supabase
            .from('competition_team_placements')
            .select('*')
            .eq('competition_id', selectedCompetition.id);

        if (error) {
            console.error('Error fetching team placements:', error);
        } else {
            setTeamPlacements(data || []);
        }
    };

    // Get gymnasts for the selected competition filtered by gender
    const getGymnastsForGender = () => {
        if (!selectedCompetition) return [];
        return selectedCompetition.competition_gymnasts
            .filter(cg => cg.gymnast_profiles?.gender === activeGender)
            .map(cg => cg.gymnast_profiles);
    };

    // Get unique levels from hub settings
    const getLevels = (): string[] => {
        return hub?.settings?.levels || [];
    };

    // Check if there are gymnasts of each gender in the selected competition
    const hasGender = (gender: 'Female' | 'Male') => {
        if (!selectedCompetition) return false;
        return selectedCompetition.competition_gymnasts.some(
            cg => cg.gymnast_profiles?.gender === gender
        );
    };

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900">Scores</h1>
                    <SeasonPicker
                        selectedSeasonId={selectedSeasonId}
                        onSeasonChange={handleSeasonChange}
                    />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                    </div>
                ) : competitions.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-4">
                            <Trophy className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">No competitions yet</h3>
                        <p className="mt-2 text-sm text-slate-500">
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
                                    className="block w-full sm:w-80 appearance-none rounded-lg border border-slate-300 bg-white py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm focus:border-mint-500 focus:outline-none focus:ring-1 focus:ring-mint-500"
                                >
                                    {competitions.map((comp) => (
                                        <option key={comp.id} value={comp.id}>
                                            {comp.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            </div>

                            {/* Gender Tabs */}
                            <div className="flex rounded-lg bg-slate-100 p-1">
                                <button
                                    onClick={() => setActiveGender('Female')}
                                    disabled={!hasGender('Female')}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                        activeGender === 'Female'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                    } ${!hasGender('Female') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Women's
                                </button>
                                <button
                                    onClick={() => setActiveGender('Male')}
                                    disabled={!hasGender('Male')}
                                    className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                        activeGender === 'Male'
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
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
