import { useState, useMemo } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, Plus, Filter, X, Trash2, LayoutGrid, FileText } from 'lucide-react';
import { useHub } from '../../context/HubContext';
import { useAssignments } from '../../hooks/useAssignments';
import { useStations, useDeleteStation } from '../../hooks/useStations';
import { GymnastEventCard } from './GymnastEventCard';
import { AssignmentModal } from './AssignmentModal';
import type { AssignmentEventType, GymnastAssignment } from '../../types';
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
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                            title="Previous day"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleToday}
                            className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={handleNextDay}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
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

                <div className="flex items-center gap-2 text-slate-900 flex-1 min-w-0">
                    <Calendar className="w-5 h-5 text-slate-500 flex-shrink-0 hidden sm:block" />
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
                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                            >
                                {ASSIGNMENT_EVENT_LABELS[event]}
                            </button>
                        );
                    })}

                    {/* Divider */}
                    {availableLevels.length > 0 && (
                        <div className="hidden sm:block h-8 w-px bg-slate-200 mx-1" />
                    )}

                    {/* Level Filter Button */}
                    {availableLevels.length > 0 && (
                        <>
                            <button
                                onClick={() => setShowLevelFilter(!showLevelFilter)}
                                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                                    selectedLevels.size > 0
                                        ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                                        : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-300'
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
                                    className="text-xs sm:text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
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
                    <div className="mt-2 sm:mt-3 bg-white border border-slate-200 rounded-lg p-2 sm:p-3">
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {availableLevels.map(level => (
                                <label
                                    key={level}
                                    className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg cursor-pointer text-xs sm:text-sm transition-colors ${
                                        selectedLevels.has(level)
                                            ? 'bg-indigo-100 text-indigo-600 border border-indigo-200'
                                            : 'bg-slate-100 text-slate-500 border border-slate-200 hover:border-slate-300'
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
                        <div key={i} className="h-24 bg-slate-100 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : sortedLevels.length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-white rounded-lg border border-slate-200">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <LayoutGrid className="w-6 h-6 text-slate-500" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-slate-900 mb-1">
                        No {ASSIGNMENT_EVENT_LABELS[selectedEvent]} assignments
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-500 px-4 mb-4">
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
                                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">{level}</h3>
                                    <div className="flex-1 h-px bg-slate-200" />
                                    {station && (
                                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full">
                                            Stations
                                        </span>
                                    )}
                                    {gymnastCount > 0 && (
                                        <span className="text-xs sm:text-sm text-slate-500">
                                            {gymnastCount} gymnast{gymnastCount !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                {/* Station Card (if exists) */}
                                {station && station.stations && station.stations.length > 0 && (
                                    <div className={`${eventConfig.bg} rounded-lg border-2 ${eventConfig.border} p-4 mb-4`}>
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-2">
                                                <LayoutGrid className="w-4 h-4 text-amber-500 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-300">
                                                    {station.stations.length} Station{station.stations.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteStation(station.id)}
                                                className="p-1.5 text-slate-400 hover:text-error-400 hover:bg-error-500/10 rounded-lg transition-colors flex-shrink-0"
                                                title="Delete stations"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Main Stations Grid */}
                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                            {station.stations.map((mainStation, mainIndex) => (
                                                <div key={mainStation.id} className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                                                    {/* Station Header */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-600 text-white text-xs font-bold">
                                                            {mainIndex + 1}
                                                        </span>
                                                        <span className="text-xs font-medium text-slate-500">Station {mainIndex + 1}</span>
                                                    </div>

                                                    {/* Station Content */}
                                                    <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                                        {mainStation.content}
                                                    </div>

                                                    {/* Side Stations */}
                                                    {mainStation.side_stations && mainStation.side_stations.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                                                            {mainStation.side_stations.map((side, sideIndex) => (
                                                                <div key={side.id} className="bg-amber-500/10 rounded p-2 border border-amber-500/20">
                                                                    <div className="flex items-center gap-1 mb-1">
                                                                        <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                                                        <span className="text-xs font-medium text-amber-400">Side {sideIndex + 1}</span>
                                                                    </div>
                                                                    <div className="text-xs text-slate-600 whitespace-pre-wrap pl-4">
                                                                        {side.content}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
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
        </div>
    );
}
