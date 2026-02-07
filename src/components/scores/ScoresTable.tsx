import { useState, useMemo } from 'react';
import { useHub } from '../../context/HubContext';
import type {
    Competition,
    GymnastProfile,
    CompetitionScore,
    CompetitionTeamPlacement,
    GymEvent
} from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS } from '../../types';
import { getQualifyingLevels } from '../../lib/qualifyingScores';
import { QualifyingBadges } from './QualifyingBadge';
import { InlineTeamPlacementCell } from './InlineTeamPlacementCell';
import { InlineScoreCell } from './InlineScoreCell';

interface ScoresTableProps {
    competition: Competition;
    gymnasts: GymnastProfile[];
    scores: CompetitionScore[];
    teamPlacements: CompetitionTeamPlacement[];
    levels: string[];
    gender: 'Female' | 'Male';
    isStaff: boolean;
    isParent: boolean;
    userGymnastIds: string[];
    onScoresUpdated: () => void;
    onTeamPlacementsUpdated: () => void;
}

interface GymnastScoreData {
    gymnast: GymnastProfile;
    scores: Record<GymEvent, { score: number | null; placement: number | null }>;
    allAround: number | null;
    allAroundPlacement: number | null;
    countingScores: Record<GymEvent, boolean>;
}

interface TeamScoreData {
    level: string;
    eventScores: Record<GymEvent, number | null>;
    eventPlacements: Record<GymEvent | 'all_around', number | null>;
    allAroundTotal: number | null;
}

