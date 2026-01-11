import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { GymnastProfile } from '../../types';

interface ManageLevelsModalProps {
    isOpen: boolean;
    onClose: () => void;
    gymnasts: GymnastProfile[];
    levels: string[];
    hubId: string;
    onUpdated: () => void;
}

export function ManageLevelsModal({
    isOpen,
    onClose,
    gymnasts,
    levels,
    hubId,
    onUpdated
}: ManageLevelsModalProps) {
    const [selectedGymnasts, setSelectedGymnasts] = useState<Set<string>>(new Set());
    const [targetLevel, setTargetLevel] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['No Level']));

    // Group gymnasts by their current level
    const gymnastsByLevel = useMemo(() => {
        const groups: Record<string, GymnastProfile[]> = {};

        // Initialize with "No Level" group
        groups['No Level'] = [];

        // Initialize with all configured levels
        levels.forEach(level => {
            groups[level] = [];
        });

        // Group gymnasts
        gymnasts.forEach(gymnast => {
            const level = gymnast.level || 'No Level';
            if (!groups[level]) {
                groups[level] = [];
            }
            groups[level].push(gymnast);
        });

        // Sort gymnasts within each group by name
        Object.keys(groups).forEach(level => {
            groups[level].sort((a, b) =>
                `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
            );
        });

        return groups;
    }, [gymnasts, levels]);

    // Get ordered level keys (No Level first, then configured levels, then any extras)
    const orderedLevels = useMemo(() => {
        const result: string[] = ['No Level'];
        levels.forEach(level => {
            if (!result.includes(level)) result.push(level);
        });
        Object.keys(gymnastsByLevel).forEach(level => {
            if (!result.includes(level)) result.push(level);
        });
        return result.filter(level => gymnastsByLevel[level]?.length > 0);
    }, [gymnastsByLevel, levels]);

    const toggleSection = (level: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const toggleGymnast = (gymnastId: string) => {
        setSelectedGymnasts(prev => {
            const next = new Set(prev);
            if (next.has(gymnastId)) {
                next.delete(gymnastId);
            } else {
                next.add(gymnastId);
            }
            return next;
        });
    };

    const toggleAllInLevel = (level: string) => {
        const gymnastsInLevel = gymnastsByLevel[level] || [];
        const allSelected = gymnastsInLevel.every(g => selectedGymnasts.has(g.id));

        setSelectedGymnasts(prev => {
            const next = new Set(prev);
            if (allSelected) {
                // Deselect all in this level
                gymnastsInLevel.forEach(g => next.delete(g.id));
            } else {
                // Select all in this level
                gymnastsInLevel.forEach(g => next.add(g.id));
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedGymnasts(new Set(gymnasts.map(g => g.id)));
    };

    const clearSelection = () => {
        setSelectedGymnasts(new Set());
    };

    const handleAssignLevel = async () => {
        if (selectedGymnasts.size === 0 || !targetLevel) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('gymnast_profiles')
                .update({ level: targetLevel })
                .in('id', Array.from(selectedGymnasts))
                .eq('hub_id', hubId);

            if (error) throw error;

            onUpdated();
            setSelectedGymnasts(new Set());
            setTargetLevel('');
        } catch (error) {
            console.error('Error updating levels:', error);
            alert('Failed to update levels. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setSelectedGymnasts(new Set());
        setTargetLevel('');
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-50 rounded-lg">
                            <Users className="h-5 w-5 text-brand-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Manage Levels</h2>
                            <p className="text-sm text-slate-500">Bulk assign levels to gymnasts</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Selection controls */}
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-slate-600">
                            <span className="font-medium text-slate-900">{selectedGymnasts.size}</span> selected
                        </span>
                        <button
                            onClick={selectAll}
                            className="text-sm text-brand-600 hover:text-brand-700"
                        >
                            Select all
                        </button>
                        {selectedGymnasts.size > 0 && (
                            <button
                                onClick={clearSelection}
                                className="text-sm text-slate-500 hover:text-slate-700"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>

                {/* Gymnast list by level */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {levels.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500 mb-2">No levels configured</p>
                            <p className="text-sm text-slate-400">
                                Add levels in Hub Settings before assigning gymnasts to them.
                            </p>
                        </div>
                    ) : orderedLevels.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500">No gymnasts in roster</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {orderedLevels.map(level => {
                                const gymnastsInLevel = gymnastsByLevel[level] || [];
                                const isExpanded = expandedSections.has(level);
                                const allSelected = gymnastsInLevel.length > 0 &&
                                    gymnastsInLevel.every(g => selectedGymnasts.has(g.id));
                                const someSelected = gymnastsInLevel.some(g => selectedGymnasts.has(g.id));

                                return (
                                    <div key={level} className="border border-slate-200 rounded-lg overflow-hidden">
                                        {/* Level header */}
                                        <div
                                            className="flex items-center gap-3 px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                            onClick={() => toggleSection(level)}
                                        >
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleAllInLevel(level);
                                                }}
                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    allSelected
                                                        ? 'bg-brand-500 border-brand-500'
                                                        : someSelected
                                                        ? 'bg-brand-200 border-brand-500'
                                                        : 'border-slate-300 hover:border-brand-500'
                                                }`}
                                            >
                                                {allSelected && <Check className="h-3 w-3 text-white" />}
                                                {someSelected && !allSelected && (
                                                    <div className="w-2 h-0.5 bg-brand-500 rounded" />
                                                )}
                                            </button>

                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-slate-400" />
                                            )}

                                            <span className={`font-medium ${level === 'No Level' ? 'text-amber-600' : 'text-slate-700'}`}>
                                                {level}
                                            </span>
                                            <span className="text-sm text-slate-400">
                                                ({gymnastsInLevel.length} gymnast{gymnastsInLevel.length !== 1 ? 's' : ''})
                                            </span>
                                        </div>

                                        {/* Gymnasts in this level */}
                                        {isExpanded && (
                                            <div className="divide-y divide-slate-100">
                                                {gymnastsInLevel.map(gymnast => {
                                                    const isSelected = selectedGymnasts.has(gymnast.id);
                                                    return (
                                                        <div
                                                            key={gymnast.id}
                                                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                                                            onClick={() => toggleGymnast(gymnast.id)}
                                                        >
                                                            <div
                                                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                                    isSelected
                                                                        ? 'bg-brand-500 border-brand-500'
                                                                        : 'border-slate-300'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <span className="text-sm text-slate-700">
                                                                {gymnast.first_name} {gymnast.last_name}
                                                            </span>
                                                            {gymnast.gymnast_id && (
                                                                <span className="text-xs text-slate-400">
                                                                    #{gymnast.gymnast_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer with level assignment */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium text-slate-700">
                            Assign to:
                        </label>
                        <select
                            value={targetLevel}
                            onChange={(e) => setTargetLevel(e.target.value)}
                            className="input flex-1"
                            disabled={levels.length === 0}
                        >
                            <option value="">Select a level...</option>
                            {levels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleAssignLevel}
                            disabled={selectedGymnasts.size === 0 || !targetLevel || saving}
                            className="btn-primary"
                        >
                            {saving ? 'Saving...' : `Assign ${selectedGymnasts.size > 0 ? `(${selectedGymnasts.size})` : ''}`}
                        </button>
                    </div>
                    {levels.length === 0 && (
                        <p className="mt-2 text-sm text-amber-600">
                            Configure levels in Hub Settings first to assign gymnasts.
                        </p>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
