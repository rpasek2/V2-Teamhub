import { useState } from 'react';
import { Loader2, Save, ListOrdered, Plus, X, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { CollapsibleSection } from '../ui/CollapsibleSection';

interface LevelsSectionProps {
    levels: string[];
    setLevels: React.Dispatch<React.SetStateAction<string[]>>;
}

export function LevelsSection({ levels, setLevels }: LevelsSectionProps) {
    const { hub, refreshHub } = useHub();
    const [newLevel, setNewLevel] = useState('');
    const [savingLevels, setSavingLevels] = useState(false);
    const [levelsMessage, setLevelsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleAddLevel = () => {
        const trimmed = newLevel.trim();
        if (trimmed && !levels.includes(trimmed)) {
            setLevels([...levels, trimmed]);
            setNewLevel('');
        }
    };

    const handleRemoveLevel = (levelToRemove: string) => {
        setLevels(levels.filter(l => l !== levelToRemove));
    };

    const handleMoveLevel = (index: number, direction: 'up' | 'down') => {
        const newLevels = [...levels];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLevels.length) return;
        [newLevels[index], newLevels[targetIndex]] = [newLevels[targetIndex], newLevels[index]];
        setLevels(newLevels);
    };

    const handleSaveLevels = async () => {
        if (!hub) return;
        setSavingLevels(true);
        setLevelsMessage(null);

        try {
            const updatedSettings = {
                ...hub.settings,
                levels
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setLevelsMessage({ type: 'success', text: 'Levels saved successfully.' });
        } catch (err: unknown) {
            console.error('Error saving levels:', err);
            setLevelsMessage({ type: 'error', text: 'Failed to save levels.' });
        } finally {
            setSavingLevels(false);
        }
    };

    return (
        <CollapsibleSection
            title="Levels"
            icon={ListOrdered}
            description="Define the competition levels for your program"
            actions={
                <button
                    onClick={handleSaveLevels}
                    disabled={savingLevels}
                    className="btn-primary disabled:opacity-50"
                >
                    {savingLevels ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="-ml-1 mr-2 h-4 w-4" />
                            Save Levels
                        </>
                    )}
                </button>
            }
        >
            {levelsMessage && (
                <div className={`mb-4 p-4 rounded-md ${levelsMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {levelsMessage.text}
                </div>
            )}

            {/* Add new level input */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLevel())}
                    placeholder="Enter level name (e.g., Level 3, Xcel Gold)"
                    className="input flex-1"
                />
                <button
                    type="button"
                    onClick={handleAddLevel}
                    disabled={!newLevel.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                </button>
            </div>

            {/* Levels list */}
            {levels.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <ListOrdered className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">No levels defined yet.</p>
                    <p className="text-xs text-slate-400">Add levels above to get started.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {levels.map((level, index) => (
                        <li
                            key={level}
                            className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200"
                        >
                            <div className="flex items-center">
                                <GripVertical className="h-4 w-4 text-slate-400 mr-3" />
                                <span className="text-sm font-medium text-slate-900">{level}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleMoveLevel(index, 'up')}
                                    disabled={index === 0}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move up"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMoveLevel(index, 'down')}
                                    disabled={index === levels.length - 1}
                                    className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                    title="Move down"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLevel(level)}
                                    className="p-1 text-slate-400 hover:text-red-600 ml-2"
                                    title="Remove level"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </CollapsibleSection>
    );
}
