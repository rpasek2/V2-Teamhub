import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    parseISO,
    isToday,
    getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Plus, Filter, LayoutGrid, MapPin, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { CreateEventModal } from '../components/calendar/CreateEventModal';
import { EventDetailsModal } from '../components/calendar/EventDetailsModal';
import type { Event } from '../types';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

// Hook to detect mobile screen size
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return isMobile;
}

type ViewType = 'month' | 'week' | 'agenda';
type EventType = 'all' | 'practice' | 'competition' | 'mentorship' | 'meeting' | 'social' | 'other';

const EVENT_TYPE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
    practice: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    competition: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    mentorship: { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
    meeting: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    social: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    other: { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' }
};

// Holiday definitions with emoji icons
interface Holiday {
    name: string;
    emoji: string;
    bgColor: string;
    textColor: string;
}

// Get nth weekday of month (e.g., 4th Thursday)
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
    const firstOfMonth = new Date(year, month, 1);
    const firstWeekday = getDay(firstOfMonth);
    let dayOffset = weekday - firstWeekday;
    if (dayOffset < 0) dayOffset += 7;
    return new Date(year, month, 1 + dayOffset + (n - 1) * 7);
}

// Get last weekday of month (e.g., last Monday)
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
    const lastOfMonth = new Date(year, month + 1, 0);
    const lastDay = lastOfMonth.getDate();
    const lastWeekday = getDay(lastOfMonth);
    let dayOffset = lastWeekday - weekday;
    if (dayOffset < 0) dayOffset += 7;
    return new Date(year, month, lastDay - dayOffset);
}

// Calculate Easter Sunday using the Anonymous Gregorian algorithm
function getEasterSunday(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month, day);
}

// Get all US holidays for a given year
function getUSHolidays(year: number): Map<string, Holiday> {
    const holidays = new Map<string, Holiday>();

    // Helper to add holiday
    const addHoliday = (date: Date, name: string, emoji: string, bgColor: string, textColor: string) => {
        const key = format(date, 'yyyy-MM-dd');
        holidays.set(key, { name, emoji, bgColor, textColor });
    };

    // Fixed date holidays
    addHoliday(new Date(year, 0, 1), "New Year's Day", '🎉', 'bg-gradient-to-br from-yellow-100 to-orange-100', 'text-orange-700');
    addHoliday(new Date(year, 1, 14), "Valentine's Day", '💕', 'bg-gradient-to-br from-pink-100 to-red-100', 'text-red-600');
    addHoliday(new Date(year, 2, 17), "St. Patrick's Day", '☘️', 'bg-gradient-to-br from-green-100 to-emerald-100', 'text-green-700');
    addHoliday(new Date(year, 6, 4), "Independence Day", '🇺🇸', 'bg-gradient-to-br from-blue-100 to-red-100', 'text-blue-700');
    addHoliday(new Date(year, 9, 31), "Halloween", '🎃', 'bg-gradient-to-br from-orange-100 to-purple-100', 'text-orange-600');
    addHoliday(new Date(year, 10, 11), "Veterans Day", '🎖️', 'bg-gradient-to-br from-red-100 to-blue-100', 'text-red-700');
    addHoliday(new Date(year, 11, 25), "Christmas Day", '🎄', 'bg-gradient-to-br from-red-100 to-green-100', 'text-red-600');
    addHoliday(new Date(year, 11, 31), "New Year's Eve", '🥳', 'bg-gradient-to-br from-purple-100 to-pink-100', 'text-purple-700');
    addHoliday(new Date(year, 11, 24), "Christmas Eve", '🎅', 'bg-gradient-to-br from-red-50 to-green-50', 'text-red-500');

    // Floating holidays
    addHoliday(getNthWeekdayOfMonth(year, 0, 1, 3), "MLK Jr. Day", '✊', 'bg-gradient-to-br from-slate-100 to-blue-100', 'text-slate-700');
    addHoliday(getNthWeekdayOfMonth(year, 1, 1, 3), "Presidents' Day", '🏛️', 'bg-gradient-to-br from-blue-100 to-red-100', 'text-blue-700');
    addHoliday(getNthWeekdayOfMonth(year, 4, 0, 2), "Mother's Day", '💐', 'bg-gradient-to-br from-pink-100 to-rose-100', 'text-pink-600');
    addHoliday(getLastWeekdayOfMonth(year, 4, 1), "Memorial Day", '🇺🇸', 'bg-gradient-to-br from-red-100 to-blue-100', 'text-red-700');
    addHoliday(getNthWeekdayOfMonth(year, 5, 0, 3), "Father's Day", '👔', 'bg-gradient-to-br from-blue-100 to-sky-100', 'text-blue-600');
    addHoliday(getNthWeekdayOfMonth(year, 8, 1, 1), "Labor Day", '⚒️', 'bg-gradient-to-br from-amber-100 to-yellow-100', 'text-amber-700');
    addHoliday(getNthWeekdayOfMonth(year, 9, 1, 2), "Columbus Day", '🧭', 'bg-gradient-to-br from-blue-100 to-indigo-100', 'text-blue-700');
    addHoliday(getNthWeekdayOfMonth(year, 10, 4, 4), "Thanksgiving", '🦃', 'bg-gradient-to-br from-orange-100 to-amber-100', 'text-orange-700');

    // Easter (calculated)
    const easter = getEasterSunday(year);
    addHoliday(easter, "Easter Sunday", '🐰', 'bg-gradient-to-br from-pink-100 to-purple-100', 'text-pink-600');

    // Juneteenth
    addHoliday(new Date(year, 5, 19), "Juneteenth", '✊', 'bg-gradient-to-br from-red-100 to-green-100', 'text-red-700');

    return holidays;
}

