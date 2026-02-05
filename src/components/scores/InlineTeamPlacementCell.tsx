import { useState, useRef, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabase';
import type { GymEvent } from '../../types';

interface InlineTeamPlacementCellProps {
    competitionId: string;
    level: string;
    gender: 'Female' | 'Male';
    event: GymEvent | 'all_around';
    currentPlacement: number | null;
    isStaff: boolean;
    onSaved: () => void;
}

export const InlineTeamPlacementCell = memo(function InlineTeamPlacementCell({
    competitionId,
    level,
    gender,
    event,
    currentPlacement,
    isStaff,
    onSaved
}: InlineTeamPlacementCellProps) {
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
});
