import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { CompetitionTeamPlacement, GymEvent } from '../../types';
import { EVENT_FULL_NAMES } from '../../types';

interface TeamPlacementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlacementsSaved: () => void;
    competitionId: string;
    level: string;
    gender: 'Female' | 'Male';
    events: GymEvent[];
    existingPlacements: CompetitionTeamPlacement[];
}

export function TeamPlacementModal({
    isOpen,
    onClose,
    onPlacementsSaved,
    competitionId,
    level,
    gender,
    events,
    existingPlacements
}: TeamPlacementModalProps) {
    const [placements, setPlacements] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Initialize placements from existing data
            const initial: Record<string, string> = {};
            events.forEach(event => {
                const existing = existingPlacements.find(p => p.event === event);
                initial[event] = existing?.placement?.toString() || '';
            });
            // Also handle all_around
            const aaExisting = existingPlacements.find(p => p.event === 'all_around');
            initial['all_around'] = aaExisting?.placement?.toString() || '';

            setPlacements(initial);
            setError(null);
        }
    }, [isOpen, existingPlacements, events]);

    const handleSave = async () => {
        setError(null);
        setSaving(true);

        try {
            // Process each event placement
            const allEvents: (GymEvent | 'all_around')[] = [...events, 'all_around'];

            for (const event of allEvents) {
                const placementValue = placements[event];
                const placementNum = placementValue ? parseInt(placementValue) : null;
                const existing = existingPlacements.find(p => p.event === event);

                if (placementNum !== null && !isNaN(placementNum) && placementNum >= 1) {
                    if (existing) {
                        // Update existing
                        const { error: updateError } = await supabase
                            .from('competition_team_placements')
                            .update({
                                placement: placementNum,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', existing.id);

                        if (updateError) throw updateError;
                    } else {
                        // Insert new
                        const { error: insertError } = await supabase
                            .from('competition_team_placements')
                            .insert({
                                competition_id: competitionId,
                                level,
                                gender,
                                event,
                                placement: placementNum
                            });

                        if (insertError) throw insertError;
                    }
                } else if (existing && (placementValue === '' || placementValue === null)) {
                    // Delete existing if cleared
                    const { error: deleteError } = await supabase
                        .from('competition_team_placements')
                        .delete()
                        .eq('id', existing.id);

                    if (deleteError) throw deleteError;
                }
            }

            onPlacementsSaved();
            onClose();
        } catch (err) {
            console.error('Error saving placements:', err);
            setError('Failed to save placements. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                <div className="fixed inset-0 bg-slate-500/75 transition-opacity" onClick={onClose} />

                <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Team Placements
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                {level} - {gender === 'Female' ? "Women's" : "Men's"}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-md text-slate-400 hover:text-slate-500"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="px-6 py-4">
                        {error && (
                            <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="space-y-4">
                            <p className="text-sm text-slate-500">
                                Enter the team placement for each event and overall.
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {events.map(event => (
                                    <div key={event}>
                                        <label htmlFor={`placement-${event}`} className="block text-sm font-medium text-slate-700">
                                            {EVENT_FULL_NAMES[event]}
                                        </label>
                                        <input
                                            type="number"
                                            id={`placement-${event}`}
                                            min="1"
                                            value={placements[event] || ''}
                                            onChange={(e) => setPlacements(prev => ({
                                                ...prev,
                                                [event]: e.target.value
                                            }))}
                                            placeholder="e.g., 1"
                                            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-slate-200 pt-4">
                                <label htmlFor="placement-aa" className="block text-sm font-medium text-slate-700">
                                    All-Around (Team Total)
                                </label>
                                <input
                                    type="number"
                                    id="placement-aa"
                                    min="1"
                                    value={placements['all_around'] || ''}
                                    onChange={(e) => setPlacements(prev => ({
                                        ...prev,
                                        all_around: e.target.value
                                    }))}
                                    placeholder="e.g., 1"
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Placements'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
