import { useState, useEffect } from 'react';
import { Loader2, Shuffle, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import { Modal } from '../ui/Modal';
import type { GymnastProfile } from '../../types';

interface RandomAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    hubId: string;
}

interface LevelOption {
    level: string;
    count: number;
    selected: boolean;
}

export function RandomAssignModal({ isOpen, onClose, onCreated, hubId }: RandomAssignModalProps) {
    const { user } = useAuth();
    const { hub } = useHub();
    const [loading, setLoading] = useState(false);
    const [loadingGymnasts, setLoadingGymnasts] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
    const [bigLevels, setBigLevels] = useState<LevelOption[]>([]);
    const [littleLevels, setLittleLevels] = useState<LevelOption[]>([]);
    const [clearExisting, setClearExisting] = useState(false);

    // Get configured levels from hub settings, or extract from gymnasts
    const getAvailableLevels = (gymnastList: GymnastProfile[]): string[] => {
        const configuredLevels = hub?.settings?.levels as string[] | undefined;
        if (configuredLevels && configuredLevels.length > 0) {
            return configuredLevels;
        }
        // Extract unique levels from gymnasts
        const uniqueLevels = [...new Set(gymnastList.map(g => g.level))];
        return uniqueLevels.sort();
    };

    useEffect(() => {
        if (isOpen) {
            fetchGymnasts();
            setError(null);
            setSuccess(null);
            setClearExisting(false);
        }
    }, [isOpen, hubId]);

    const fetchGymnasts = async () => {
        setLoadingGymnasts(true);
        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('*')
            .eq('hub_id', hubId)
            .order('level', { ascending: true })
            .order('first_name', { ascending: true });

        if (error) {
            console.error('Error fetching gymnasts:', error);
            setLoadingGymnasts(false);
            return;
        }

        const gymnastList = data || [];
        setGymnasts(gymnastList);

        // Build level options with counts
        const levels = getAvailableLevels(gymnastList);
        const levelCounts = new Map<string, number>();
        gymnastList.forEach(g => {
            levelCounts.set(g.level, (levelCounts.get(g.level) || 0) + 1);
        });

        const levelOptions: LevelOption[] = levels.map(level => ({
            level,
            count: levelCounts.get(level) || 0,
            selected: false
        }));

        setBigLevels(levelOptions.map(l => ({ ...l })));
        setLittleLevels(levelOptions.map(l => ({ ...l })));
        setLoadingGymnasts(false);
    };

    const toggleBigLevel = (level: string) => {
        setBigLevels(prev => prev.map(l =>
            l.level === level ? { ...l, selected: !l.selected } : l
        ));
    };

    const toggleLittleLevel = (level: string) => {
        setLittleLevels(prev => prev.map(l =>
            l.level === level ? { ...l, selected: !l.selected } : l
        ));
    };

    const getSelectedBigs = (): GymnastProfile[] => {
        const selectedLevels = bigLevels.filter(l => l.selected).map(l => l.level);
        return gymnasts.filter(g => selectedLevels.includes(g.level));
    };

    const getSelectedLittles = (): GymnastProfile[] => {
        const selectedLevels = littleLevels.filter(l => l.selected).map(l => l.level);
        return gymnasts.filter(g => selectedLevels.includes(g.level));
    };

    const handleRandomAssign = async () => {
        const bigs = getSelectedBigs();
        const littles = getSelectedLittles();

        if (bigs.length === 0) {
            setError('Please select at least one level for Bigs');
            return;
        }
        if (littles.length === 0) {
            setError('Please select at least one level for Littles');
            return;
        }

        // Check for overlap - same gymnast can't be both Big and Little
        const bigIds = new Set(bigs.map(b => b.id));
        const overlapping = littles.filter(l => bigIds.has(l.id));
        if (overlapping.length > 0) {
            setError('Some gymnasts are selected as both Big and Little. Please ensure Big and Little levels don\'t overlap.');
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // Optionally clear existing pairings first
            if (clearExisting) {
                const { error: deleteError } = await supabase
                    .from('mentorship_pairs')
                    .delete()
                    .eq('hub_id', hubId);

                if (deleteError) throw deleteError;
            }

            // Shuffle both arrays for randomness
            const shuffledBigs = [...bigs].sort(() => Math.random() - 0.5);
            const shuffledLittles = [...littles].sort(() => Math.random() - 0.5);

            // Create pairings: each Little gets exactly one Big (never multiple Bigs)
            // If more Littles than Bigs, some Bigs get multiple Littles
            // If more Bigs than Littles, some Bigs won't get a Little
            const pairings: { big_gymnast_id: string; little_gymnast_id: string }[] = [];

            for (let i = 0; i < shuffledLittles.length; i++) {
                const little = shuffledLittles[i];
                // Cycle through bigs if we have more littles than bigs
                const big = shuffledBigs[i % shuffledBigs.length];

                pairings.push({
                    big_gymnast_id: big.id,
                    little_gymnast_id: little.id
                });
            }

            // Insert all pairings
            const pairingsToInsert = pairings.map(p => ({
                hub_id: hubId,
                big_gymnast_id: p.big_gymnast_id,
                little_gymnast_id: p.little_gymnast_id,
                paired_date: new Date().toISOString().split('T')[0],
                notes: 'Randomly assigned',
                created_by: user?.id,
                status: 'active'
            }));

            const { error: insertError } = await supabase
                .from('mentorship_pairs')
                .insert(pairingsToInsert);

            if (insertError) {
                if (insertError.code === '23505') {
                    throw new Error('Some pairings already exist. Try enabling "Clear existing pairings" option.');
                }
                throw insertError;
            }

            setSuccess(`Successfully created ${pairings.length} pairing${pairings.length !== 1 ? 's' : ''}!`);

            // Close after short delay to show success message
            setTimeout(() => {
                onCreated();
            }, 1500);

        } catch (err: unknown) {
            console.error('Error creating random pairings:', err);
            setError(err instanceof Error ? err.message : 'Failed to create pairings');
        } finally {
            setLoading(false);
        }
    };

    const selectedBigCount = getSelectedBigs().length;
    const selectedLittleCount = getSelectedLittles().length;
    const willDoubleLittles = selectedLittleCount > selectedBigCount && selectedBigCount > 0;
    const unassignedBigs = selectedBigCount > selectedLittleCount ? selectedBigCount - selectedLittleCount : 0;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Random Assign Pairings">
            <div className="space-y-4">
                {loadingGymnasts ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-600">
                            Select which levels should be Bigs (mentors) and which should be Littles (mentees).
                            Each Big will be randomly assigned exactly one Little.
                        </p>

                        {/* Big Levels Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Big (Mentor) Levels
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {bigLevels.map(({ level, count, selected }) => (
                                    <button
                                        key={`big-${level}`}
                                        type="button"
                                        onClick={() => toggleBigLevel(level)}
                                        disabled={count === 0}
                                        className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all ${
                                            selected
                                                ? 'border-purple-500 bg-purple-100 text-purple-700'
                                                : count === 0
                                                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'border-slate-300 bg-white text-slate-600 hover:border-purple-300'
                                        }`}
                                    >
                                        {level} ({count})
                                    </button>
                                ))}
                            </div>
                            {selectedBigCount > 0 && (
                                <p className="mt-1 text-xs text-purple-600">
                                    {selectedBigCount} gymnast{selectedBigCount !== 1 ? 's' : ''} selected as Bigs
                                </p>
                            )}
                        </div>

                        {/* Little Levels Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Little (Mentee) Levels
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {littleLevels.map(({ level, count, selected }) => (
                                    <button
                                        key={`little-${level}`}
                                        type="button"
                                        onClick={() => toggleLittleLevel(level)}
                                        disabled={count === 0}
                                        className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all ${
                                            selected
                                                ? 'border-pink-500 bg-pink-100 text-pink-700'
                                                : count === 0
                                                    ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'border-slate-300 bg-white text-slate-600 hover:border-pink-300'
                                        }`}
                                    >
                                        {level} ({count})
                                    </button>
                                ))}
                            </div>
                            {selectedLittleCount > 0 && (
                                <p className="mt-1 text-xs text-pink-600">
                                    {selectedLittleCount} gymnast{selectedLittleCount !== 1 ? 's' : ''} selected as Littles
                                </p>
                            )}
                        </div>

                        {/* Warnings */}
                        {willDoubleLittles && (
                            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    There are more Littles ({selectedLittleCount}) than Bigs ({selectedBigCount}).
                                    Some Bigs will get multiple Littles.
                                </span>
                            </div>
                        )}

                        {unassignedBigs > 0 && (
                            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                <span>
                                    There are more Bigs ({selectedBigCount}) than Littles ({selectedLittleCount}).
                                    {unassignedBigs} Big{unassignedBigs !== 1 ? 's' : ''} won't get a Little.
                                </span>
                            </div>
                        )}

                        {/* Clear existing option */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={clearExisting}
                                onChange={(e) => setClearExisting(e.target.checked)}
                                className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500"
                            />
                            <span className="text-sm text-slate-600">
                                Clear all existing pairings before assigning
                            </span>
                        </label>

                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
                                <Check className="h-4 w-4" />
                                {success}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleRandomAssign}
                                disabled={loading || selectedBigCount === 0 || selectedLittleCount === 0 || !!success}
                                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Shuffle className="h-4 w-4 mr-2" />
                                )}
                                Assign Randomly
                            </button>
                        </div>
                    </>
                )}
            </div>
        </Modal>
    );
}
