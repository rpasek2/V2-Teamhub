import { useState, useEffect } from 'react';
import { Loader2, Save, CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');
import { useHub } from '../../context/HubContext';
import { fetchSeasonsForHub, getMonthName } from '../../lib/seasons';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import type { Season, SeasonConfig } from '../../types';

interface SeasonsSectionProps {
    seasonConfig: SeasonConfig;
    setSeasonConfig: React.Dispatch<React.SetStateAction<SeasonConfig>>;
    bare?: boolean;
}

export function SeasonsSection({ seasonConfig, setSeasonConfig, bare }: SeasonsSectionProps) {
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

    const saveButton = (
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
    );

    const content = (
        <>
            {seasonMessage && (
                <div className={`mb-4 p-4 rounded-md ${seasonMessage.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                    {seasonMessage.text}
                </div>
            )}

            {/* Season Start Date Configuration */}
            <div className="mb-6">
                <h4 className="text-sm font-medium text-heading mb-2">Season Start Date</h4>
                <p className="text-xs text-muted mb-3">
                    New seasons automatically start on this date each year. The current season is determined by this setting.
                </p>
                <div className="flex gap-3">
                    <div>
                        <label className="block text-xs font-medium text-subtle mb-1">Month</label>
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
                        <label className="block text-xs font-medium text-subtle mb-1">Day</label>
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
                <h4 className="text-sm font-medium text-heading mb-2">Your Seasons</h4>
                {loadingSeasons ? (
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-faint" />
                    </div>
                ) : seasons.length === 0 ? (
                    <div className="text-center py-6 bg-surface-alt rounded-lg border-2 border-dashed border-line">
                        <CalendarDays className="mx-auto h-8 w-8 text-faint" />
                        <p className="mt-2 text-sm text-muted">No seasons yet.</p>
                        <p className="text-xs text-faint">Seasons are created automatically when you create competitions.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {seasons.map((season) => (
                            <div
                                key={season.id}
                                className="flex items-center justify-between bg-surface rounded-lg px-4 py-3 border border-line"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-heading">{season.name}</span>
                                    {season.is_current && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-accent-500/10 text-accent-600 rounded-full">
                                            Current
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted">
                                    {format(parseLocalDate(season.start_date), 'MMM d, yyyy')} - {format(parseLocalDate(season.end_date), 'MMM d, yyyy')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );

    if (bare) {
        return (
            <>
                <div className="flex justify-end mb-4">{saveButton}</div>
                {content}
            </>
        );
    }

    return (
        <CollapsibleSection
            title="Seasons"
            icon={CalendarDays}
            description="Configure competition seasons for organizing scores and competitions"
            actions={saveButton}
        >
            {content}
        </CollapsibleSection>
    );
}
