import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    parseISO
} from 'date-fns';
import { Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useNotifications } from '../context/NotificationContext';
import { CreateEventModal } from '../components/calendar/CreateEventModal';
import { EventDetailsModal } from '../components/calendar/EventDetailsModal';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { CalendarGrid } from '../components/calendar/CalendarGrid';
import { AgendaView } from '../components/calendar/AgendaView';
import { ALL_HOLIDAYS_MAP, EVENT_TYPE_COLORS } from '../components/calendar/calendarUtils';
import type { Birthday } from '../components/calendar/calendarUtils';
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
type EventType = 'all' | 'practice' | 'competition' | 'mentorship' | 'meeting' | 'social' | 'private_lesson' | 'camp' | 'clinic' | 'fundraiser' | 'other';

export function Calendar() {
    const { hub, currentRole } = useHub();
    const { markAsViewed } = useNotifications();
    const [searchParams, setSearchParams] = useSearchParams();
    const isMobile = useIsMobile();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [birthdays, setBirthdays] = useState<Birthday[]>([]);
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
    // Agenda view mode: 'upcoming' shows current month events, 'save_the_dates' shows season-wide important events
    const [agendaMode, setAgendaMode] = useState<'upcoming' | 'save_the_dates'>('upcoming');
    const [saveTheDateEvents, setSaveTheDateEvents] = useState<Event[]>([]);
    const [currentSeason, setCurrentSeason] = useState<{ id: string; name: string; start_date: string; end_date: string } | null>(null);
    const [loadingSaveTheDates, setLoadingSaveTheDates] = useState(false);

    // Permission check - admins, directors, owners, and coaches can add events
    const canAddEvents = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    // Check if birthdays should be shown
    const showBirthdays = hub?.settings?.showBirthdays === true;

    // Mark calendar as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('calendar');
        }
    }, [hub, markAsViewed]);

    // Helper to get holiday for a day (uses pre-computed module-level holidays)
    const getHolidayForDay = (day: Date) => {
        const key = format(day, 'yyyy-MM-dd');
        return ALL_HOLIDAYS_MAP.get(key);
    };

    // Fetch birthdays from gymnast profiles (respecting parent privacy settings)
    const fetchBirthdays = async () => {
        if (!hub || !showBirthdays) {
            setBirthdays([]);
            return;
        }

        try {
            // Fetch gymnast profiles with birthdays (including guardian email for privacy lookup)
            const [gymnastResult, membersResult, privacyResult] = await Promise.all([
                supabase
                    .from('gymnast_profiles')
                    .select('id, first_name, last_name, date_of_birth, guardian_1')
                    .eq('hub_id', hub.id)
                    .not('date_of_birth', 'is', null),
                supabase
                    .from('hub_members')
                    .select('user_id, profile:profiles(email)')
                    .eq('hub_id', hub.id)
                    .eq('role', 'parent'),
                supabase
                    .from('parent_privacy_settings')
                    .select('user_id, show_gymnast_birthday')
                    .eq('hub_id', hub.id)
            ]);

            if (gymnastResult.error) throw gymnastResult.error;

            const gymnasts = gymnastResult.data || [];
            const parentMembers = membersResult.data || [];
            const privacySettings = privacyResult.data || [];

            // Build email -> user_id map for parents
            const emailToUserId = new Map<string, string>();
            parentMembers.forEach((m) => {
                const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                if (profile?.email) {
                    emailToUserId.set(profile.email.toLowerCase(), m.user_id);
                }
            });

            // Build user_id -> privacy settings map
            const userPrivacyMap = new Map<string, boolean>();
            privacySettings.forEach((p) => {
                userPrivacyMap.set(p.user_id, p.show_gymnast_birthday ?? false);
            });

            // Filter gymnasts based on parent privacy settings
            // Default: show birthdays unless parent explicitly opts out
            const birthdayData: Birthday[] = gymnasts
                .filter(g => {
                    // Get the guardian's email
                    const guardianEmail = g.guardian_1?.email?.toLowerCase();
                    if (!guardianEmail) return true; // No guardian email linked, show by default

                    // Find the parent's user_id
                    const parentUserId = emailToUserId.get(guardianEmail);
                    if (!parentUserId) return true; // Parent not in hub as member, show by default

                    // Check privacy settings (default to true - show unless explicitly hidden)
                    const showBirthday = userPrivacyMap.get(parentUserId) ?? true;
                    return showBirthday;
                })
                .map(g => ({
                    id: g.id,
                    name: `${g.first_name} ${g.last_name}`.trim(),
                    date: format(parseISO(g.date_of_birth), 'MM-dd'),
                    fullDate: g.date_of_birth
                }));

            setBirthdays(birthdayData);
        } catch (err) {
            console.error('Error fetching birthdays:', err);
            setBirthdays([]);
        }
    };

    // Fetch current season for the hub
    const fetchCurrentSeason = async () => {
        if (!hub) return;
        try {
            const { data, error } = await supabase
                .from('seasons')
                .select('id, name, start_date, end_date')
                .eq('hub_id', hub.id)
                .eq('is_current', true)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
            setCurrentSeason(data || null);
        } catch (err) {
            console.error('Error fetching current season:', err);
        }
    };

    // Fetch "Save the Date" events for the entire season
    // Includes: events marked as is_save_the_date OR type is competition/mentorship/camp
    const fetchSaveTheDateEvents = async () => {
        if (!hub || !currentSeason) return;
        setLoadingSaveTheDates(true);
        try {
            // Query events within the season date range that are either:
            // - explicitly marked as save_the_date
            // - OR are of type competition, mentorship, or camp
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('hub_id', hub.id)
                .gte('start_time', `${currentSeason.start_date}T00:00:00`)
                .lte('start_time', `${currentSeason.end_date}T23:59:59`)
                .or('is_save_the_date.eq.true,type.eq.competition,type.eq.mentorship,type.eq.camp')
                .order('start_time', { ascending: true });

            if (error) throw error;
            setSaveTheDateEvents(data || []);
        } catch (err) {
            console.error('Error fetching save the date events:', err);
        } finally {
            setLoadingSaveTheDates(false);
        }
    };

    useEffect(() => {
        if (hub) {
            fetchCurrentSeason();
        }
    }, [hub]);

    // Fetch save-the-date events when season is loaded and agenda mode changes
    useEffect(() => {
        if (hub && currentSeason && agendaMode === 'save_the_dates') {
            fetchSaveTheDateEvents();
        }
    }, [hub, currentSeason, agendaMode]);

    useEffect(() => {
        if (hub) {
            fetchEvents();
            fetchBirthdays();
        }
    }, [hub, currentDate, view, showBirthdays]);

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
            // Fetch events that overlap with the current view:
            // - Events that start within the range, OR
            // - Events that started before but end within or after the range start
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('hub_id', hub.id)
                .lte('start_time', end)  // Event starts before or during the view
                .gte('end_time', start)   // Event ends during or after the view start
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

    const handleEventClick = (event: Event) => {
        setSelectedEvent(event);
        setIsDetailsModalOpen(true);
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

    return (
        <div className="flex h-full flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header */}
            <CalendarHeader
                currentDate={currentDate}
                view={view}
                filterType={filterType}
                showFilter={showFilter}
                canAddEvents={canAddEvents}
                isSaveTheDatesActive={view === 'agenda' && agendaMode === 'save_the_dates'}
                onPrevPeriod={prevPeriod}
                onNextPeriod={nextPeriod}
                onGoToToday={goToToday}
                onViewChange={setView}
                onFilterTypeChange={setFilterType}
                onToggleFilter={() => setShowFilter(!showFilter)}
                onAddEvent={() => {
                    setSelectedDate(null);
                    setIsCreateModalOpen(true);
                }}
                onSaveTheDates={() => {
                    setView('agenda');
                    setAgendaMode('save_the_dates');
                }}
            />

            {/* Calendar Grid or Agenda View */}
            {view === 'month' || view === 'week' ? (
                <CalendarGrid
                    view={view}
                    calendarDays={calendarDays}
                    currentDate={currentDate}
                    filteredEvents={filteredEvents}
                    isMobile={isMobile}
                    canAddEvents={canAddEvents}
                    selectedDayForMobile={selectedDayForMobile}
                    showBirthdays={showBirthdays}
                    birthdays={birthdays}
                    getHolidayForDay={getHolidayForDay}
                    onDayClick={handleDayClick}
                    onEventClick={handleEventClick}
                    onMobileAddEvent={handleMobileAddEvent}
                    onCloseMobilePanel={() => setSelectedDayForMobile(null)}
                />
            ) : (
                <AgendaView
                    agendaMode={agendaMode}
                    filteredEvents={filteredEvents}
                    saveTheDateEvents={saveTheDateEvents}
                    loading={loading}
                    loadingSaveTheDates={loadingSaveTheDates}
                    filterType={filterType}
                    canAddEvents={canAddEvents}
                    currentSeason={currentSeason}
                    onAgendaModeChange={setAgendaMode}
                    onEventClick={handleEventClick}
                    onAddEvent={() => setIsCreateModalOpen(true)}
                />
            )}

            {/* Legend - Desktop always visible, Mobile scrollable */}
            <div className="flex items-center justify-start sm:justify-center gap-4 sm:gap-6 py-2 sm:py-3 px-4 sm:px-0 border-t border-slate-200 bg-slate-50 overflow-x-auto">
                {Object.entries(EVENT_TYPE_COLORS).map(([type, colors]) => (
                    <div key={type} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                        <span className={cn("w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full", colors.dot)} />
                        <span className="text-[10px] sm:text-xs font-medium text-slate-500 capitalize">{type}</span>
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
                    className="fixed bottom-20 right-4 z-20 flex items-center justify-center w-14 h-14 rounded-full bg-mint-500 text-white shadow-lg hover:bg-mint-400 active:scale-95 transition-all"
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
