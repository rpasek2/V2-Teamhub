import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, Calendar } from 'lucide-react';
import type { Season } from '../../types';
import { fetchSeasonsForHub, getOrCreateCurrentSeason, DEFAULT_SEASON_CONFIG } from '../../lib/seasons';
import { useHub } from '../../context/HubContext';

interface SeasonPickerProps {
    selectedSeasonId: string | null;
    onSeasonChange: (seasonId: string, season: Season) => void;
    className?: string;
}

export function SeasonPicker({
    selectedSeasonId,
    onSeasonChange,
    className = '',
}: SeasonPickerProps) {
    const { hub } = useHub();
    const [isOpen, setIsOpen] = useState(false);
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch seasons on mount
    useEffect(() => {
        if (hub) {
            loadSeasons();
        }
    }, [hub]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadSeasons = async () => {
        if (!hub) return;
        setLoading(true);

        const config = hub.settings?.seasonConfig || DEFAULT_SEASON_CONFIG;

        // Ensure current season exists
        const currentSeason = await getOrCreateCurrentSeason(hub.id, config);

        // Fetch all seasons
        const allSeasons = await fetchSeasonsForHub(hub.id);
        setSeasons(allSeasons);

        // If no season selected, auto-select current season
        if (!selectedSeasonId && currentSeason) {
            onSeasonChange(currentSeason.id, currentSeason);
        }

        setLoading(false);
    };

    const selectedSeason = seasons.find(s => s.id === selectedSeasonId);

    const handleSelect = (season: Season) => {
        onSeasonChange(season.id, season);
        setIsOpen(false);
    };

    if (loading || seasons.length === 0) {
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-faint ${className}`}>
                <Calendar className="h-4 w-4" />
                <span>Loading...</span>
            </div>
        );
    }

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-body bg-surface border border-line rounded-lg hover:bg-surface-hover hover:border-line-strong transition-colors"
            >
                <Calendar className="h-4 w-4 text-faint" />
                <span>{selectedSeason?.name || 'Select Season'}</span>
                {selectedSeason?.is_current && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded">
                        Current
                    </span>
                )}
                <ChevronDown className={`h-4 w-4 text-faint transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 z-50 mt-1 w-56 bg-surface rounded-lg border border-line shadow-lg overflow-hidden">
                    <div className="py-1">
                        {seasons.map((season) => (
                            <button
                                key={season.id}
                                type="button"
                                onClick={() => handleSelect(season)}
                                className={`w-full px-4 py-2 text-left flex items-center justify-between hover:bg-surface-hover transition-colors ${
                                    season.id === selectedSeasonId ? 'bg-accent-50' : ''
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-medium ${
                                        season.id === selectedSeasonId ? 'text-accent-700' : 'text-heading'
                                    }`}>
                                        {season.name}
                                    </span>
                                    {season.is_current && (
                                        <span className="px-1.5 py-0.5 text-xs font-medium bg-accent-100 text-accent-700 rounded">
                                            Current
                                        </span>
                                    )}
                                </div>
                                {season.id === selectedSeasonId && (
                                    <Check className="h-4 w-4 text-accent-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
