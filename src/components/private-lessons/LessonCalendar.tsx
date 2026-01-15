import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import {
    startOfWeek,
    endOfWeek,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    addWeeks,
    subWeeks,
    addMonths,
    subMonths,
    isToday,
    isBefore,
    startOfDay,
} from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { LessonSlot, LessonAvailability, CoachLessonProfile, LessonPackage, Profile } from '../../types';

interface LessonCalendarProps {
    coachId?: string; // Optional - if provided, only show this coach's slots
    onSlotSelect?: (slot: LessonSlot, packages?: LessonPackage[]) => void;
    view?: 'week' | 'month';
}

interface GeneratedSlot {
    id: string;
    coach_user_id: string;
    slot_date: string;
    start_time: string;
    end_time: string;
    max_gymnasts: number;
    status: 'available' | 'partial' | 'booked';
    is_generated: boolean;
    coach_profile?: Profile;
    availability_id?: string;
}

export function LessonCalendar({ coachId, onSlotSelect, view = 'week' }: LessonCalendarProps) {
    const { hub } = useHub();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [slots, setSlots] = useState<LessonSlot[]>([]);
    const [availability, setAvailability] = useState<LessonAvailability[]>([]);
    const [profiles, setProfiles] = useState<Record<string, CoachLessonProfile & { coach_profile?: Profile }>>({});
    const [packages, setPackages] = useState<Record<string, LessonPackage[]>>({});

    // Calculate date range based on view
    const dateRange = useMemo(() => {
        if (view === 'week') {
            return {
                start: startOfWeek(currentDate, { weekStartsOn: 0 }),
                end: endOfWeek(currentDate, { weekStartsOn: 0 }),
            };
        } else {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            return {
                start: startOfWeek(monthStart, { weekStartsOn: 0 }),
                end: endOfWeek(monthEnd, { weekStartsOn: 0 }),
            };
        }
    }, [currentDate, view]);

    const days = useMemo(() => {
        return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }, [dateRange]);

    useEffect(() => {
        if (hub) {
            fetchData();
        }
    }, [hub, dateRange, coachId]);

    const fetchData = async () => {
        if (!hub) return;

        setLoading(true);
        try {
            const startStr = format(dateRange.start, 'yyyy-MM-dd');
            const endStr = format(dateRange.end, 'yyyy-MM-dd');

            // Fetch existing slots
            let slotsQuery = supabase
                .from('lesson_slots')
                .select('*, coach_profile:profiles!coach_user_id(id, full_name, avatar_url)')
                .eq('hub_id', hub.id)
                .gte('slot_date', startStr)
                .lte('slot_date', endStr)
                .neq('status', 'cancelled');

            if (coachId) {
                slotsQuery = slotsQuery.eq('coach_user_id', coachId);
            }

            const { data: slotsData, error: slotsError } = await slotsQuery;
            if (slotsError) throw slotsError;
            setSlots(slotsData || []);

            // Fetch recurring availability
            let availQuery = supabase
                .from('lesson_availability')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('is_active', true);

            if (coachId) {
                availQuery = availQuery.eq('coach_user_id', coachId);
            }

            const { data: availData, error: availError } = await availQuery;
            if (availError) throw availError;
            setAvailability(availData || []);

            // Fetch coach profiles
            let profilesQuery = supabase
                .from('coach_lesson_profiles')
                .select('*, coach_profile:profiles!coach_user_id(id, full_name, avatar_url)')
                .eq('hub_id', hub.id)
                .eq('is_active', true);

            if (coachId) {
                profilesQuery = profilesQuery.eq('coach_user_id', coachId);
            }

            const { data: profilesData, error: profilesError } = await profilesQuery;
            if (profilesError) throw profilesError;

            const profilesMap: Record<string, CoachLessonProfile & { coach_profile?: Profile }> = {};
            profilesData?.forEach(p => {
                profilesMap[p.coach_user_id] = p;
            });
            setProfiles(profilesMap);

            // Fetch lesson packages
            let packagesQuery = supabase
                .from('lesson_packages')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (coachId) {
                packagesQuery = packagesQuery.eq('coach_user_id', coachId);
            }

            const { data: packagesData, error: packagesError } = await packagesQuery;
            if (packagesError) throw packagesError;

            // Group packages by coach
            const packagesMap: Record<string, LessonPackage[]> = {};
            packagesData?.forEach((pkg: LessonPackage) => {
                if (!packagesMap[pkg.coach_user_id]) {
                    packagesMap[pkg.coach_user_id] = [];
                }
                packagesMap[pkg.coach_user_id].push(pkg);
            });
            setPackages(packagesMap);
        } catch (err) {
            console.error('Error fetching calendar data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Helper to convert time string to minutes since midnight
    const timeToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    // Helper to convert minutes since midnight to time string
    const minutesToTime = (minutes: number): string => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    };

    // Generate slots from recurring availability
    const generatedSlots = useMemo((): GeneratedSlot[] => {
        const generated: GeneratedSlot[] = [];
        const today = startOfDay(new Date());

        days.forEach(day => {
            if (isBefore(day, today)) return; // Skip past days

            const dayOfWeek = day.getDay();
            const dateStr = format(day, 'yyyy-MM-dd');

            // Check if there are already slots for this day
            const existingSlots = slots.filter(s => s.slot_date === dateStr);

            // Find recurring availability for this day
            availability.forEach(avail => {
                if (avail.day_of_week !== dayOfWeek) return;

                // Check effective dates
                if (avail.effective_from && dateStr < avail.effective_from) return;
                if (avail.effective_until && dateStr > avail.effective_until) return;

                const profile = profiles[avail.coach_user_id];
                const coachPackages = packages[avail.coach_user_id] || [];

                // Use the shortest package duration so all package options can fit
                // If no packages, fall back to profile duration or 30 min default
                const lessonDuration = coachPackages.length > 0
                    ? Math.min(...coachPackages.map(p => p.duration_minutes))
                    : (profile?.lesson_duration_minutes || 30);

                // Calculate slot times within the availability window
                const availStartMinutes = timeToMinutes(avail.start_time);
                const availEndMinutes = timeToMinutes(avail.end_time);

                // Generate individual lesson slots within the availability window
                let slotStartMinutes = availStartMinutes;
                while (slotStartMinutes + lessonDuration <= availEndMinutes) {
                    const slotStartTime = minutesToTime(slotStartMinutes);
                    const slotEndTime = minutesToTime(slotStartMinutes + lessonDuration);

                    // Check if this specific slot already exists
                    const exists = existingSlots.some(
                        s => s.coach_user_id === avail.coach_user_id &&
                            s.start_time === slotStartTime
                    );

                    if (!exists) {
                        generated.push({
                            id: `gen-${avail.id}-${dateStr}-${slotStartTime}`,
                            coach_user_id: avail.coach_user_id,
                            slot_date: dateStr,
                            start_time: slotStartTime,
                            end_time: slotEndTime,
                            max_gymnasts: profile?.max_gymnasts_per_slot || 1,
                            status: 'available',
                            is_generated: true,
                            coach_profile: profile?.coach_profile,
                            availability_id: avail.id,
                        });
                    }

                    slotStartMinutes += lessonDuration;
                }
            });
        });

        return generated;
    }, [days, slots, availability, profiles, packages]);

    // Combine real and generated slots
    const allSlots = useMemo(() => {
        const combined: (LessonSlot | GeneratedSlot)[] = [
            ...slots.map(s => ({ ...s, is_generated: false })),
            ...generatedSlots,
        ];

        return combined.sort((a, b) => {
            if (a.slot_date !== b.slot_date) {
                return a.slot_date.localeCompare(b.slot_date);
            }
            return a.start_time.localeCompare(b.start_time);
        });
    }, [slots, generatedSlots]);

    // Get slots for a specific day
    const getSlotsForDay = (date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return allSlots.filter(s => s.slot_date === dateStr);
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const handleSlotClick = async (slot: LessonSlot | GeneratedSlot) => {
        if (slot.status === 'booked') return;

        const coachPackages = packages[slot.coach_user_id] || [];

        // If it's a generated slot, create it first
        if ('is_generated' in slot && slot.is_generated) {
            try {
                const { data, error } = await supabase
                    .from('lesson_slots')
                    .insert({
                        hub_id: hub!.id,
                        coach_user_id: slot.coach_user_id,
                        slot_date: slot.slot_date,
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                        max_gymnasts: slot.max_gymnasts,
                        availability_id: slot.availability_id,
                        is_one_off: false,
                        status: 'available',
                    })
                    .select('*')
                    .single();

                if (error) throw error;
                onSlotSelect?.(data, coachPackages);
            } catch (err) {
                console.error('Error creating slot:', err);
            }
        } else {
            onSlotSelect?.(slot as LessonSlot, coachPackages);
        }
    };

    const navigate = (direction: 'prev' | 'next') => {
        if (view === 'week') {
            setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
        } else {
            setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
        }
    };

    const getSlotStatusColor = (status: string) => {
        switch (status) {
            case 'available':
                return 'bg-green-100 text-green-700 hover:bg-green-200 border-green-300';
            case 'partial':
                return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-300';
            case 'booked':
                return 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200';
            default:
                return 'bg-slate-50 text-slate-500 border-slate-200';
        }
    };

    if (loading) {
        return (
            <div className="card p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="card overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-brand-600" />
                    <h3 className="font-semibold text-slate-900">
                        {view === 'week'
                            ? `Week of ${format(dateRange.start, 'MMM d, yyyy')}`
                            : format(currentDate, 'MMMM yyyy')
                        }
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button
                        onClick={() => navigate('prev')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <button
                        onClick={() => navigate('next')}
                        className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-slate-500 uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {days.map(day => {
                        const daySlots = getSlotsForDay(day);
                        const isPast = isBefore(day, startOfDay(new Date()));
                        const isCurrentMonth = view === 'month' ? isSameMonth(day, currentDate) : true;

                        return (
                            <div
                                key={day.toISOString()}
                                className={`min-h-[100px] p-2 rounded-lg border transition-colors ${
                                    isToday(day)
                                        ? 'border-brand-300 bg-brand-50/30'
                                        : 'border-slate-200'
                                } ${
                                    !isCurrentMonth ? 'bg-slate-50/50' : ''
                                } ${
                                    isPast ? 'opacity-50' : ''
                                }`}
                            >
                                <div className={`text-sm font-medium mb-1 ${
                                    isToday(day) ? 'text-brand-600' :
                                    !isCurrentMonth ? 'text-slate-400' : 'text-slate-700'
                                }`}>
                                    {format(day, 'd')}
                                </div>

                                {/* Slots */}
                                <div className="space-y-1">
                                    {daySlots.slice(0, 3).map(slot => (
                                        <button
                                            key={slot.id}
                                            onClick={() => !isPast && handleSlotClick(slot)}
                                            disabled={isPast || slot.status === 'booked'}
                                            className={`w-full px-1.5 py-1 text-xs rounded border transition-colors ${
                                                getSlotStatusColor(slot.status)
                                            }`}
                                        >
                                            {formatTime(slot.start_time)}
                                        </button>
                                    ))}
                                    {daySlots.length > 3 && (
                                        <p className="text-xs text-slate-400 text-center">
                                            +{daySlots.length - 3} more
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="px-4 pb-4 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
                    <span className="text-slate-600">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></div>
                    <span className="text-slate-600">Partial</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                    <span className="text-slate-600">Booked</span>
                </div>
            </div>
        </div>
    );
}
