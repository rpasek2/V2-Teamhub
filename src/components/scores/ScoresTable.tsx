import { useState, useMemo, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type {
    Competition,
    GymnastProfile,
    CompetitionScore,
    CompetitionTeamPlacement,
    GymEvent
} from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_LABELS } from '../../types';

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

// Inline editable team placement cell component
function InlineTeamPlacementCell({
    competitionId,
    level,
    gender,
    event,
    currentPlacement,
    isStaff,
    onSaved
}: {
    competitionId: string;
    level: string;
    gender: 'Female' | 'Male';
    event: GymEvent | 'all_around';
    currentPlacement: number | null;
    isStaff: boolean;
    onSaved: () => void;
}) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const formatPlacement = (placement: number | null | undefined): string => {
        if (placement == null) return '-';
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = placement % 100;
        return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };

    const handleStartEdit = () => {
        if (!isStaff) return;
        setEditing(true);
        setValue(currentPlacement?.toString() || '');
    };

    const handleCancel = () => {
        setEditing(false);
        setValue('');
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const placementNum = value ? parseInt(value) : null;

            if (placementNum !== null && (isNaN(placementNum) || placementNum < 1)) {
                alert('Placement must be a positive number');
                setSaving(false);
                return;
            }

            // Check if a record exists
            const { data: existingData } = await supabase
                .from('competition_team_placements')
                .select('id')
                .eq('competition_id', competitionId)
                .eq('level', level)
                .eq('gender', gender)
                .eq('event', event);

            const existing = existingData && existingData.length > 0 ? existingData[0] : null;

            if (existing) {
                if (placementNum === null) {
                    // Delete if cleared
                    await supabase
                        .from('competition_team_placements')
                        .delete()
                        .eq('id', existing.id);
                } else {
                    // Update existing
                    await supabase
                        .from('competition_team_placements')
                        .update({
                            placement: placementNum,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id);
                }
            } else if (placementNum !== null) {
                // Insert new
                await supabase
                    .from('competition_team_placements')
                    .insert({
                        competition_id: competitionId,
                        level,
                        gender,
                        event,
                        placement: placementNum
                    });
            }

            onSaved();
            setEditing(false);
        } catch (err) {
            console.error('Error saving team placement:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    if (editing) {
        return (
            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={saving}
                className="w-full rounded border border-brand-300 bg-white px-1 py-0.5 text-center text-sm font-bold focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
        );
    }

    const getPlacementStyles = (placement: number | null): string => {
        if (placement === 1) return 'text-amber-600 bg-amber-50'; // Gold
        if (placement === 2) return 'text-slate-500 bg-slate-100'; // Silver
        if (placement === 3) return 'text-orange-700 bg-orange-100'; // Bronze
        return 'text-brand-700';
    };

    return (
        <button
            onClick={handleStartEdit}
            disabled={!isStaff}
            className={`w-full py-1 text-sm font-bold rounded ${getPlacementStyles(currentPlacement)} ${
                isStaff ? 'hover:opacity-80 cursor-pointer' : ''
            }`}
        >
            {formatPlacement(currentPlacement)}
        </button>
    );
}

// Inline editable cell component
function InlineScoreCell({
    gymnastId,
    event,
    currentScore,
    currentPlacement,
    isCounting,
    isStaff,
    competitionId,
    onSaved,
    gender
}: {
    gymnastId: string;
    event: GymEvent;
    currentScore: number | null;
    currentPlacement: number | null;
    isCounting: boolean;
    isStaff: boolean;
    competitionId: string;
    onSaved: () => void;
    gender: 'Female' | 'Male';
}) {
    const { user } = useAuth();
    const [editingField, setEditingField] = useState<'score' | 'placement' | null>(null);
    const [scoreValue, setScoreValue] = useState('');
    const [placementValue, setPlacementValue] = useState('');
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const maxScore = gender === 'Female' ? 10.0 : 20.0;

    useEffect(() => {
        if (editingField && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingField]);

    const formatScore = (score: number | null | undefined): string => {
        if (score == null) return '-';
        return score.toFixed(3);
    };

    const formatPlacement = (placement: number | null | undefined): string => {
        if (placement == null) return '-';
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = placement % 100;
        return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };

    const getPlacementStyles = (placement: number | null): string => {
        if (placement === 1) return 'text-amber-600 bg-amber-50'; // Gold
        if (placement === 2) return 'text-slate-500 bg-slate-100'; // Silver
        if (placement === 3) return 'text-orange-700 bg-orange-100'; // Bronze
        return 'text-slate-500';
    };

    const handleStartEdit = (field: 'score' | 'placement') => {
        if (!isStaff) return;
        setEditingField(field);
        if (field === 'score') {
            setScoreValue(currentScore?.toString() || '');
        } else {
            setPlacementValue(currentPlacement?.toString() || '');
        }
    };

    const handleCancel = () => {
        setEditingField(null);
        setScoreValue('');
        setPlacementValue('');
    };

    const handleSave = async () => {
        setSaving(true);

        try {
            const scoreNum = editingField === 'score'
                ? (scoreValue ? parseFloat(scoreValue) : null)
                : currentScore;
            const placementNum = editingField === 'placement'
                ? (placementValue ? parseInt(placementValue) : null)
                : currentPlacement;

            // Validate
            if (editingField === 'score' && scoreNum !== null) {
                if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
                    alert(`Score must be between 0 and ${maxScore.toFixed(3)}`);
                    setSaving(false);
                    return;
                }
            }

            if (editingField === 'placement' && placementNum !== null) {
                if (isNaN(placementNum) || placementNum < 1) {
                    alert('Placement must be a positive number');
                    setSaving(false);
                    return;
                }
            }

            // Check if a score record exists
            const { data: existingData } = await supabase
                .from('competition_scores')
                .select('id')
                .eq('competition_id', competitionId)
                .eq('gymnast_profile_id', gymnastId)
                .eq('event', event);

            const existing = existingData && existingData.length > 0 ? existingData[0] : null;

            if (existing) {
                // Update existing
                await supabase
                    .from('competition_scores')
                    .update({
                        score: scoreNum,
                        placement: placementNum,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else if (scoreNum !== null || placementNum !== null) {
                // Insert new
                await supabase
                    .from('competition_scores')
                    .insert({
                        competition_id: competitionId,
                        gymnast_profile_id: gymnastId,
                        event,
                        score: scoreNum,
                        placement: placementNum,
                        created_by: user?.id
                    });
            }

            onSaved();
            setEditingField(null);
        } catch (err) {
            console.error('Error saving score:', err);
            alert('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const handleBlur = () => {
        handleSave();
    };

    return (
        <div className="flex">
            {/* Score cell */}
            <div className="flex-1 text-center">
                {editingField === 'score' ? (
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={scoreValue}
                        onChange={(e) => setScoreValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={saving}
                        className="w-full rounded border border-brand-300 px-1 py-0.5 text-center text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                ) : (
                    <button
                        onClick={() => handleStartEdit('score')}
                        disabled={!isStaff}
                        className={`w-full py-1 text-sm ${
                            isStaff ? 'hover:bg-slate-100 rounded cursor-pointer' : ''
                        } ${isCounting ? 'font-semibold text-brand-600' : 'text-slate-900'}`}
                    >
                        {formatScore(currentScore)}
                        {isCounting && <span className="text-brand-500">*</span>}
                    </button>
                )}
            </div>

            {/* Placement cell */}
            <div className="flex-1 text-center">
                {editingField === 'placement' ? (
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="numeric"
                        value={placementValue}
                        onChange={(e) => setPlacementValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        disabled={saving}
                        className="w-full rounded border border-brand-300 px-1 py-0.5 text-center text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                ) : (
                    <button
                        onClick={() => handleStartEdit('placement')}
                        disabled={!isStaff}
                        className={`w-full py-1 text-sm rounded ${getPlacementStyles(currentPlacement)} ${
                            isStaff ? 'hover:opacity-80 cursor-pointer' : ''
                        }`}
                    >
                        {formatPlacement(currentPlacement)}
                    </button>
                )}
            </div>
        </div>
    );
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
    const [topCountToggle, setTopCountToggle] = useState<Record<string, 3 | 5>>({});

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
                                        <th className="sticky left-0 z-10 bg-slate-50 py-3 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                                        <th className="sticky left-0 z-10 bg-slate-50"></th>
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
                                        <td className="sticky left-0 z-10 bg-brand-100 whitespace-nowrap py-3 pl-4 pr-3 text-sm text-brand-900">
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
                                                <td className="sticky left-0 z-10 bg-white whitespace-nowrap py-2 pl-4 pr-3 text-sm font-medium text-slate-900">
                                                    {gymnast.first_name} {gymnast.last_name}
                                                </td>
                                                {events.map((event, idx) => {
                                                    const scoreData = gymnastData.scores[event];
                                                    const isCounting = gymnastCounting[event];

                                                    return (
                                                        <td key={event} colSpan={2} className={`px-1 py-1 ${idx > 0 ? 'border-l border-slate-200' : ''}`}>
                                                            <InlineScoreCell
                                                                gymnastId={gymnast.id}
                                                                event={event}
                                                                currentScore={scoreData.score}
                                                                currentPlacement={scoreData.placement}
                                                                isCounting={isCounting}
                                                                isStaff={isStaff}
                                                                competitionId={competition.id}
                                                                onSaved={onScoresUpdated}
                                                                gender={gender}
                                                            />
                                                        </td>
                                                    );
                                                })}
                                                <td colSpan={2} className="px-2 py-2 border-l border-slate-200">
                                                    <div className="flex">
                                                        <span className="flex-1 text-center text-sm font-medium text-slate-900">
                                                            {formatScore(gymnastData.allAround)}
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
