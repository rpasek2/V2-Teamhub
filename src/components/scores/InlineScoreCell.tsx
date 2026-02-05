import { useState, useRef, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { GymEvent, QualifyingScoresConfig, ChampionshipType } from '../../types';
import { getQualifyingLevels } from '../../lib/qualifyingScores';
import { QualifyingBadges } from './QualifyingBadge';

interface InlineScoreCellProps {
    gymnastId: string;
    gymnastLevel: string | null;
    event: GymEvent;
    currentScore: number | null;
    currentPlacement: number | null;
    isCounting: boolean;
    isStaff: boolean;
    competitionId: string;
    onSaved: () => void;
    gender: 'Female' | 'Male';
    qualifyingScores?: QualifyingScoresConfig;
    championshipType?: ChampionshipType;
}

export const InlineScoreCell = memo(function InlineScoreCell({
    gymnastId,
    gymnastLevel,
    event,
    currentScore,
    currentPlacement,
    isCounting,
    isStaff,
    competitionId,
    onSaved,
    gender,
    qualifyingScores,
    championshipType
}: InlineScoreCellProps) {
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
                // Insert new - include gymnast_level snapshot
                await supabase
                    .from('competition_scores')
                    .insert({
                        competition_id: competitionId,
                        gymnast_profile_id: gymnastId,
                        event,
                        score: scoreNum,
                        placement: placementNum,
                        gymnast_level: gymnastLevel,
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
                        <span className="inline-flex items-center gap-1">
                            {formatScore(currentScore)}
                            {isCounting && <span className="text-brand-500">*</span>}
                            {currentScore != null && (
                                <QualifyingBadges
                                    levels={getQualifyingLevels(
                                        currentScore,
                                        gymnastLevel,
                                        gender,
                                        'individual_event',
                                        qualifyingScores,
                                        championshipType ?? null
                                    )}
                                    size="sm"
                                />
                            )}
                        </span>
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
});
