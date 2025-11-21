import { useState, useEffect } from 'react';
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
    parseISO,
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { CreateEventModal } from '../components/calendar/CreateEventModal';
import { EventDetailsModal } from '../components/calendar/EventDetailsModal';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface Event {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    type: 'practice' | 'competition' | 'meeting' | 'social' | 'other';
    location?: string;
}

type ViewType = 'month' | 'agenda';

export function Calendar() {
    const { hub } = useHub();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [view, setView] = useState<ViewType>('month');

    useEffect(() => {
        if (hub) {
            fetchEvents();
        }
    }, [hub, currentDate, view]);

    const fetchEvents = async () => {
        if (!hub) return;

        const start = startOfMonth(currentDate).toISOString();
        const end = endOfMonth(currentDate).toISOString();

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

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const today = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(parseISO(event.start_time), day));
    };

    const getEventTypeColor = (type: string) => {
        switch (type) {
            case 'practice': return 'bg-blue-100 text-blue-700';
            case 'competition': return 'bg-purple-100 text-purple-700';
            case 'meeting': return 'bg-amber-100 text-amber-700';
            case 'social': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4 lg:flex-none">
                <h1 className="text-base font-semibold leading-6 text-slate-900">
                    <time dateTime={format(currentDate, 'yyyy-MM')}>{format(currentDate, 'MMMM yyyy')}</time>
                </h1>
                <div className="flex items-center">
                    <div className="relative flex items-center rounded-md bg-white shadow-sm md:items-stretch">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l border-slate-300 pr-1 text-slate-400 hover:text-slate-500 focus:relative md:w-9 md:pr-0 md:hover:bg-slate-50"
                        >
                            <span className="sr-only">Previous month</span>
                            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                        </button>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r border-slate-300 pl-1 text-slate-400 hover:text-slate-500 focus:relative md:w-9 md:pl-0 md:hover:bg-slate-50"
                        >
                            <span className="sr-only">Next month</span>
                            <ChevronRight className="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="hidden md:ml-4 md:flex md:items-center">
                        <button
                            type="button"
                            onClick={today}
                            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
                        >
                            Today
                        </button>
                    </div>

                    <div className="ml-6 h-6 w-px bg-slate-300" />

                    {/* View Toggle */}
                    <div className="ml-6 flex rounded-md bg-slate-100 p-0.5">
                        <button
                            type="button"
                            onClick={() => setView('month')}
                            className={cn(
                                view === 'month' ? 'bg-white shadow-sm' : 'hover:bg-slate-200',
                                'rounded-md p-1.5 text-sm font-medium text-slate-700 focus:outline-none'
                            )}
                        >
                            <CalendarIcon className="h-5 w-5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('agenda')}
                            className={cn(
                                view === 'agenda' ? 'bg-white shadow-sm' : 'hover:bg-slate-200',
                                'rounded-md p-1.5 text-sm font-medium text-slate-700 focus:outline-none'
                            )}
                        >
                            <List className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="ml-6 h-6 w-px bg-slate-300" />
                    <button
                        type="button"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="ml-6 rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                        Add Event
                    </button>
                </div>
            </header>

            {view === 'month' ? (
                <div className="shadow ring-1 ring-black ring-opacity-5 lg:flex lg:flex-auto lg:flex-col">
                    <div className="grid grid-cols-7 gap-px border-b border-slate-300 bg-slate-200 text-center text-xs font-semibold leading-6 text-slate-700 lg:flex-none">
                        <div className="bg-white py-2">S<span className="sr-only sm:not-sr-only">un</span></div>
                        <div className="bg-white py-2">M<span className="sr-only sm:not-sr-only">on</span></div>
                        <div className="bg-white py-2">T<span className="sr-only sm:not-sr-only">ue</span></div>
                        <div className="bg-white py-2">W<span className="sr-only sm:not-sr-only">ed</span></div>
                        <div className="bg-white py-2">T<span className="sr-only sm:not-sr-only">hu</span></div>
                        <div className="bg-white py-2">F<span className="sr-only sm:not-sr-only">ri</span></div>
                        <div className="bg-white py-2">S<span className="sr-only sm:not-sr-only">at</span></div>
                    </div>
                    <div className="flex bg-slate-200 text-xs leading-6 text-slate-700 lg:flex-auto">
                        <div className="hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-6 lg:gap-px">
                            {calendarDays.map((day) => {
                                const dayEvents = getEventsForDay(day);
                                return (
                                    <div
                                        key={day.toString()}
                                        className={cn(
                                            isSameMonth(day, currentDate) ? 'bg-white' : 'bg-slate-50 text-slate-500',
                                            'relative px-3 py-2 min-h-[100px]'
                                        )}
                                    >
                                        <time
                                            dateTime={format(day, 'yyyy-MM-dd')}
                                            className={cn(
                                                isToday(day)
                                                    ? 'flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 font-semibold text-white'
                                                    : undefined
                                            )}
                                        >
                                            {format(day, 'd')}
                                        </time>
                                        {dayEvents.length > 0 && (
                                            <ol className="mt-2 space-y-1">
                                                {dayEvents.map((event) => (
                                                    <li key={event.id}>
                                                        <button
                                                            onClick={() => {
                                                                setSelectedEvent(event);
                                                                setIsDetailsModalOpen(true);
                                                            }}
                                                            className="group flex w-full text-left"
                                                        >
                                                            <p className={cn(
                                                                getEventTypeColor(event.type),
                                                                'flex-auto truncate rounded-md px-2 py-0.5 text-xs font-medium'
                                                            )}>
                                                                {event.title}
                                                            </p>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex-auto overflow-y-auto bg-white">
                    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
                        {events.length > 0 ? (
                            <div className="space-y-8">
                                {events.map((event) => (
                                    <div
                                        key={event.id}
                                        onClick={() => {
                                            setSelectedEvent(event);
                                            setIsDetailsModalOpen(true);
                                        }}
                                        className="flex space-x-4 rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                    >
                                        <div className="flex-shrink-0">
                                            <div className={cn(
                                                getEventTypeColor(event.type),
                                                'flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold'
                                            )}>
                                                {format(parseISO(event.start_time), 'd')}
                                            </div>
                                            <div className="mt-1 text-center text-xs font-medium text-slate-500">
                                                {format(parseISO(event.start_time), 'MMM')}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-slate-900">{event.title}</h3>
                                            <div className="mt-1 flex items-center text-sm text-slate-500">
                                                <span className="capitalize">{event.type}</span>
                                                <span className="mx-2">•</span>
                                                <span>{format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}</span>
                                            </div>
                                            {event.location && (
                                                <div className="mt-1 text-sm text-slate-500">
                                                    📍 {event.location}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <CalendarIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <h3 className="mt-2 text-sm font-semibold text-slate-900">No events</h3>
                                <p className="mt-1 text-sm text-slate-500">No events scheduled for this month.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <CreateEventModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onEventCreated={fetchEvents}
            />

            <EventDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => setIsDetailsModalOpen(false)}
                event={selectedEvent}
            />
        </div>
    );
}