export function ScoresTable({
    competition,
    gymnasts,
    scores,
    teamPlacements,
    levels,
    gender,
    isStaff,
    isParent,
    userGymnastIds,
    onScoresUpdated,
    onTeamPlacementsUpdated
}: ScoresTableProps) {
    const { hub } = useHub();
    const [topCountToggle, setTopCountToggle] = useState<Record<string, 3 | 5>>({});

    const qualifyingScores = hub?.settings?.qualifyingScores;

    const events: GymEvent[] = gender === 'Female' ? WAG_EVENTS : MAG_EVENTS;

    // Get gymnasts grouped by level
    const gymnastsByLevel = useMemo(() => {
        const grouped: Record<string, GymnastProfile[]> = {};

        gymnasts.forEach(gymnast => {
            const level = gymnast.level || 'Unassigned';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(gymnast);
        });

        // Sort levels based on the hub settings order
        const sortedLevels = levels.filter(l => grouped[l]);
        const unlistedLevels = Object.keys(grouped).filter(l => !levels.includes(l) && l !== 'Unassigned');
        const orderedKeys = [...sortedLevels, ...unlistedLevels];
        if (grouped['Unassigned']) orderedKeys.push('Unassigned');

        const result: Record<string, GymnastProfile[]> = {};
        orderedKeys.forEach(level => {
            // Sort gymnasts alphabetically by last name within each level
            result[level] = grouped[level].sort((a, b) =>
                (a.last_name || '').localeCompare(b.last_name || '')
            );
        });

        return result;
    }, [gymnasts, levels]);

    // Get score for a gymnast and event
    const getScore = (gymnastId: string, event: GymEvent) => {
        return scores.find(s => s.gymnast_profile_id === gymnastId && s.event === event);
    };

    // Calculate gymnast score data with all-around
    const getGymnastScoreData = (gymnast: GymnastProfile): GymnastScoreData => {
        const gymnastScores: Record<GymEvent, { score: number | null; placement: number | null }> = {} as Record<GymEvent, { score: number | null; placement: number | null }>;
        let allAroundTotal = 0;
        let hasAllScores = true;

        events.forEach(event => {
            const score = getScore(gymnast.id, event);
            gymnastScores[event] = {
                score: score?.score ?? null,
                placement: score?.placement ?? null
            };
            if (score?.score != null) {
                allAroundTotal += Number(score.score);
            } else {
                hasAllScores = false;
            }
        });

        return {
            gymnast,
            scores: gymnastScores,
            allAround: hasAllScores ? allAroundTotal : null,
            allAroundPlacement: null,
            countingScores: {} as Record<GymEvent, boolean>
        };
    };

    // Calculate team scores for a level
    const calculateTeamScores = (level: string, levelGymnasts: GymnastProfile[]): TeamScoreData => {
        const topCount = getTopCount(level);
        const eventScores: Record<GymEvent, number | null> = {} as Record<GymEvent, number | null>;
        let allAroundTotal = 0;

        events.forEach(event => {
            const eventScoreList = levelGymnasts
                .map(g => {
                    const score = getScore(g.id, event);
                    return score?.score != null ? Number(score.score) : null;
                })
                .filter((s): s is number => s !== null)
                .sort((a, b) => b - a);

            const topScores = eventScoreList.slice(0, topCount);
            const total = topScores.reduce((sum, s) => sum + s, 0);
            eventScores[event] = topScores.length > 0 ? total : null;

            if (total > 0) {
                allAroundTotal += total;
            }
        });

        const eventPlacements: Record<GymEvent | 'all_around', number | null> = {} as Record<GymEvent | 'all_around', number | null>;
        events.forEach(event => {
            const placement = teamPlacements.find(
                tp => tp.level === level && tp.gender === gender && tp.event === event
            );
            eventPlacements[event] = placement?.placement ?? null;
        });
        const aaPlacement = teamPlacements.find(
            tp => tp.level === level && tp.gender === gender && tp.event === 'all_around'
        );
        eventPlacements['all_around'] = aaPlacement?.placement ?? null;

        return {
            level,
            eventScores,
            eventPlacements,
            allAroundTotal: allAroundTotal > 0 ? allAroundTotal : null
        };
    };

    // Determine which scores count toward team total
    const getCountingScores = (level: string, levelGymnasts: GymnastProfile[]): Record<string, Record<GymEvent, boolean>> => {
        const topCount = getTopCount(level);
        const counting: Record<string, Record<GymEvent, boolean>> = {};

        levelGymnasts.forEach(g => {
            counting[g.id] = {} as Record<GymEvent, boolean>;
            events.forEach(event => {
                counting[g.id][event] = false;
            });
        });

        events.forEach(event => {
            const gymnastScores = levelGymnasts
                .map(g => ({
                    gymnastId: g.id,
                    score: getScore(g.id, event)?.score
                }))
                .filter(gs => gs.score != null)
                .sort((a, b) => Number(b.score) - Number(a.score));

            gymnastScores.slice(0, topCount).forEach(gs => {
                counting[gs.gymnastId][event] = true;
            });
        });

        return counting;
    };

    const isCompulsoryLevel = (level: string): boolean => {
        const levelNum = parseInt(level.replace(/\D/g, ''));
        return !isNaN(levelNum) && levelNum >= 1 && levelNum <= 5;
    };

    const getTopCount = (level: string): 3 | 5 => {
        if (isCompulsoryLevel(level)) {
            return topCountToggle[level] || 3;
        }
        return 3;
    };

    const toggleTopCount = (level: string) => {
        setTopCountToggle(prev => ({
            ...prev,
            [level]: prev[level] === 5 ? 3 : 5
        }));
    };

    const formatScore = (score: number | null | undefined): string => {
        if (score == null) return '-';
        return score.toFixed(3);
    };

    const shouldShowGymnast = (gymnast: GymnastProfile): boolean => {
        if (isStaff) return true;
        if (isParent) return userGymnastIds.includes(gymnast.id);
        return true;
    };

    if (gymnasts.length === 0) {
        return (
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
                <p className="text-sm text-slate-500">
                    No {gender === 'Female' ? "women's" : "men's"} gymnasts assigned to this competition.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {Object.entries(gymnastsByLevel).map(([level, levelGymnasts]) => {
                const teamScores = calculateTeamScores(level, levelGymnasts);
                const countingScores = getCountingScores(level, levelGymnasts);
                const visibleGymnasts = levelGymnasts.filter(shouldShowGymnast);
                const showTeamOnly = isParent && visibleGymnasts.length === 0;

                return (
                    <div key={level} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                        {/* Level Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <h3 className="text-lg font-semibold text-slate-900">{level}</h3>
                            {isCompulsoryLevel(level) && (
                                <button
                                    onClick={() => toggleTopCount(level)}
                                    className="inline-flex items-center rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                                >
                                    Top {getTopCount(level)}
                                </button>
                            )}
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead>
                                    <tr className="bg-slate-50">
                                        <th className="sticky left-0 z-10 bg-slate-50 py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-48 min-w-48 max-w-48">
                                            Gymnast
                                        </th>
                                        {events.map((event, idx) => (
                                            <th key={event} colSpan={2} className={`px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 ${idx > 0 ? 'border-l border-slate-200' : ''}`}>
                                                {EVENT_LABELS[event]}
                                            </th>
                                        ))}
                                        <th colSpan={2} className="border-l border-slate-200 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            AA
                                        </th>
                                    </tr>
                                    <tr className="bg-slate-50 text-xs text-slate-400">
                                        <th className="sticky left-0 z-10 bg-slate-50 w-48 min-w-48 max-w-48"></th>
                                        {events.map((event, idx) => (
                                            <th key={event} colSpan={2} className={`border-b border-slate-200 ${idx > 0 ? 'border-l border-slate-200' : ''}`}>
                                                <div className="flex">
                                                    <span className="flex-1 px-2 py-1 text-center">Score</span>
                                                    <span className="flex-1 px-2 py-1 text-center">Pl</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th colSpan={2} className="border-b border-slate-200 border-l border-slate-200">
                                            <div className="flex">
                                                <span className="flex-1 px-2 py-1 text-center">Score</span>
                                                <span className="flex-1 px-2 py-1 text-center">Pl</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {/* Team Score Row */}
                                    <tr className="bg-brand-100 font-bold">
                                        <td className="sticky left-0 z-10 bg-brand-100 whitespace-nowrap py-3 pl-4 pr-3 text-sm text-brand-900 w-48 min-w-48 max-w-48">
                                            <span className="font-bold">TEAM TOTAL</span>
                                        </td>
                                        {events.map((event, idx) => (
                                            <td key={event} colSpan={2} className={`px-1 py-2 text-center ${idx > 0 ? 'border-l border-brand-200' : ''}`}>
                                                <div className="flex">
                                                    <span className="flex-1 text-sm font-bold text-brand-900 py-1">
                                                        {formatScore(teamScores.eventScores[event])}
                                                    </span>
                                                    <span className="flex-1">
                                                        <InlineTeamPlacementCell
                                                            competitionId={competition.id}
                                                            level={level}
                                                            gender={gender}
                                                            event={event}
                                                            currentPlacement={teamScores.eventPlacements[event]}
                                                            isStaff={isStaff}
                                                            onSaved={onTeamPlacementsUpdated}
                                                        />
                                                    </span>
                                                </div>
                                            </td>
                                        ))}
                                        <td colSpan={2} className="px-1 py-2 text-center border-l border-brand-200">
                                            <div className="flex">
                                                <span className="flex-1 text-sm font-bold text-brand-900 py-1">
                                                    {formatScore(teamScores.allAroundTotal)}
                                                </span>
                                                <span className="flex-1">
                                                    <InlineTeamPlacementCell
                                                        competitionId={competition.id}
                                                        level={level}
                                                        gender={gender}
                                                        event="all_around"
                                                        currentPlacement={teamScores.eventPlacements['all_around']}
                                                        isStaff={isStaff}
                                                        onSaved={onTeamPlacementsUpdated}
                                                    />
                                                </span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Individual Gymnast Rows */}
                                    {!showTeamOnly && visibleGymnasts.map((gymnast) => {
                                        const gymnastData = getGymnastScoreData(gymnast);
                                        const gymnastCounting = countingScores[gymnast.id] || {};

                                        return (
                                            <tr key={gymnast.id} className="hover:bg-slate-50">
                                                <td className="sticky left-0 z-10 bg-white py-2 pl-4 pr-3 text-sm font-medium text-slate-900 w-48 min-w-48 max-w-48 truncate">
                                                    {gymnast.first_name} {gymnast.last_name}
                                                </td>
                                                {events.map((event, idx) => {
                                                    const scoreData = gymnastData.scores[event];
                                                    const isCounting = gymnastCounting[event];

                                                    return (
                                                        <td key={event} colSpan={2} className={`px-1 py-1 ${idx > 0 ? 'border-l border-slate-200' : ''}`}>
                                                            <InlineScoreCell
                                                                gymnastId={gymnast.id}
                                                                gymnastLevel={gymnast.level}
                                                                event={event}
                                                                currentScore={scoreData.score}
                                                                currentPlacement={scoreData.placement}
                                                                isCounting={isCounting}
                                                                isStaff={isStaff}
                                                                competitionId={competition.id}
                                                                onSaved={onScoresUpdated}
                                                                gender={gender}
                                                                qualifyingScores={qualifyingScores}
                                                                championshipType={competition.championship_type}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td colSpan={2} className="px-2 py-2 border-l border-slate-200">
                                                    <div className="flex">
                                                        <span className="flex-1 text-center text-sm font-medium text-slate-900">
                                                            <span className="inline-flex items-center gap-1">
                                                                {formatScore(gymnastData.allAround)}
                                                                {gymnastData.allAround != null && (
                                                                    <QualifyingBadges
                                                                        levels={getQualifyingLevels(
                                                                            gymnastData.allAround,
                                                                            gymnast.level,
                                                                            gender,
                                                                            'all_around',
                                                                            qualifyingScores,
                                                                            competition.championship_type
                                                                        )}
                                                                        size="sm"
                                                                    />
                                                                )}
                                                            </span>
                                                        </span>
                                                        <span className="flex-1 text-center text-sm text-slate-500">
                                                            -
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {showTeamOnly && (
                                        <tr>
                                            <td colSpan={events.length * 2 + 3} className="py-4 text-center text-sm text-slate-500 italic">
                                                No gymnasts to display in this level
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Legend */}
                        <div className="border-t border-slate-200 bg-slate-50 px-4 py-2">
                            <span className="text-xs text-slate-500">
                                <span className="text-brand-500">*</span> = counts toward team score
                                {isStaff && <span className="ml-4 text-slate-400">Click any score or placement to edit</span>}
                            </span>
                        </div>
                    </div>
                );
            })}

        </div>
    );
}
