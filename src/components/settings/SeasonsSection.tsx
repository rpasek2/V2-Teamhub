import { useState, useEffect } from 'react';
import { Loader2, Save, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { fetchSeasonsForHub, getMonthName } from '../../lib/seasons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { Season, SeasonConfig } from '../../types';

interface SeasonsSectionProps {
    seasonConfig: SeasonConfig;
    setSeasonConfig: React.Dispatch<React.SetStateAction<SeasonConfig>>;
}

export function SeasonsSection({ seasonConfig, setSeasonConfig }: SeasonsSectionProps) {
    const { hub, refreshHub } = useHub();
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loadingSeasons, setLoadingSeasons] = useState(false);
    const [savingSeasonConfig, setSavingSeasonConfig] = useState(false);
    const [seasonMessage, setSeasonMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (hub) {
            loadSeasons();
        }
    }, [hub]);

    const loadSeasons = async () => {
        if (!hub) return;
        setLoadingSeasons(true);
        const data = await fetchSeasonsForHub(hub.id);
        setSeasons(data);
        setLoadingSeasons(false);
    };

    const handleSaveSeasonConfig = async () => {
        if (!hub) return;
        setSavingSeasonConfig(true);
        setSeasonMessage(null);

        try {
            const updatedSettings = {
                ...hub.settings,
                seasonConfig
            };

            const { error } = await supabase
                .from('hubs')
                .update({ settings: updatedSettings })
                .eq('id', hub.id);

            if (error) throw error;

            await refreshHub();
            setSeasonMessage({ type: 'success', text: 'Season settings saved!' });
        } catch (err: unknown) {
            console.error('Error saving season settings:', err);
            setSeasonMessage({ type: 'error', text: 'Failed to save season settings.' });
        } finally {
            setSavingSeasonConfig(false);
        }
    };

    return (
        <CollapsibleSection
            title="Seasons"
            icon={CalendarDays}
            description="Configure competition seasons for organizing scores and competitions"
            actions={
                <button
                    onClick={handleSaveSeasonConfig}
                    disabled={savingSeasonConfig}
                    className="btn-primary disabled:opacity-50"
                >
                    {savingSeasonConfig ? (
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
            {seasonMessage && (
                <div className={`mb-4 p-4 rounded-md ${seasonMessage.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {seasonMessage.text}
                </div>
            )}

            {/* Season Start Date Configuration */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-slate-900 mb-2">Season Start Date</h4>
                <p className="text-xs text-slate-500 mb-3">
                    New seasons automatically start on this date each year. The current season is determined by this setting.
                </p>
                <div className="flex gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
                        <select
                            value={seasonConfig.startMonth}
                            onChange={(e) => setSeasonConfig({ ...seasonConfig, startMonth: parseInt(e.target.value) })}
                            className="input w-36"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month}>{getMonthName(month)}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Day</label>
                        <select
                            value={seasonConfig.startDay}
                            onChange={(e) => setSeasonConfig({ ...seasonConfig, startDay: parseInt(e.target.value) })}
                            className="input w-20"
                        >
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <option key={day} value={day}>{day}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Seasons List */}
            <div>
                <h4 className="text-sm font-medium text-slate-900 mb-2">Your Seasons</h4>
                {loadingSeasons ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : seasons.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                        <CalendarDays className="mx-auto h-8 w-8 text-slate-400" />
                        <p className="mt-2 text-sm text-slate-500">No seasons yet.</p>
                        <p className="text-xs text-slate-400">Seasons are created automatically when you create competitions.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {seasons.map((season) => (
                            <div
                                key={season.id}
                                className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-900">{season.name}</span>
                                    {season.is_current && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-brand-100 text-brand-700 rounded-full">
                                            Current
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-slate-500">
                                    {format(parseISO(season.start_date), 'MMM d, yyyy')} - {format(parseISO(season.end_date), 'MMM d, yyyy')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </CollapsibleSection>
    );
}
