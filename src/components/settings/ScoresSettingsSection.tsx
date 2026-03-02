import { useState, useEffect } from 'react';
import { Loader2, Save, Trophy, Award, Medal } from 'lucide-react';
import { useHub } from '../../context/HubContext';
import { supabase } from '../../lib/supabase';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { QualifyingScoresConfig, LevelQualifyingScores } from '../../types';

export function ScoresSettingsSection() {
    const { hub, refreshHub } = useHub();
    const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [config, setConfig] = useState<QualifyingScoresConfig>({});
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const levels = hub?.settings?.levels || [];

    useEffect(() => {
        if (hub?.settings?.qualifyingScores) {
            setConfig(hub.settings.qualifyingScores);
        }
    }, [hub]);

    useEffect(() => {
        if (levels.length > 0 && !selectedLevel) {
            setSelectedLevel(levels[0]);
        }
    }, [levels, selectedLevel]);

    const getCurrentLevelConfig = (): LevelQualifyingScores => {
        return config[activeGender]?.[selectedLevel] || {};
    };

    const handleScoreChange = (
        scoreType: 'all_around' | 'individual_event',
        qualifyingLevel: 'state' | 'regional' | 'national',
        value: string
    ) => {
        const numValue = value ? parseFloat(value) : undefined;

        setConfig(prev => ({
            ...prev,
            [activeGender]: {
                ...prev[activeGender],
                [selectedLevel]: {
                    ...prev[activeGender]?.[selectedLevel],
                    [scoreType]: {
                        ...prev[activeGender]?.[selectedLevel]?.[scoreType],
                        [qualifyingLevel]: numValue
                    }
                }
            }
        }));
    };

    const handleSave = async () => {
        if (!hub) return;
        setSaving(true);
        setMessage(null);

        try {
            const updatedSettings = {
                ...hub.settings,
                qualifyingScores: config
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setMessage({ type: 'success', text: 'Qualifying scores saved!' });
        } catch (err) {
            console.error('Error saving qualifying scores:', err);
            setMessage({ type: 'error', text: 'Failed to save qualifying scores.' });
        } finally {
            setSaving(false);
        }
    };

    const currentConfig = getCurrentLevelConfig();

    return (
        <CollapsibleSection
            title="Scores"
            icon={Trophy}
            description="Configure qualifying score thresholds for State, Regional, and National competitions"
            actions={
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary disabled:opacity-50"
                >
                    {saving ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="-ml-1 mr-2 h-4 w-4" />
                            Save
                        </>
                    )}
                </button>
            }
        >
            {/* Message display */}
            {message && (
                <div className={`mb-4 p-4 rounded-md ${
                    message.type === 'success'
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                    {message.text}
                </div>
            )}

            {levels.length === 0 ? (
                <div className="text-center py-8 text-muted">
                    <Trophy className="mx-auto h-8 w-8 text-faint mb-2" />
                    <p>No levels configured yet.</p>
                    <p className="text-sm mt-1">Add levels in the Levels section above first.</p>
                </div>
            ) : (
                <>
                    <div className="mb-6">
                        <h4 className="text-sm font-medium text-heading mb-2">Qualifying Scores</h4>
                        <p className="text-xs text-muted mb-4">
                            Set minimum scores required to qualify for State, Regional, and National competitions.
                            Badges will appear on scores that meet these thresholds.
                        </p>

                        {/* Gender Toggle */}
                        <div className="flex rounded-lg bg-surface-hover p-1 mb-4 w-fit">
                            <button
                                onClick={() => setActiveGender('Female')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeGender === 'Female'
                                        ? 'bg-surface text-heading shadow-sm'
                                        : 'text-muted hover:text-heading'
                                }`}
                            >
                                Women's
                            </button>
                            <button
                                onClick={() => setActiveGender('Male')}
                                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                                    activeGender === 'Male'
                                        ? 'bg-surface text-heading shadow-sm'
                                        : 'text-muted hover:text-heading'
                                }`}
                            >
                                Men's
                            </button>
                        </div>

                        {/* Level Selector */}
                        <div className="mb-4">
                            <label className="block text-xs font-medium text-subtle mb-1">
                                Level
                            </label>
                            <select
                                value={selectedLevel}
                                onChange={(e) => setSelectedLevel(e.target.value)}
                                className="input w-48"
                            >
                                {levels.map(level => (
                                    <option key={level} value={level}>{level}</option>
                                ))}
                            </select>
                        </div>

                        {/* Scores Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full border border-line rounded-lg overflow-hidden">
                                <thead>
                                    <tr className="bg-surface">
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase w-40">
                                            Score Type
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                                            <div className="flex items-center justify-center gap-1 text-blue-600">
                                                <Award className="h-3 w-3" />
                                                State
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                                            <div className="flex items-center justify-center gap-1 text-amber-600">
                                                <Trophy className="h-3 w-3" />
                                                Regional
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase">
                                            <div className="flex items-center justify-center gap-1 text-purple-600">
                                                <Medal className="h-3 w-3" />
                                                National
                                            </div>
                                            <span className="text-xs font-normal text-faint">(optional)</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {/* All-Around Row */}
                                    <tr className="bg-accent-500/10">
                                        <td className="px-4 py-3 text-sm font-semibold text-accent-600">
                                            All-Around (AA)
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 32.000"
                                                value={currentConfig.all_around?.state ?? ''}
                                                onChange={(e) => handleScoreChange('all_around', 'state', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 34.000"
                                                value={currentConfig.all_around?.regional ?? ''}
                                                onChange={(e) => handleScoreChange('all_around', 'regional', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 36.000"
                                                value={currentConfig.all_around?.national ?? ''}
                                                onChange={(e) => handleScoreChange('all_around', 'national', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                    </tr>

                                    {/* Individual Event Score Row */}
                                    <tr>
                                        <td className="px-4 py-3 text-sm font-medium text-body">
                                            Individual Event (IES)
                                            <p className="text-xs text-faint font-normal mt-0.5">
                                                Applies to all events
                                            </p>
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 8.500"
                                                value={currentConfig.individual_event?.state ?? ''}
                                                onChange={(e) => handleScoreChange('individual_event', 'state', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 8.750"
                                                value={currentConfig.individual_event?.regional ?? ''}
                                                onChange={(e) => handleScoreChange('individual_event', 'regional', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="e.g., 9.000"
                                                value={currentConfig.individual_event?.national ?? ''}
                                                onChange={(e) => handleScoreChange('individual_event', 'national', e.target.value)}
                                                className="input w-28 text-center text-sm"
                                            />
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Legend */}
                        <div className="mt-4 p-3 bg-surface-alt rounded-lg border border-line">
                            <p className="text-xs font-medium text-body mb-2">How qualifying badges work:</p>
                            <ul className="text-xs text-muted space-y-1">
                                <li className="flex items-center gap-2">
                                    <Award className="h-3 w-3 text-blue-600" />
                                    <strong className="text-blue-600">State</strong> badges appear at regular season meets
                                </li>
                                <li className="flex items-center gap-2">
                                    <Trophy className="h-3 w-3 text-amber-600" />
                                    <strong className="text-amber-600">Regional</strong> badges appear at State Championships
                                </li>
                                <li className="flex items-center gap-2">
                                    <Medal className="h-3 w-3 text-purple-600" />
                                    <strong className="text-purple-600">National</strong> badges appear at Regional Championships
                                </li>
                            </ul>
                        </div>
                    </div>
                </>
            )}
        </CollapsibleSection>
    );
}
