import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Loader2, Grid3X3, Maximize2, Minimize2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ROTATION_EVENTS, DAYS_OF_WEEK } from '../../types';
import type { PracticeSchedule, RotationEvent, RotationBlock } from '../../types';
import { RotationGrid } from './RotationGrid';
import { EventPalette } from './EventPalette';
import { CustomEventModal } from './CustomEventModal';

interface RotationGridSettings {
    id: string;
    hub_id: string;
    day_of_week: number;
    column_order: number[];
    combined_indices: number[][];
    updated_by: string | null;
    updated_at: string;
}

interface DailyRotationTabProps {
    canManage: boolean;
}

interface Coach {
    id: string;
    full_name: string;
}

export function DailyRotationTab({ canManage }: DailyRotationTabProps) {
    const { hubId } = useParams();
    useHub(); // For context access
    const { user } = useAuth();

    // Use day of week (0-6) instead of specific date
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState(new Date().getDay());
    const [practiceSchedules, setPracticeSchedules] = useState<PracticeSchedule[]>([]);
    const [rotationEvents, setRotationEvents] = useState<RotationEvent[]>([]);
    const [rotationBlocks, setRotationBlocks] = useState<RotationBlock[]>([]);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState<RotationEvent | null>(null);
    const [showCustomEventModal, setShowCustomEventModal] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [columnOrder, setColumnOrder] = useState<number[]>([]);
    const [combinedIndices, setCombinedIndices] = useState<number[][]>([]);
    const [gridSettings, setGridSettings] = useState<RotationGridSettings | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Handle ESC key to exit fullscreen
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    // Cleanup save timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (hubId) {
            fetchData();
        }
    }, [hubId]);

    useEffect(() => {
        if (hubId) {
            fetchBlocksForDay();
            fetchGridSettings();
        }
    }, [hubId, selectedDayOfWeek]);

    // Save grid settings with debounce
    const saveGridSettings = useCallback(async (newColumnOrder: number[], newCombinedIndices: number[][]) => {
        if (!hubId || !user) return;

        // Clear any pending save
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce the save
        saveTimeoutRef.current = setTimeout(async () => {
            const settingsData = {
                hub_id: hubId,
                day_of_week: selectedDayOfWeek,
                column_order: newColumnOrder,
                combined_indices: newCombinedIndices,
                updated_by: user.id,
                updated_at: new Date().toISOString()
            };

            if (gridSettings?.id) {
                // Update existing
                await supabase
                    .from('rotation_grid_settings')
                    .update(settingsData)
                    .eq('id', gridSettings.id);
            } else {
                // Insert new
                const { data } = await supabase
                    .from('rotation_grid_settings')
                    .insert(settingsData)
                    .select()
                    .single();

                if (data) {
                    setGridSettings(data);
                }
            }
        }, 500);
    }, [hubId, user, selectedDayOfWeek, gridSettings?.id]);

    const fetchGridSettings = async () => {
        if (!hubId) return;

        const { data, error } = await supabase
            .from('rotation_grid_settings')
            .select('*')
            .eq('hub_id', hubId)
            .eq('day_of_week', selectedDayOfWeek)
            .single();

        if (error && error.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is fine
            console.error('Error fetching grid settings:', error);
        }

        if (data) {
            setGridSettings(data);

            // Validate and clean up column order
            const savedColumnOrder = data.column_order || [];
            // Will be validated when activeLevelsForDay is available

            // Validate and clean up combined indices
            const savedCombinedIndices = data.combined_indices || [];
            // Filter out any groups with invalid indices (we'll fully validate when we know activeLevels count)
            const cleanedCombinedIndices = savedCombinedIndices
                .filter((group: number[]) => Array.isArray(group))
                .map((group: number[]) => group.filter((idx: number) => typeof idx === 'number' && idx >= 0))
                .filter((group: number[]) => group.length > 1);

            setColumnOrder(savedColumnOrder);
            setCombinedIndices(cleanedCombinedIndices);
        } else {
            setGridSettings(null);
            // Don't reset column order here - let the activeLevelsForDay effect handle defaults
        }
    };

    const fetchData = async () => {
        if (!hubId) return;
        setLoading(true);

        const [schedulesResult, eventsResult, coachesResult] = await Promise.all([
            supabase
                .from('practice_schedules')
                .select('*')
                .eq('hub_id', hubId),
            supabase
                .from('rotation_events')
                .select('*')
                .eq('hub_id', hubId)
                .order('display_order'),
            // Fetch staff members who are coaches (owner, director, admin, coach roles)
            supabase
                .from('hub_members')
                .select('user_id, profile:profiles(id, full_name)')
                .eq('hub_id', hubId)
                .in('role', ['owner', 'director', 'admin', 'coach'])
        ]);

        if (schedulesResult.data) {
            setPracticeSchedules(schedulesResult.data);
        }

        if (eventsResult.data) {
            // If no events exist, seed default events
            if (eventsResult.data.length === 0) {
                await seedDefaultEvents();
            } else {
                setRotationEvents(eventsResult.data);
            }
        }

        if (coachesResult.data) {
            const coachList: Coach[] = [];
            for (const m of coachesResult.data) {
                if (m.profile && typeof m.profile === 'object' && 'id' in m.profile && 'full_name' in m.profile) {
                    const profile = m.profile as { id: string; full_name: string };
                    coachList.push({
                        id: profile.id,
                        full_name: profile.full_name
                    });
                }
            }
            coachList.sort((a, b) => a.full_name.localeCompare(b.full_name));
            setCoaches(coachList);
        }

        await fetchBlocksForDay();
        setLoading(false);
    };

    const seedDefaultEvents = async () => {
        if (!hubId || !user) return;

        const eventsToInsert = DEFAULT_ROTATION_EVENTS.map(event => ({
            hub_id: hubId,
            name: event.name,
            color: event.color,
            is_default: true,
            display_order: event.display_order,
            created_by: user.id
        }));

        const { data, error } = await supabase
            .from('rotation_events')
            .insert(eventsToInsert)
            .select();

        if (error) {
            console.error('Error seeding events:', error);
        } else {
            setRotationEvents(data || []);
        }
    };

    const fetchBlocksForDay = async () => {
        if (!hubId) return;

        const { data, error } = await supabase
            .from('rotation_blocks')
            .select('*, rotation_event:rotation_events(*), coach:profiles!rotation_blocks_coach_id_fkey(id, full_name)')
            .eq('hub_id', hubId)
            .eq('day_of_week', selectedDayOfWeek)
            .order('start_time');

        if (error) {
            console.error('Error fetching blocks:', error);
        } else {
            setRotationBlocks(data || []);
        }
    };

    // Get levels that have practice on the selected day
    const activeLevelsForDay = useMemo(() => {
        const levelsWithPractice = practiceSchedules
            .filter(s => s.day_of_week === selectedDayOfWeek)
            .reduce((acc, schedule) => {
                const key = `${schedule.level}|${schedule.schedule_group}`;
                if (!acc.has(key)) {
                    acc.set(key, {
                        level: schedule.level,
                        schedule_group: schedule.schedule_group,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        is_external_group: schedule.is_external_group || false
                    });
                }
                return acc;
            }, new Map<string, { level: string; schedule_group: string; start_time: string; end_time: string; is_external_group: boolean }>());

        // Sort: roster levels first, then external groups
        const result = Array.from(levelsWithPractice.values());
        result.sort((a, b) => {
            if (a.is_external_group !== b.is_external_group) {
                return a.is_external_group ? 1 : -1;
            }
            return a.level.localeCompare(b.level);
        });
        return result;
    }, [practiceSchedules, selectedDayOfWeek]);

    // Validate and reset column order when active levels change
    useEffect(() => {
        const levelCount = activeLevelsForDay.length;
        if (levelCount === 0) return;

        // Check if current column order is valid
        const isColumnOrderValid = columnOrder.length === levelCount &&
            columnOrder.every(idx => typeof idx === 'number' && idx >= 0 && idx < levelCount) &&
            new Set(columnOrder).size === levelCount; // All unique indices

        // Check if combined indices are valid
        const validCombinedIndices = combinedIndices
            .map(group => group.filter(idx => typeof idx === 'number' && idx >= 0 && idx < levelCount))
            .filter(group => group.length > 1);

        const combinedIndicesChanged = JSON.stringify(validCombinedIndices) !== JSON.stringify(combinedIndices);

        if (!isColumnOrderValid) {
            // Reset to default order
            setColumnOrder(activeLevelsForDay.map((_, i) => i));
            setCombinedIndices([]);
        } else if (combinedIndicesChanged) {
            // Just clean up combined indices
            setCombinedIndices(validCombinedIndices);
        }
    }, [activeLevelsForDay.length, columnOrder, combinedIndices]);

    const handleColumnOrderChange = useCallback((newOrder: number[]) => {
        setColumnOrder(newOrder);
        saveGridSettings(newOrder, combinedIndices);
    }, [combinedIndices, saveGridSettings]);

    const handleCombinedIndicesChange = useCallback((newIndices: number[][]) => {
        setCombinedIndices(newIndices);
        saveGridSettings(columnOrder, newIndices);
    }, [columnOrder, saveGridSettings]);

    const handleResetColumns = useCallback(() => {
        const defaultOrder = activeLevelsForDay.map((_, i) => i);
        setColumnOrder(defaultOrder);
        setCombinedIndices([]);
        saveGridSettings(defaultOrder, []);
    }, [activeLevelsForDay, saveGridSettings]);

    const handleBlockCreated = async () => {
        await fetchBlocksForDay();
    };

    const handleBlockDeleted = async (blockId: string) => {
        const { error } = await supabase
            .from('rotation_blocks')
            .delete()
            .eq('id', blockId);

        if (error) {
            console.error('Error deleting block:', error);
        } else {
            await fetchBlocksForDay();
        }
    };

    const handleBlockUpdated = async () => {
        await fetchBlocksForDay();
    };

    const handleEventCreated = async () => {
        const { data } = await supabase
            .from('rotation_events')
            .select('*')
            .eq('hub_id', hubId)
            .order('display_order');

        if (data) {
            setRotationEvents(data);
        }
        setShowCustomEventModal(false);
    };

    const goToPreviousDay = useCallback(() => {
        setSelectedDayOfWeek(prev => (prev === 0 ? 6 : prev - 1));
    }, []);

    const goToNextDay = useCallback(() => {
        setSelectedDayOfWeek(prev => (prev === 6 ? 0 : prev + 1));
    }, []);

    // Fullscreen view component
    const FullscreenView = () => {
        if (!isFullscreen) return null;

        return createPortal(
            <div className="fixed inset-0 z-50 bg-white flex flex-col">
                {/* Fullscreen Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={goToPreviousDay}
                            className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-900">
                                {DAYS_OF_WEEK[selectedDayOfWeek]} Rotations
                            </h1>
                        </div>
                        <button
                            onClick={goToNextDay}
                            className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Day quick-select in fullscreen */}
                        <div className="hidden sm:flex bg-slate-100 rounded-lg p-1">
                            {DAYS_OF_WEEK.map((day, index) => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDayOfWeek(index)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                                        selectedDayOfWeek === index
                                            ? 'bg-white text-brand-700 shadow-sm'
                                            : 'text-slate-600 hover:text-slate-900'
                                    }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                        {canManage && combinedIndices.length > 0 && (
                            <button
                                onClick={handleResetColumns}
                                className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-700 font-medium"
                                title="Reset column order and combined groups"
                            >
                                <RotateCcw className="w-4 h-4" />
                                <span className="hidden sm:inline">Reset Columns</span>
                            </button>
                        )}
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
                        >
                            <Minimize2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Exit Fullscreen</span>
                        </button>
                    </div>
                </div>

                {/* Fullscreen Content */}
                <div className="flex-1 overflow-auto p-6">
                    {activeLevelsForDay.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <Grid3X3 className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-xl font-medium text-slate-900 mb-2">No practice scheduled</h3>
                                <p className="text-slate-500">
                                    {DAYS_OF_WEEK[selectedDayOfWeek]} has no practice times set.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <RotationGrid
                            dayOfWeek={selectedDayOfWeek}
                            activeLevels={activeLevelsForDay}
                            blocks={rotationBlocks}
                            selectedEvent={selectedEvent}
                            coaches={coaches}
                            onBlockCreated={handleBlockCreated}
                            onBlockDeleted={handleBlockDeleted}
                            onBlockUpdated={handleBlockUpdated}
                            canManage={canManage}
                            columnOrder={columnOrder}
                            onColumnOrderChange={handleColumnOrderChange}
                            combinedIndices={combinedIndices}
                            onCombinedIndicesChange={handleCombinedIndicesChange}
                        />
                    )}
                </div>

                {/* Fullscreen Footer - Event palette for editing */}
                {canManage && activeLevelsForDay.length > 0 && (
                    <div className="border-t border-slate-200 bg-slate-50 px-6 py-3">
                        <EventPalette
                            events={rotationEvents}
                            selectedEvent={selectedEvent}
                            onSelectEvent={setSelectedEvent}
                            onAddCustom={() => setShowCustomEventModal(true)}
                            onEventUpdated={handleEventCreated}
                            canManage={canManage}
                        />
                    </div>
                )}

                {/* ESC hint */}
                <div className="absolute bottom-4 left-4 text-xs text-slate-400">
                    Press ESC to exit fullscreen
                </div>
            </div>,
            document.body
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Day of Week Selector */}
            <div className="flex items-center justify-center gap-4">
                <div className="inline-flex bg-slate-100 rounded-lg p-1">
                    {DAYS_OF_WEEK.map((day, index) => (
                        <button
                            key={day}
                            onClick={() => setSelectedDayOfWeek(index)}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${
                                selectedDayOfWeek === index
                                    ? 'bg-white text-brand-700 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                            }`}
                        >
                            {day.slice(0, 3)}
                        </button>
                    ))}
                </div>
                {canManage && combinedIndices.length > 0 && (
                    <button
                        onClick={handleResetColumns}
                        className="flex items-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-lg text-amber-700 transition-colors"
                        title="Reset column order and combined groups"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">Reset</span>
                    </button>
                )}
                <button
                    onClick={() => setIsFullscreen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
                    title="Fullscreen view"
                >
                    <Maximize2 className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Fullscreen</span>
                </button>
            </div>

            {/* Day Title */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">
                    {DAYS_OF_WEEK[selectedDayOfWeek]} Rotations
                </h2>
                <p className="text-sm text-slate-500">
                    {canManage ? 'Set up the rotation schedule for every' : 'Rotation schedule for every'} {DAYS_OF_WEEK[selectedDayOfWeek]}
                </p>
            </div>

            {/* Event Palette - Sticky */}
            <div className="sticky top-0 z-10 bg-slate-50 -mx-6 px-6 py-3 border-b border-slate-200 shadow-sm">
                <EventPalette
                    events={rotationEvents}
                    selectedEvent={selectedEvent}
                    onSelectEvent={setSelectedEvent}
                    onAddCustom={() => setShowCustomEventModal(true)}
                    onEventUpdated={handleEventCreated}
                    canManage={canManage}
                />
            </div>

            {/* Rotation Grid */}
            {activeLevelsForDay.length === 0 ? (
                <div className="card p-12 text-center">
                    <Grid3X3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No practice scheduled</h3>
                    <p className="text-slate-500">
                        {DAYS_OF_WEEK[selectedDayOfWeek]} has no practice times set.
                        {canManage && ' Add practice times in the Weekly Schedule tab.'}
                    </p>
                </div>
            ) : (
                <RotationGrid
                    dayOfWeek={selectedDayOfWeek}
                    activeLevels={activeLevelsForDay}
                    blocks={rotationBlocks}
                    selectedEvent={selectedEvent}
                    coaches={coaches}
                    onBlockCreated={handleBlockCreated}
                    onBlockDeleted={handleBlockDeleted}
                    onBlockUpdated={handleBlockUpdated}
                    canManage={canManage}
                    columnOrder={columnOrder}
                    onColumnOrderChange={handleColumnOrderChange}
                    combinedIndices={combinedIndices}
                    onCombinedIndicesChange={handleCombinedIndicesChange}
                />
            )}

            {/* Custom Event Modal */}
            {showCustomEventModal && (
                <CustomEventModal
                    isOpen={true}
                    onClose={() => setShowCustomEventModal(false)}
                    onSaved={handleEventCreated}
                />
            )}

            {/* Fullscreen View Portal */}
            <FullscreenView />
        </div>
    );
}
