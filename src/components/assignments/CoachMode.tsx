import { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus, Filter, X, Trash2, LayoutGrid, FileText, Pencil, Save, Loader2, MoreVertical } from 'lucide-react';
import { useHub } from '../../context/HubContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useStations, useUpsertStation, useDeleteStation } from '../../hooks/useStations';
import { GymnastEventCard } from './GymnastEventCard';
import { AssignmentModal } from './AssignmentModal';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import type { AssignmentEventType, GymnastAssignment, StationAssignment, MainStation } from '../../types';
import { ASSIGNMENT_EVENTS, ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface CoachModeProps {
    onNavigateToTemplates?: () => void;
}

const LEVEL_ORDER = [
    'Pre-Team', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5',
    'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10'
];

function formatDateDisplay(date: Date): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
        return `Today, ${format(date, 'MMMM d, yyyy')}`;
    }
    return format(date, 'EEEE, MMMM d, yyyy');
}

function EditStationModal({ station, onClose, onSaved }: {
    station: StationAssignment;
    onClose: () => void;
    onSaved: () => void;
}) {
    const { upsertStation } = useUpsertStation();
    const [mainStations, setMainStations] = useState<MainStation[]>(
        station.stations.map(s => ({
            id: s.id,
            content: s.content,
            side_stations: s.side_stations.map(ss => ({ id: ss.id, content: ss.content }))
        }))
    );
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const eventColors = ASSIGNMENT_EVENT_COLORS[station.event];

    const addMainStation = () => {
        setMainStations(prev => [...prev, { id: crypto.randomUUID(), content: '', side_stations: [] }]);
    };

    const updateMainStation = (id: string, content: string) => {
        setMainStations(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    };

    const removeMainStation = (id: string) => {
        if (mainStations.length > 1) {
            setMainStations(prev => prev.filter(s => s.id !== id));
        }
    };

    const addSideStation = (mainId: string) => {
        setMainStations(prev => prev.map(m =>
            m.id === mainId
                ? { ...m, side_stations: [...m.side_stations, { id: crypto.randomUUID(), content: '' }] }
                : m
        ));
    };

    const updateSideStation = (mainId: string, sideId: string, content: string) => {
        setMainStations(prev => prev.map(m =>
            m.id === mainId
                ? { ...m, side_stations: m.side_stations.map(s => s.id === sideId ? { ...s, content } : s) }
                : m
        ));
    };

    const removeSideStation = (mainId: string, sideId: string) => {
        setMainStations(prev => prev.map(m =>
            m.id === mainId
                ? { ...m, side_stations: m.side_stations.filter(s => s.id !== sideId) }
                : m
        ));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError('');
        try {
            const validStations = mainStations
                .filter(m => m.content.trim())
                .map(m => ({
                    ...m,
                    side_stations: m.side_stations.filter(s => s.content.trim())
                }));

            const result = await upsertStation({
                hub_id: station.hub_id,
                date: station.date,
                level: station.level,
                event: station.event,
                stations: validStations
            });
            if (result) {
                onSaved();
                onClose();
            } else {
                setError('Failed to save stations. Please try again.');
            }
        } catch (err) {
            console.error('Error saving stations:', err);
            setError('Failed to save stations. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-surface rounded-xl border border-line w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-line flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-heading">Edit Stations</h2>
                        <p className="text-sm text-muted">{station.level} — {ASSIGNMENT_EVENT_LABELS[station.event]}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-muted hover:text-heading hover:bg-surface-hover rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-heading text-sm">Stations ({mainStations.length})</span>
                        <button onClick={addMainStation} className="text-sm text-accent-600 hover:text-accent-700 flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" />
                            Add Station
                        </button>
                    </div>

                    <div className="space-y-3">
                        {mainStations.map((ms, idx) => (
                            <div key={ms.id} className={`rounded-lg border-2 p-3 ${eventColors.bg} ${eventColors.border}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-white">
                                            {idx + 1}
                                        </span>
                                        <span className={`text-xs font-medium ${eventColors.text}`}>Station {idx + 1}</span>
                                    </div>
                                    {mainStations.length > 1 && (
                                        <button onClick={() => removeMainStation(ms.id)} className="p-1 text-faint hover:text-error-400">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>

                                <textarea
                                    value={ms.content}
                                    onChange={(e) => updateMainStation(ms.id, e.target.value)}
                                    placeholder="Station exercises..."
                                    className="input w-full min-h-[60px] resize-none text-sm mb-2"
                                    rows={2}
                                />

                                <div className="border-t border-line pt-2">
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-[10px] text-muted">Side Stations</span>
                                        {ms.side_stations.length < 3 && (
                                            <button onClick={() => addSideStation(ms.id)} className="text-[10px] text-amber-600 hover:text-amber-700 flex items-center gap-0.5">
                                                <Plus className="w-2.5 h-2.5" />
                                                Add
                                            </button>
                                        )}
                                    </div>
                                    {ms.side_stations.length === 0 ? (
                                        <p className="text-[10px] text-muted text-center py-1.5 bg-surface rounded border border-dashed border-line-strong">
                                            No side stations
                                        </p>
                                    ) : (
                                        <div className="space-y-1.5">
                                            {ms.side_stations.map((side, sideIdx) => (
                                                <div key={side.id} className="bg-amber-500/10 rounded p-2 border border-amber-500/20">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] font-medium text-amber-600">Side {sideIdx + 1}</span>
                                                        <button onClick={() => removeSideStation(ms.id, side.id)} className="p-0.5 text-faint hover:text-error-400">
                                                            <X className="w-2.5 h-2.5" />
                                                        </button>
                                                    </div>
                                                    <textarea
                                                        value={side.content}
                                                        onChange={(e) => updateSideStation(ms.id, side.id, e.target.value)}
                                                        placeholder="Side station..."
                                                        className="input w-full text-xs py-1 resize-none"
                                                        rows={1}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-line">
                    {error && <p className="text-sm text-error-500 mb-3">{error}</p>}
                    <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || mainStations.every(s => !s.content.trim())}
                        className="btn-primary"
                    >
                        {isSaving ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                        ) : (
                            <><Save className="w-4 h-4" /> Save Changes</>
                        )}
                    </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

interface StationCardMenuProps {
    station: StationAssignment;
    eventConfig: { bg: string; border: string };
    onEdit: () => void;
    onDelete: () => void;
}

function StationCardWithMenu({ station, eventConfig, onEdit, onDelete }: StationCardMenuProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    return (
        <div className={`${eventConfig.bg} rounded-lg border-2 ${eventConfig.border} p-4 mb-4`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-body">
                        {station.stations.length} Station{station.stations.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 text-muted hover:text-body hover:bg-surface-hover rounded transition-colors"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-lg shadow-lg border border-line py-1 z-20">
                            <button
                                onClick={() => { setShowMenu(false); onEdit(); }}
                                className="w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2"
                            >
                                <Pencil className="w-4 h-4 text-muted" />
                                Edit stations
                            </button>
                            <button
                                onClick={() => { setShowMenu(false); setShowSaveTemplate(true); }}
                                className="w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4 text-muted" />
                                Save as template
                            </button>
                            <button
                                onClick={() => { setShowMenu(false); onDelete(); }}
                                className="w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-500/10 flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete stations
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Stations Grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {station.stations.map((mainStation, mainIndex) => (
                    <div key={mainStation.id} className="bg-surface-alt rounded-lg border border-line p-3">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-600 text-white text-xs font-bold">
                                {mainIndex + 1}
                            </span>
                            <span className="text-xs font-medium text-muted">Station {mainIndex + 1}</span>
                        </div>
                        <div className="text-sm text-body whitespace-pre-wrap">
                            {mainStation.content}
                        </div>
                        {mainStation.side_stations && mainStation.side_stations.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-line space-y-2">
                                {mainStation.side_stations.map((side, sideIndex) => (
                                    <div key={side.id} className="bg-amber-500/10 rounded p-2 border border-amber-500/20">
                                        <div className="flex items-center gap-1 mb-1">
                                            <ChevronRight className="w-3 h-3 text-amber-600 flex-shrink-0" />
                                            <span className="text-xs font-medium text-amber-600">Side {sideIndex + 1}</span>
                                        </div>
                                        <div className="text-xs text-subtle whitespace-pre-wrap pl-4">
                                            {side.content}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showSaveTemplate && (
                <SaveAsTemplateModal
                    event={station.event}
                    templateType="stations"
                    stations={station.stations}
                    onClose={() => setShowSaveTemplate(false)}
                />
            )}
        </div>
    );
}

export function CoachMode({ onNavigateToTemplates }: CoachModeProps) {
    const { hub } = useHub();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<AssignmentEventType>('vault');
    const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());
    const [showLevelFilter, setShowLevelFilter] = useState(false);
    const [showAssignmentModal, setShowAssignmentModal] = useState(false);

    const dateString = format(selectedDate, 'yyyy-MM-dd');
    const { assignments, loading, refetch } = useAssignments({ hubId: hub?.id, date: dateString });
    const { stations, refetch: refetchStations } = useStations({ hubId: hub?.id, date: dateString });
    const { deleteStation } = useDeleteStation();
    const [editingStation, setEditingStation] = useState<StationAssignment | null>(null);

    // Navigation handlers
    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));
    const handleToday = () => setSelectedDate(new Date());

    // Get stations for the selected event, grouped by level
    const stationsByLevel = useMemo(() => {
        const groups: Record<string, typeof stations[0]> = {};
        stations
            .filter(s => s.event === selectedEvent)
            .forEach(station => {
                groups[station.level] = station;
            });
        return groups;
    }, [stations, selectedEvent]);

    // Get all available levels from assignments AND stations
    const availableLevels = useMemo(() => {
        const levelSet = new Set<string>();

        // Add levels from assignments
        assignments.forEach(a => {
            const content = a[selectedEvent];
            if (content && content.trim() !== '') {
                const level = (a.gymnast_profiles as any)?.level || 'Unknown';
                levelSet.add(level);
            }
        });

        // Add levels from stations
        Object.keys(stationsByLevel).forEach(level => levelSet.add(level));

        return Array.from(levelSet).sort((a, b) => {
            const aIdx = LEVEL_ORDER.indexOf(a);
            const bIdx = LEVEL_ORDER.indexOf(b);
            if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });
    }, [assignments, selectedEvent, stationsByLevel]);

    // Toggle level filter
    const toggleLevel = (level: string) => {
        setSelectedLevels(prev => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const clearLevelFilter = () => setSelectedLevels(new Set());

    // Group assignments by level
    const groupedByLevel = useMemo(() => {
        // Filter to only assignments that have content for the selected event
        const withContent = assignments.filter(a => {
            const content = a[selectedEvent];
            return content && content.trim() !== '';
        });

        // Group by level
        const groups: Record<string, GymnastAssignment[]> = {};
        withContent.forEach(a => {
            const level = (a.gymnast_profiles as any)?.level || 'Unknown';
            // Apply level filter if any levels are selected
            if (selectedLevels.size > 0 && !selectedLevels.has(level)) {
                return;
            }
            if (!groups[level]) {
                groups[level] = [];
            }
            groups[level].push(a);
        });

        // Sort gymnasts within each level alphabetically
        Object.keys(groups).forEach(level => {
            groups[level].sort((a, b) => {
                const aName = `${(a.gymnast_profiles as any)?.first_name} ${(a.gymnast_profiles as any)?.last_name}`;
                const bName = `${(b.gymnast_profiles as any)?.first_name} ${(b.gymnast_profiles as any)?.last_name}`;
                return aName.localeCompare(bName);
            });
        });

        return groups;
    }, [assignments, selectedEvent, selectedLevels]);

    // All levels to display (both assignments and stations)
    const sortedLevels = useMemo(() => {
        const allLevels = new Set<string>([
            ...Object.keys(groupedByLevel),
            ...Object.keys(stationsByLevel).filter(
                level => selectedLevels.size === 0 || selectedLevels.has(level)
            )
        ]);

        return Array.from(allLevels).sort((a, b) => {
            const aIdx = LEVEL_ORDER.indexOf(a);
            const bIdx = LEVEL_ORDER.indexOf(b);
            if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
            if (aIdx === -1) return 1;
            if (bIdx === -1) return -1;
            return aIdx - bIdx;
        });
    }, [groupedByLevel, stationsByLevel, selectedLevels]);

    const eventConfig = ASSIGNMENT_EVENT_COLORS[selectedEvent];

    const handleDeleteStation = async (stationId: string) => {
        if (!confirm('Delete all stations for this level?')) return;
        const success = await deleteStation(stationId);
        if (success) {
            await refetchStations();
        }
    };

    return (
        <div className="space-y-4">
            {/* Date Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center justify-between sm:justify-start gap-2">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevDay}
                            className="p-2 rounded-lg hover:bg-surface-hover text-muted transition-colors"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-sm font-medium text-muted hover:bg-surface-hover rounded-lg transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={handleNextDay}
                            className="p-2 rounded-lg hover:bg-surface-hover text-muted transition-colors"
                            title="Next day"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile buttons */}
                    <div className="sm:hidden flex items-center gap-2">
                        {onNavigateToTemplates && (
                            <button
                                onClick={onNavigateToTemplates}
                                className="btn-secondary text-sm py-2 px-3"
                                title="Templates"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => setShowAssignmentModal(true)}
                            className="btn-primary text-sm py-2 px-3"
                        >
                            <Plus className="w-4 h-4" />
                            New
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-heading flex-1 min-w-0">
                    <Calendar className="w-5 h-5 text-muted flex-shrink-0 hidden sm:block" />
                    <span className="font-medium text-sm sm:text-base truncate">{formatDateDisplay(selectedDate)}</span>
                </div>

                {/* Desktop buttons */}
                <div className="hidden sm:flex items-center gap-2">
                    {onNavigateToTemplates && (
                        <button
                            onClick={onNavigateToTemplates}
                            className="btn-secondary text-sm flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Templates
                        </button>
                    )}
                    <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="btn-primary text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Assignment
                    </button>
                </div>
            </div>

            {/* Event Selector + Level Filter */}
            <div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    {ASSIGNMENT_EVENTS.map(event => {
                        const colors = ASSIGNMENT_EVENT_COLORS[event];
                        return (
                            <button
                                key={event}
                                onClick={() => setSelectedEvent(event)}
                                className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                                    selectedEvent === event
                                        ? `${colors.bg} ${colors.border} border-2 ${colors.text}`
                                        : 'bg-surface border border-line text-muted hover:border-line-strong'
                                }`}
                            >
                                {ASSIGNMENT_EVENT_LABELS[event]}
                            </button>
                        );
                    })}

                    {/* Divider */}
                    {availableLevels.length > 0 && (
                        <div className="hidden sm:block h-8 w-px bg-surface-active mx-1" />
                    )}

                    {/* Level Filter Button */}
                    {availableLevels.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowLevelFilter(!showLevelFilter)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                                    selectedLevels.size > 0
                                        ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                        : 'bg-surface border border-line text-muted hover:border-line-strong'
                                }`}
                            >
                                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Levels</span>
                                {selectedLevels.size > 0 && (
                                    <span className="bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                        {selectedLevels.size}
                                    </span>
                                )}
                            </button>
                            {selectedLevels.size > 0 && (
                                <button
                                    onClick={clearLevelFilter}
                                    className="text-xs sm:text-sm text-muted hover:text-body flex items-center gap-1"
                                >
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    <span className="hidden sm:inline">Clear</span>
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Level Filter Dropdown */}
                {showLevelFilter && availableLevels.length > 0 && (
                    <div className="mt-2 sm:mt-3 bg-surface border border-line rounded-lg p-2 sm:p-3">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {availableLevels.map(level => (
                                <label
                                    key={level}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg cursor-pointer text-xs sm:text-sm transition-colors ${
                                        selectedLevels.has(level)
                                            ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                                            : 'bg-surface-hover text-muted border border-line hover:border-line-strong'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedLevels.has(level)}
                                        onChange={() => toggleLevel(level)}
                                        className="sr-only"
                                    />
                                    {level}
                                </label>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-surface-hover rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : sortedLevels.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-surface rounded-lg border border-line">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-hover flex items-center justify-center">
                        <LayoutGrid className="w-6 h-6 text-muted" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-heading mb-1">
                        No {ASSIGNMENT_EVENT_LABELS[selectedEvent]} assignments
                    </h3>
                    <p className="text-xs sm:text-sm text-muted px-4 mb-4">
                        No exercises assigned for this date
                    </p>
                    <button
                        onClick={() => setShowAssignmentModal(true)}
                        className="btn-primary text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create Assignment
                    </button>
                </div>
            ) : (
                <div className="space-y-6 sm:space-y-8">
                    {sortedLevels.map(level => {
                        const levelAssignments = groupedByLevel[level] || [];
                        const station = stationsByLevel[level];
                        const gymnastCount = levelAssignments.length;

                        return (
                            <div key={level}>
                                {/* Level Header */}
                                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-heading">{level}</h3>
                                    <div className="flex-1 h-px bg-surface-active" />
                                    {station && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 rounded-full">
                                            Stations
                                        </span>
                                    )}
                                    {gymnastCount > 0 && (
                                        <span className="text-xs sm:text-sm text-muted">
                                            {gymnastCount} gymnast{gymnastCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Station Card (if exists) */}
                                {station && station.stations && station.stations.length > 0 && (
                                    <StationCardWithMenu
                                        station={station}
                                        eventConfig={eventConfig}
                                        onEdit={() => setEditingStation(station)}
                                        onDelete={() => handleDeleteStation(station.id)}
                                    />
                                )}

                                {/* Gymnast Cards (Checklist) */}
                                {gymnastCount > 0 && (
                                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                                        {levelAssignments.map(assignment => (
                                            <GymnastEventCard
                                                key={assignment.id}
                                                assignment={assignment}
                                                eventKey={selectedEvent}
                                                eventColor={eventConfig.bg}
                                                borderColor={eventConfig.border}
                                                onUpdate={refetch}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Assignment Modal */}
            <AssignmentModal
                isOpen={showAssignmentModal}
                onClose={() => setShowAssignmentModal(false)}
                initialDate={selectedDate}
                selectedEvent={selectedEvent}
                onSuccess={() => {
                    refetch();
                    refetchStations();
                }}
            />

            {editingStation && (
                <EditStationModal
                    station={editingStation}
                    onClose={() => setEditingStation(null)}
                    onSaved={refetchStations}
                />
            )}
        </div>
    );
}
