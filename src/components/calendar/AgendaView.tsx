import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Event } from '../../types';
import { getEventColors } from './calendarUtils';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface AgendaViewProps {
    agendaMode: 'upcoming' | 'save_the_dates';
    filteredEvents: Event[];
    saveTheDateEvents: Event[];
    loading: boolean;
    loadingSaveTheDates: boolean;
    filterType: string;
    canAddEvents: boolean;
    currentSeason: { id: string; name: string; start_date: string; end_date: string } | null;
    onAgendaModeChange: (mode: 'upcoming' | 'save_the_dates') => void;
    onEventClick: (event: Event) => void;
    onAddEvent: () => void;
}

export function AgendaView({
    agendaMode,
    filteredEvents,
    saveTheDateEvents,
    loading,
    loadingSaveTheDates,
    filterType,
    canAddEvents,
    currentSeason,
    onAgendaModeChange,
    onEventClick,
    onAddEvent,
}: AgendaViewProps) {
    const displayEvents = agendaMode === 'upcoming' ? filteredEvents : saveTheDateEvents;
    const isLoading = agendaMode === 'upcoming' ? loading : loadingSaveTheDates;

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
                {/* Agenda Mode Toggle */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex rounded-lg bg-white border border-slate-200 p-1 shadow-sm">
                        <button
                            type="button"
                            onClick={() => onAgendaModeChange('upcoming')}
                            className={cn(
                                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                agendaMode === 'upcoming'
                                    ? 'bg-mint-500 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            )}
                        >
                            Upcoming
                        </button>
                        <button
                            type="button"
                            onClick={() => onAgendaModeChange('save_the_dates')}
                            className={cn(
                                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                                agendaMode === 'save_the_dates'
                                    ? 'bg-mint-500 text-white shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            )}
                        >
                            Save the Dates
                        </button>
                    </div>
                    {agendaMode === 'save_the_dates' && currentSeason && (
                        <span className="text-sm text-slate-500">
                            {currentSeason.name}
                        </span>
                    )}
                </div>

                {/* Event List */}
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-mint-500 border-r-transparent"></div>
                        <p className="mt-4 text-sm text-slate-500">Loading events...</p>
                    </div>
                ) : displayEvents.length > 0 ? (
                    <div className="space-y-4">
                        {displayEvents.map((event) => {
                            const colors = getEventColors(event.type);
                            return (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
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
                                            <h3 className="text-base font-semibold text-slate-900 group-hover:text-mint-600 transition-colors">
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
                                                {event.is_all_day ? 'All Day' : `${format(parseISO(event.start_time), 'h:mm a')} - ${format(parseISO(event.end_time), 'h:mm a')}`}
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
                                            <p className="mt-2 text-sm text-slate-500 line-clamp-2">
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
                        <h3 className="text-lg font-semibold text-slate-900">
                            {agendaMode === 'save_the_dates' ? 'No save the dates' : 'No events'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {agendaMode === 'save_the_dates'
                                ? (!currentSeason
                                    ? 'No current season is set. Please set a current season in Settings.'
                                    : 'No competitions, mentorship events, or flagged events for this season.')
                                : (filterType !== 'all'
                                    ? `No ${filterType} events scheduled.`
                                    : `No upcoming events scheduled.`)
                            }
                        </p>
                        {canAddEvents && agendaMode === 'upcoming' && (
                            <button
                                onClick={onAddEvent}
                                className="btn-primary mt-4"
                            >
                                <Plus className="h-4 w-4" />
                                Add Event
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
