import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Grid3X3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { DEFAULT_ROTATION_EVENTS, DAYS_OF_WEEK } from '../../types';
import type { PracticeSchedule, RotationEvent, RotationBlock } from '../../types';
import { RotationGrid } from './RotationGrid';
import { EventPalette } from './EventPalette';
import { CustomEventModal } from './CustomEventModal';

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

    useEffect(() => {
        if (hubId) {
            fetchData();
        }
    }, [hubId]);

    useEffect(() => {
        if (hubId) {
            fetchBlocksForDay();
        }
    }, [hubId, selectedDayOfWeek]);

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
                        end_time: schedule.end_time
                    });
                }
                return acc;
            }, new Map<string, { level: string; schedule_group: string; start_time: string; end_time: string }>());

        return Array.from(levelsWithPractice.values());
    }, [practiceSchedules, selectedDayOfWeek]);

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
            <div className="flex items-center justify-center">
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
            </div>

            {/* Day Title */}
            <div className="text-center">
                <h2 className="text-xl font-bold text-slate-900">
                    {DAYS_OF_WEEK[selectedDayOfWeek]} Rotations
                </h2>
                <p className="text-sm text-slate-500">
                    Set up the rotation schedule for every {DAYS_OF_WEEK[selectedDayOfWeek]}
                </p>
            </div>

            {/* Event Palette */}
            <EventPalette
                events={rotationEvents}
                selectedEvent={selectedEvent}
                onSelectEvent={setSelectedEvent}
                onAddCustom={() => setShowCustomEventModal(true)}
                onEventUpdated={handleEventCreated}
                canManage={canManage}
            />

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
        </div>
    );
}