// Pre-compute holidays for a reasonable range of years (module-level constant)
// This avoids recalculating holidays on every currentDate change
const ALL_HOLIDAYS_MAP = new Map<string, Holiday>();
for (let year = 2020; year <= 2035; year++) {
    const yearHolidays = getUSHolidays(year);
    yearHolidays.forEach((holiday, key) => ALL_HOLIDAYS_MAP.set(key, holiday));
}

export function Calendar() {
    const { hub, currentRole } = useHub();
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedDayForMobile, setSelectedDayForMobile] = useState<Date | null>(null);
    // Default to agenda view on mobile for better UX
    const [view, setView] = useState<ViewType>('month');
    const [filterType, setFilterType] = useState<EventType>('all');
    const [showFilter, setShowFilter] = useState(false);

    // Permission check - admins, directors, owners, and coaches can add events
    const canAddEvents = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    // Helper to get holiday for a day (uses pre-computed module-level holidays)
    const getHolidayForDay = (day: Date): Holiday | undefined => {
        const key = format(day, 'yyyy-MM-dd');
        return ALL_HOLIDAYS_MAP.get(key);
    };

    useEffect(() => {
        if (hub) {
            fetchEvents();
        }
    }, [hub, currentDate, view]);

    // Handle opening event from URL query param
    useEffect(() => {
        const eventId = searchParams.get('event');
        if (eventId && events.length > 0 && !loading) {
            const event = events.find(e => e.id === eventId);
            if (event) {
                setSelectedEvent(event);
                setIsDetailsModalOpen(true);
                // Clear the query param
                setSearchParams({}, { replace: true });
            } else {
                // Event not in current view, try to fetch it directly
                fetchEventById(eventId);
            }
        }
    }, [events, loading, searchParams]);

    const fetchEventById = async (eventId: string) => {
        if (!hub) return;
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .eq('hub_id', hub.id)
                .single();

            if (!error && data) {
                setSelectedEvent(data);
                setIsDetailsModalOpen(true);
                // Navigate to the event's month
                setCurrentDate(parseISO(data.start_time));
                // Clear the query param
                setSearchParams({}, { replace: true });
            }
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const fetchEvents = async () => {
        if (!hub) return;
        setLoading(true);

        let start: string;
        let end: string;

        if (view === 'week') {
            start = startOfWeek(currentDate).toISOString();
            end = endOfWeek(currentDate).toISOString();
        } else {
            start = startOfMonth(currentDate).toISOString();
            end = endOfMonth(currentDate).toISOString();
        }

        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('hub_id', hub.id)
                .gte('start_time', start)
                .lte('start_time', end)
                .order('start_time', { ascending: true });

            if (error) throw error;
            setEvents(data || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextPeriod = () => {
        if (view === 'week') {
            setCurrentDate(addWeeks(currentDate, 1));
        } else {
            setCurrentDate(addMonths(currentDate, 1));
        }
    };

    const prevPeriod = () => {
        if (view === 'week') {
            setCurrentDate(subWeeks(currentDate, 1));
        } else {
            setCurrentDate(subMonths(currentDate, 1));
        }
    };

    const goToToday = () => setCurrentDate(new Date());

    const handleDayClick = (day: Date) => {
        if (isMobile) {
            // On mobile, first tap shows events for that day
            setSelectedDayForMobile(day);
        } else if (canAddEvents) {
            setSelectedDate(day);
            setIsCreateModalOpen(true);
        }
    };

    const handleMobileAddEvent = () => {
        if (selectedDayForMobile) {
            setSelectedDate(selectedDayForMobile);
            setIsCreateModalOpen(true);
            setSelectedDayForMobile(null);
        }
    };

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const calendarStart = startOfWeek(view === 'week' ? currentDate : monthStart);
    const calendarEnd = view === 'week' ? endOfWeek(currentDate) : endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: calendarStart,
        end: calendarEnd,
    });

    const filteredEvents = filterType === 'all'
        ? events
        : events.filter(e => e.type === filterType);

    const getEventsForDay = (day: Date) => {
        return filteredEvents.filter(event => isSameDay(parseISO(event.start_time), day));
    };

    const getEventColors = (type: string) => {
        return EVENT_TYPE_COLORS[type] || EVENT_TYPE_COLORS.other;
    };

    const getHeaderText = () => {
        if (view === 'week') {
            const weekStart = startOfWeek(currentDate);
            const weekEnd = endOfWeek(currentDate);
            if (weekStart.getMonth() === weekEnd.getMonth()) {
                return format(weekStart, 'MMMM yyyy');
            }
            return `${format(weekStart, 'MMM')} - ${format(weekEnd, 'MMM yyyy')}`;
        }
        return format(currentDate, 'MMMM yyyy');
    };

    return (
        <div className="flex h-full flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-slate-900">
                        <time dateTime={format(currentDate, 'yyyy-MM')}>{getHeaderText()}</time>
                    </h1>
                    <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={prevPeriod}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={goToToday}
                            className="px-3 py-1 text-sm font-medium text-slate-700 hover:bg-white hover:shadow-sm rounded-md transition-all"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={nextPeriod}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Filter Dropdown */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowFilter(!showFilter)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                                filterType !== 'all'
                                    ? "bg-brand-50 border-brand-200 text-brand-700"
                                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <Filter className="h-4 w-4" />
                            <span className="hidden sm:inline">
                                {filterType === 'all' ? 'All Types' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                            </span>
                        </button>
                        {showFilter && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                                    {['all', 'practice', 'competition', 'meeting', 'social', 'other'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => {
                                                setFilterType(type as EventType);
                                                setShowFilter(false);
                                            }}
                                            className={cn(
                                                "w-full px-4 py-2 text-left text-sm flex items-center gap-3",
                                                filterType === type ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                                            )}
                                        >
                                            {type !== 'all' && (
                                                <span className={cn("w-2 h-2 rounded-full", EVENT_TYPE_COLORS[type]?.dot || 'bg-slate-400')} />
                                            )}
                                            <span className="capitalize">{type === 'all' ? 'All Types' : type}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* View Toggle */}
                    <div className="flex rounded-lg bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setView('month')}
                            className={cn(
                                "p-2 rounded-md text-sm font-medium transition-all",
                                view === 'month' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                            )}
                            title="Month View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('week')}
                            className={cn(
                                "p-2 rounded-md text-sm font-medium transition-all",
                                view === 'week' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                            )}
                            title="Week View"
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('agenda')}
                            className={cn(
                                "p-2 rounded-md text-sm font-medium transition-all",
                                view === 'agenda' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'
                            )}
                            title="Agenda View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Add Event Button */}
                    {canAddEvents && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedDate(null);
                                setIsCreateModalOpen(true);
                            }}
                            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Add Event</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Calendar Grid */}
            {view === 'month' || view === 'week' ? (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                        {(isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day, idx) => (
                            <div key={idx} className="py-2 sm:py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className={cn(
                        "flex-1 grid grid-cols-7",
                        view === 'week' ? 'grid-rows-1' : 'auto-rows-fr'
                    )}>
                        {calendarDays.map((day, idx) => {
                            const dayEvents = getEventsForDay(day);
                            const isCurrentMonth = view === 'week' || isSameMonth(day, currentDate);
                            const isCurrentDay = isToday(day);
                            const isSelected = selectedDayForMobile && isSameDay(day, selectedDayForMobile);
                            const holiday = getHolidayForDay(day);

                            return (
                                <div
                                    key={day.toString()}
                                    onClick={() => handleDayClick(day)}
                                    className={cn(
                                        "min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r border-slate-100 transition-colors relative overflow-hidden",
                                        isCurrentMonth ? 'bg-white' : 'bg-slate-50/50',
                                        (canAddEvents || isMobile) && 'cursor-pointer hover:bg-slate-50',
                                        isSelected && 'bg-brand-50 ring-2 ring-inset ring-brand-500',
                                        idx % 7 === 0 && 'border-l-0',
                                        holiday && !isSelected && holiday.bgColor
                                    )}
                                >
                                    {/* Holiday background decoration */}
                                    {holiday && (
                                        <div className="absolute -right-2 -bottom-2 text-4xl sm:text-6xl opacity-20 pointer-events-none select-none">
                                            {holiday.emoji}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mb-0.5 sm:mb-1 relative z-10">
                                        <div className="flex items-center gap-1">
                                            <time
                                                dateTime={format(day, 'yyyy-MM-dd')}
                                                className={cn(
                                                    "flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-medium",
                                                    isCurrentDay
                                                        ? 'bg-brand-600 text-white'
                                                        : holiday
                                                            ? holiday.textColor
                                                            : isCurrentMonth
                                                                ? 'text-slate-900'
                                                                : 'text-slate-400'
                                                )}
                                            >
                                                {format(day, 'd')}
                                            </time>
                                            {/* Holiday emoji indicator (mobile) */}
                                            {isMobile && holiday && (
                                                <span className="text-sm">{holiday.emoji}</span>
                                            )}
                                        </div>
                                        {/* Mobile: Show dot indicators for events */}
                                        {isMobile && dayEvents.length > 0 && (
                                            <div className="flex gap-0.5">
                                                {dayEvents.slice(0, 3).map((event) => (
                                                    <span
                                                        key={event.id}
                                                        className={cn("w-1.5 h-1.5 rounded-full", getEventColors(event.type).dot)}
                                                    />
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <span className="text-[10px] text-slate-400 ml-0.5">+{dayEvents.length - 3}</span>
                                                )}
                                            </div>
                                        )}
                                        {/* Desktop: Show overflow count */}
                                        {!isMobile && dayEvents.length > (holiday ? 2 : 3) && (
                                            <span className="text-xs text-slate-500 font-medium">
                                                +{dayEvents.length - (holiday ? 2 : 3)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Desktop: Show holiday banner */}
                                    {!isMobile && holiday && (
                                        <div className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-semibold mb-1 truncate",
                                            holiday.textColor
                                        )}>
                                            <span>{holiday.emoji}</span>
                                            <span className="truncate">{holiday.name}</span>
                                        </div>
                                    )}

                                    {/* Desktop: Show event cards */}
                                    {!isMobile && (
                                        <div className="space-y-1 overflow-hidden relative z-10">
                                            {dayEvents.slice(0, holiday ? 2 : 3).map((event) => {
                                                const colors = getEventColors(event.type);
                                                return (
                                                    <button
                                                        key={event.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedEvent(event);
                                                            setIsDetailsModalOpen(true);
                                                        }}
                                                        className={cn(
                                                            "w-full text-left px-2 py-1 rounded-md text-xs font-medium truncate transition-all hover:ring-2 hover:ring-brand-300",
                                                            colors.bg,
                                                            colors.text
                                                        )}
                                                    >
                                                        <span className="hidden sm:inline">{format(parseISO(event.start_time), 'h:mma')} </span>
                                                        {event.title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile: Selected Day Events Panel */}
                    {isMobile && selectedDayForMobile && (
                        <div className="border-t border-slate-200 bg-white">
                            <div className={cn(
                                "px-4 py-3 flex items-center justify-between border-b border-slate-100",
                                getHolidayForDay(selectedDayForMobile)?.bgColor
                            )}>
                                <div>
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        {format(selectedDayForMobile, 'EEEE, MMMM d')}
                                        {getHolidayForDay(selectedDayForMobile) && (
                                            <span className="text-lg">{getHolidayForDay(selectedDayForMobile)?.emoji}</span>
                                        )}
                                    </h3>
                                    {getHolidayForDay(selectedDayForMobile) ? (
                                        <p className={cn("text-xs font-medium", getHolidayForDay(selectedDayForMobile)?.textColor)}>
                                            {getHolidayForDay(selectedDayForMobile)?.name}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-500">
                                            {getEventsForDay(selectedDayForMobile).length} event{getEventsForDay(selectedDayForMobile).length !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {canAddEvents && (
                                        <button
                                            onClick={handleMobileAddEvent}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-medium"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedDayForMobile(null)}
                                        className="p-1.5 text-slate-400 hover:text-slate-600"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-48 overflow-y-auto">
                                {getEventsForDay(selectedDayForMobile).length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {getEventsForDay(selectedDayForMobile).map((event) => {
                                            const colors = getEventColors(event.type);
                                            return (
                                                <button
                                                    key={event.id}
                                                    onClick={() => {
                                                        setSelectedEvent(event);
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
                                                >
                                                    <div className={cn("w-1 h-full min-h-[40px] rounded-full flex-shrink-0", colors.dot)} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-slate-900 text-sm truncate">{event.title}</p>
                                                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{format(parseISO(event.start_time), 'h:mm a')}</span>
                                                            {event.location && (
                                                                <>
                                                                    <MapPin className="h-3 w-3 ml-2" />
                                                                    <span className="truncate">{event.location}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <span className={cn(
                                                        "flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize",
                                                        colors.bg,
                                                        colors.text
                                                    )}>
                                                        {event.type}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="px-4 py-8 text-center">
                                        <p className="text-sm text-slate-500">No events scheduled</p>
                                        {canAddEvents && (
                                            <button
                                                onClick={handleMobileAddEvent}
                                                className="mt-2 text-sm text-brand-600 font-medium"
                                            >
                                                Add an event
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* Agenda View */
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-600 border-r-transparent"></div>
                                <p className="mt-4 text-sm text-slate-500">Loading events...</p>
                            </div>
                        ) : filteredEvents.length > 0 ? (
                            <div className="space-y-4">
                                {filteredEvents.map((event) => {
                                    const colors = getEventColors(event.type);
                                    return (
                                        <div
                                            key={event.id}
                                            onClick={() => {
                                                setSelectedEvent(event);
                                                setIsDetailsModalOpen(true);
                                            }}
                                            className="group flex gap-4 rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white"
                                        >
                                            {/* Date Badge */}
                                            <div className="flex-shrink-0 text-center">
                                                <div className={cn(
                                                    "w-14 h-14 rounded-xl flex flex-col items-center justify-center",
                                                    colors.bg
                                                )}>
                                                    <span className={cn("text-lg font-bold leading-none", colors.text)}>
                                                        {format(parseISO(event.start_time), 'd')}
                                                    </span>
                                                    <span className={cn("text-xs font-medium mt-0.5", colors.text)}>
                                                        {format(parseISO(event.start_time), 'MMM')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Event Details */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                                                        {event.title}
                                                    </h3>
                                                    <span className={cn(
                                                        "flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                                                        colors.bg,
                                                        colors.text
                                                    )}>
                                                        {event.type}
                                                    </span>
                                                </div>

                                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                                                    </span>
                                                    {event.location && (
                                                        <span className="flex items-center gap-1">
                                                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            {event.location}
                                                        </span>
                                                    )}
                                                </div>

                                                {event.description && (
                                                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                                                        {event.description}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                                    <CalendarIcon className="h-8 w-8 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-slate-900">No events</h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    {filterType !== 'all'
                                        ? `No ${filterType} events scheduled.`
                                        : `No upcoming events scheduled.`
                                    }
                                </p>
                                {canAddEvents && (
                                    <button
                                        onClick={() => setIsCreateModalOpen(true)}
                                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-500 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Event
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Legend - Desktop always visible, Mobile scrollable */}
            <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 py-2 sm:py-3 px-4 sm:px-0 border-t border-slate-100 bg-slate-50/50 overflow-x-auto">
                {Object.entries(EVENT_TYPE_COLORS).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <span className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full", colors.dot)} />
                        <span className="text-[10px] sm:text-xs font-medium text-slate-600 capitalize">{type}</span>
                    </div>
                ))}
            </div>

            {/* Mobile Floating Add Button */}
            {isMobile && canAddEvents && !selectedDayForMobile && (
                <button
                    onClick={() => {
                        setSelectedDate(null);
                        setIsCreateModalOpen(true);
                    }}
                    className="fixed bottom-20 right-4 z-20 flex items-center justify-center w-14 h-14 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-500 active:scale-95 transition-all"
                >
                    <Plus className="h-6 w-6" />
                </button>
            )}

            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedDate(null);
                }}
                onEventCreated={fetchEvents}
                initialDate={selectedDate || undefined}
            />

            <EventDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                event={selectedEvent}
                onEventUpdated={fetchEvents}
                canEdit={canAddEvents}
            />
        </div>
    );
}
