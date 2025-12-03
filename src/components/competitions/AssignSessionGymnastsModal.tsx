import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, AlertCircle, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface AssignSessionGymnastsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGymnastsAssigned: () => void;
    sessionId: string;
    competitionId: string;
    currentGymnastIds: string[];
}

interface Gymnast {
    gymnast_profile_id: string;
    gymnast_profiles: {
        id: string;
        first_name: string;
        last_name: string;
        level: string | null;
    };
}

export function AssignSessionGymnastsModal({ isOpen, onClose, onGymnastsAssigned, sessionId, competitionId, currentGymnastIds }: AssignSessionGymnastsModalProps) {
    const { hub } = useHub();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [roster, setRoster] = useState<Gymnast[]>([]);
    const [selectedGymnasts, setSelectedGymnasts] = useState<string[]>([]);
    const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

    // Get levels from hub settings
    const hubLevels = hub?.settings?.levels || [];

    useEffect(() => {
        if (isOpen) {
            fetchCompetitionRoster();
            setSelectedGymnasts(currentGymnastIds);
        }
    }, [isOpen, competitionId, currentGymnastIds]);

    const fetchCompetitionRoster = async () => {
        const { data, error } = await supabase
            .from('competition_gymnasts')
            .select('gymnast_profile_id, gymnast_profiles(id, first_name, last_name, level)')
            .eq('competition_id', competitionId);

        if (error) {
            console.error('Error fetching competition roster:', error);
        } else if (data) {
            const mapped = data.map((d: { gymnast_profile_id: string; gymnast_profiles: { id: string; first_name: string; last_name: string; level: string | null } | { id: string; first_name: string; last_name: string; level: string | null }[] }) => ({
                gymnast_profile_id: d.gymnast_profile_id,
                gymnast_profiles: Array.isArray(d.gymnast_profiles) ? d.gymnast_profiles[0] : d.gymnast_profiles
            }));
            setRoster(mapped as Gymnast[]);
        }
    };

    // Group roster by level
    const rosterByLevel = useMemo(() => {
        const grouped: Record<string, Gymnast[]> = {};

        roster.forEach(gymnast => {
            const level = gymnast.gymnast_profiles.level || 'Unassigned';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(gymnast);
        });

        // Sort levels based on the hub settings order
        const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
        const unlistedLevels = Object.keys(grouped).filter(l => !hubLevels.includes(l) && l !== 'Unassigned');
        const orderedKeys = [...sortedLevels, ...unlistedLevels];
        if (grouped['Unassigned']) orderedKeys.push('Unassigned');

        const result: Record<string, Gymnast[]> = {};
        orderedKeys.forEach(level => {
            // Sort gymnasts alphabetically by last name within each level
            result[level] = grouped[level].sort((a, b) =>
                (a.gymnast_profiles.last_name || '').localeCompare(b.gymnast_profiles.last_name || '')
            );
        });

        return result;
    }, [roster, hubLevels]);

    const toggleLevelCollapse = (level: string) => {
        setCollapsedLevels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(level)) {
                newSet.delete(level);
            } else {
                newSet.add(level);
            }
            return newSet;
        });
    };

    const toggleGymnast = (gymnastProfileId: string) => {
        setSelectedGymnasts(prev =>
            prev.includes(gymnastProfileId)
                ? prev.filter(id => id !== gymnastProfileId)
                : [...prev, gymnastProfileId]
        );
    };

    const toggleLevel = (level: string) => {
        const levelGymnastIds = rosterByLevel[level]?.map(g => g.gymnast_profile_id) || [];
        const allSelected = levelGymnastIds.every(id => selectedGymnasts.includes(id));

        if (allSelected) {
            // Deselect all in this level
            setSelectedGymnasts(prev => prev.filter(id => !levelGymnastIds.includes(id)));
        } else {
            // Select all in this level
            setSelectedGymnasts(prev => [...new Set([...prev, ...levelGymnastIds])]);
        }
    };

    const isLevelFullySelected = (level: string) => {
        const levelGymnastIds = rosterByLevel[level]?.map(g => g.gymnast_profile_id) || [];
        return levelGymnastIds.length > 0 && levelGymnastIds.every(id => selectedGymnasts.includes(id));
    };

    const isLevelPartiallySelected = (level: string) => {
        const levelGymnastIds = rosterByLevel[level]?.map(g => g.gymnast_profile_id) || [];
        const selectedCount = levelGymnastIds.filter(id => selectedGymnasts.includes(id)).length;
        return selectedCount > 0 && selectedCount < levelGymnastIds.length;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const toAdd = selectedGymnasts.filter(id => !currentGymnastIds.includes(id));
            const toRemove = currentGymnastIds.filter(id => !selectedGymnasts.includes(id));

            if (toAdd.length > 0) {
                const { error: addError } = await supabase
                    .from('session_gymnasts')
                    .insert(toAdd.map(gymnastProfileId => ({ session_id: sessionId, gymnast_profile_id: gymnastProfileId })));
                if (addError) throw addError;
            }

            if (toRemove.length > 0) {
                const { error: removeError } = await supabase
                    .from('session_gymnasts')
                    .delete()
                    .eq('session_id', sessionId)
                    .in('gymnast_profile_id', toRemove);
                if (removeError) throw removeError;
            }

            onGymnastsAssigned();
            onClose();
        } catch (err: any) {
            console.error('Error assigning gymnasts:', err);
            setError(err.message || 'Failed to assign gymnasts');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-[10000] w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                {/* Close Button */}
                <div className="absolute top-4 right-4">
                    <button
                        type="button"
                        className="rounded-md text-slate-400 hover:text-slate-500"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-slate-900 pr-8" id="modal-title">
                    Assign Gymnasts to Session
                </h3>

                {/* Content */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">
                            Select Gymnasts from Competition Roster
                        </label>
                        <div className="mt-1.5 max-h-80 overflow-y-auto rounded-md border border-slate-300">
                            {roster.length > 0 ? (
                                <div className="divide-y divide-slate-200">
                                    {Object.entries(rosterByLevel).map(([level, gymnasts]) => (
                                        <div key={level}>
                                            {/* Level Header */}
                                            <div className="flex items-center bg-slate-50">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLevelCollapse(level)}
                                                    className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-slate-700"
                                                >
                                                    {collapsedLevels.has(level) ? (
                                                        <ChevronRight className="h-4 w-4" />
                                                    ) : (
                                                        <ChevronDown className="h-4 w-4" />
                                                    )}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleLevel(level)}
                                                    className="flex flex-1 items-center justify-between py-2 pr-3 text-left hover:bg-slate-100"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900">{level}</span>
                                                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                                            {gymnasts.length}
                                                        </span>
                                                    </div>
                                                    <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                                                        isLevelFullySelected(level)
                                                            ? 'border-brand-600 bg-brand-600'
                                                            : isLevelPartiallySelected(level)
                                                                ? 'border-brand-600 bg-brand-100'
                                                                : 'border-slate-300'
                                                    }`}>
                                                        {isLevelFullySelected(level) && (
                                                            <Check className="h-3 w-3 text-white" />
                                                        )}
                                                        {isLevelPartiallySelected(level) && (
                                                            <div className="h-2 w-2 rounded-sm bg-brand-600" />
                                                        )}
                                                    </div>
                                                </button>
                                            </div>
                                            {/* Gymnasts List */}
                                            {!collapsedLevels.has(level) && (
                                                <div className="divide-y divide-slate-100">
                                                    {gymnasts.map((gymnast) => (
                                                        <div
                                                            key={gymnast.gymnast_profile_id}
                                                            className={`flex cursor-pointer items-center justify-between px-3 py-2 pl-10 hover:bg-slate-50 ${
                                                                selectedGymnasts.includes(gymnast.gymnast_profile_id) ? 'bg-brand-50' : ''
                                                            }`}
                                                            onClick={() => toggleGymnast(gymnast.gymnast_profile_id)}
                                                        >
                                                            <span className="text-sm text-slate-900">
                                                                {gymnast.gymnast_profiles.first_name} {gymnast.gymnast_profiles.last_name}
                                                            </span>
                                                            {selectedGymnasts.includes(gymnast.gymnast_profile_id) && (
                                                                <Check className="h-4 w-4 text-brand-600" />
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="px-3 py-4 text-sm text-slate-500 text-center">No gymnasts in competition roster.</p>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {selectedGymnasts.length} selected
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Assignments'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
