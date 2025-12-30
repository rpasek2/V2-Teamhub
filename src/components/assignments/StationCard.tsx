import { clsx } from 'clsx';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { StationAssignment, MainStation } from '../../types';
import { ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface StationCardProps {
    station: StationAssignment;
    onEdit?: () => void;
    readOnly?: boolean;
    className?: string;
}

export function StationCard({ station, onEdit, readOnly = false, className }: StationCardProps) {
    const colors = ASSIGNMENT_EVENT_COLORS[station.event];
    const label = ASSIGNMENT_EVENT_LABELS[station.event];

    return (
        <div
            onClick={!readOnly ? onEdit : undefined}
            className={clsx(
                'rounded-xl border p-4',
                colors.bg,
                colors.border,
                !readOnly && onEdit && 'cursor-pointer hover:border-mint-500/50 transition-all',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                    <h3 className={clsx('font-semibold', colors.text)}>
                        {label}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {station.level}
                    </span>
                </div>
                <span className="text-sm text-slate-500">
                    {station.stations.length} station{station.stations.length !== 1 ? 's' : ''}
                </span>
            </div>

            {/* Stations */}
            <div className="space-y-3">
                {station.stations.map((mainStation, idx) => (
                    <div key={mainStation.id} className="bg-slate-50 rounded-lg p-3">
                        <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium text-white">
                                {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                                    {mainStation.content || 'Empty station'}
                                </p>
                                {mainStation.side_stations && mainStation.side_stations.length > 0 && (
                                    <div className="mt-2 pl-3 border-l-2 border-slate-200 space-y-1">
                                        {mainStation.side_stations.map((side, sIdx) => (
                                            <p key={side.id} className="text-xs text-slate-500">
                                                {sIdx + 1}. {side.content}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

interface StationEditorProps {
    stations: MainStation[];
    onChange: (stations: MainStation[]) => void;
    className?: string;
}

export function StationEditor({ stations, onChange, className }: StationEditorProps) {
    const generateId = () => Math.random().toString(36).substring(2, 11);

    const addStation = () => {
        onChange([
            ...stations,
            {
                id: generateId(),
                content: '',
                side_stations: []
            }
        ]);
    };

    const updateStation = (index: number, content: string) => {
        const updated = [...stations];
        updated[index] = { ...updated[index], content };
        onChange(updated);
    };

    const removeStation = (index: number) => {
        onChange(stations.filter((_, i) => i !== index));
    };

    const addSideStation = (stationIndex: number) => {
        const updated = [...stations];
        updated[stationIndex] = {
            ...updated[stationIndex],
            side_stations: [
                ...updated[stationIndex].side_stations,
                { id: generateId(), content: '' }
            ]
        };
        onChange(updated);
    };

    const updateSideStation = (stationIndex: number, sideIndex: number, content: string) => {
        const updated = [...stations];
        const sideStations = [...updated[stationIndex].side_stations];
        sideStations[sideIndex] = { ...sideStations[sideIndex], content };
        updated[stationIndex] = { ...updated[stationIndex], side_stations: sideStations };
        onChange(updated);
    };

    const removeSideStation = (stationIndex: number, sideIndex: number) => {
        const updated = [...stations];
        updated[stationIndex] = {
            ...updated[stationIndex],
            side_stations: updated[stationIndex].side_stations.filter((_, i) => i !== sideIndex)
        };
        onChange(updated);
    };

    return (
        <div className={clsx('space-y-4', className)}>
            {stations.map((station, idx) => (
                <div key={station.id} className="bg-white rounded-lg p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center gap-1">
                            <GripVertical className="w-4 h-4 text-slate-500" />
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium text-white">
                                {idx + 1}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <textarea
                                value={station.content}
                                onChange={(e) => updateStation(idx, e.target.value)}
                                placeholder="Main station content..."
                                className="input w-full min-h-[60px] resize-none"
                                rows={2}
                            />

                            {/* Side Stations */}
                            {station.side_stations.length > 0 && (
                                <div className="mt-3 pl-4 border-l-2 border-slate-200 space-y-2">
                                    {station.side_stations.map((side, sIdx) => (
                                        <div key={side.id} className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 flex-shrink-0">
                                                {sIdx + 1}.
                                            </span>
                                            <input
                                                type="text"
                                                value={side.content}
                                                onChange={(e) => updateSideStation(idx, sIdx, e.target.value)}
                                                placeholder="Side station..."
                                                className="input flex-1 text-sm py-1.5"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeSideStation(idx, sIdx)}
                                                className="p-1 text-slate-500 hover:text-error-400 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => addSideStation(idx)}
                                className="mt-2 text-xs text-slate-500 hover:text-mint-600 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add side station
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeStation(idx)}
                            className="p-1.5 text-slate-500 hover:text-error-400 hover:bg-error-500/10 rounded transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}

            <button
                type="button"
                onClick={addStation}
                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-mint-600 hover:border-mint-500/50 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Station
            </button>
        </div>
    );
}

interface StationGridProps {
    stations: StationAssignment[];
    onStationClick?: (station: StationAssignment) => void;
    emptyMessage?: string;
    className?: string;
}

export function StationGrid({
    stations,
    onStationClick,
    emptyMessage = 'No stations set up for this date',
    className
}: StationGridProps) {
    if (stations.length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2-2v-2z" />
                    </svg>
                </div>
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={clsx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
            {stations.map(station => (
                <StationCard
                    key={station.id}
                    station={station}
                    onEdit={() => onStationClick?.(station)}
                />
            ))}
        </div>
    );
}
