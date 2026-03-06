import { format, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { Plus, MapPin, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Event } from '../../types';
import type { Holiday, Birthday } from './calendarUtils';
import { getEventColors } from './calendarUtils';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

interface CalendarGridProps {
    view: 'month' | 'week';
    calendarDays: Date[];
    currentDate: Date;
    filteredEvents: Event[];
    isMobile: boolean;
    canAddEvents: boolean;
    selectedDayForMobile: Date | null;
    showBirthdays: boolean;
    birthdays: Birthday[];
    getHolidayForDay: (day: Date) => Holiday | undefined;
    onDayClick: (day: Date) => void;
    onEventClick: (event: Event) => void;
    onMobileAddEvent: () => void;
    onCloseMobilePanel: () => void;
}

export function CalendarGrid({
    view,
    calendarDays,
    currentDate,
    filteredEvents,
    isMobile,
    canAddEvents,
    selectedDayForMobile,
    showBirthdays,
    birthdays,
    getHolidayForDay,
    onDayClick,
    onEventClick,
    onMobileAddEvent,
    onCloseMobilePanel,
}: CalendarGridProps) {
    const getEventsForDay = (day: Date) => {
        return filteredEvents.filter(event => {
            const eventStart = parseISO(event.start_time);
            const eventEnd = parseISO(event.end_time);
            // Check if the day falls within the event's date range (inclusive)
            // For all-day events spanning multiple days, show on each day
            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            return eventStart <= dayEnd && eventEnd >= dayStart;
        });
    };

    const getBirthdaysForDay = (day: Date): Birthday[] => {
        if (!showBirthdays) return [];
        const monthDay = format(day, 'MM-dd');
        return birthdays.filter(b => b.date === monthDay);
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Headers */}
            <div className="grid grid-cols-7 border-b border-line bg-surface">
                {(isMobile ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']).map((day, idx) => (
                    <div key={idx} className="py-2 sm:py-3 text-center text-xs font-semibold text-muted uppercase tracking-wide">
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
                    const dayBirthdays = getBirthdaysForDay(day);
                    const isCurrentMonth = view === 'week' || isSameMonth(day, currentDate);
                    const isCurrentDay = isToday(day);
                    const isSelected = selectedDayForMobile && isSameDay(day, selectedDayForMobile);
                    const holiday = getHolidayForDay(day);
                    const hasBirthday = dayBirthdays.length > 0;

                    return (
                        <div
                            key={day.toString()}
                            onClick={() => onDayClick(day)}
                            className={cn(
                                "min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border-b border-r border-line transition-colors relative overflow-hidden",
                                isCurrentMonth ? 'bg-surface' : 'bg-surface-alt',
                                (canAddEvents || isMobile) && 'cursor-pointer hover:bg-surface-hover',
                                isSelected && 'bg-accent-100 ring-2 ring-inset ring-accent-500',
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
                                                ? 'bg-accent-500 text-white'
                                                : holiday
                                                    ? holiday.textColor
                                                    : isCurrentMonth
                                                        ? 'text-heading'
                                                        : 'text-faint'
                                        )}
                                    >
                                        {format(day, 'd')}
                                    </time>
                                    {/* Holiday emoji indicator (mobile) */}
                                    {isMobile && holiday && (
                                        <span className="text-sm">{holiday.emoji}</span>
                                    )}
                                    {/* Birthday cake indicator (mobile) */}
                                    {isMobile && hasBirthday && (
                                        <span className="text-sm" title={dayBirthdays.map(b => b.name).join(', ')}>{'🎂'}</span>
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
                                            <span className="text-[10px] text-faint ml-0.5">+{dayEvents.length - 3}</span>
                                        )}
                                    </div>
                                )}
                                {/* Desktop: Show holiday name in top right */}
                                {!isMobile && holiday && (
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] sm:text-xs font-semibold truncate max-w-[60%]",
                                        holiday.textColor
                                    )}>
                                        <span>{holiday.emoji}</span>
                                        <span className="truncate">{holiday.name}</span>
                                    </div>
                                )}
                                {/* Desktop: Show overflow count */}
                                {!isMobile && dayEvents.length > 3 && (
                                    <span className={cn(
                                        "text-xs font-medium",
                                        holiday ? holiday.textColor : "text-muted"
                                    )}>
                                        +{dayEvents.length - 3}
                                    </span>
                                )}
                            </div>

                            {/* Desktop: Show birthday banners */}
                            {!isMobile && hasBirthday && (
                                <div className="space-y-0.5 mb-1">
                                    {dayBirthdays.slice(0, 2).map((birthday) => (
                                        <div
                                            key={birthday.id}
                                            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-pink-500/10 text-pink-600 truncate"
                                            title={`${birthday.name}'s Birthday`}
                                        >
                                            <span>{'🎂'}</span>
                                            <span className="truncate">{birthday.name}</span>
                                        </div>
                                    ))}
                                    {dayBirthdays.length > 2 && (
                                        <div className="text-[10px] text-pink-500 px-1.5">
                                            +{dayBirthdays.length - 2} more
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Desktop: Show event cards */}
                            {!isMobile && (
                                <div className="space-y-1 overflow-hidden relative z-10 min-h-[60px]">
                                    {dayEvents.slice(0, 3).map((event) => {
                                        const colors = getEventColors(event.type);
                                        return (
                                            <button
                                                key={event.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEventClick(event);
                                                }}
                                                className={cn(
                                                    "w-full text-left px-2 py-1 rounded-md text-xs font-medium truncate transition-all hover:ring-2 hover:ring-accent-400/50",
                                                    colors.bg,
                                                    colors.text
                                                )}
                                            >
                                                <span className="hidden sm:inline">{event.is_all_day ? 'All Day' : format(parseISO(event.start_time), 'h:mma')} </span>
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
                <div className="border-t border-line bg-surface">
                    <div className={cn(
                        "px-4 py-3 flex items-center justify-between border-b border-line",
                        getHolidayForDay(selectedDayForMobile)?.bgColor
                    )}>
                        <div>
                            <h3 className="font-semibold text-heading flex items-center gap-2">
                                {format(selectedDayForMobile, 'EEEE, MMMM d')}
                                {getHolidayForDay(selectedDayForMobile) && (
                                    <span className="text-lg">{getHolidayForDay(selectedDayForMobile)?.emoji}</span>
                                )}
                                {getBirthdaysForDay(selectedDayForMobile).length > 0 && (
                                    <span className="text-lg">{'🎂'}</span>
                                )}
                            </h3>
                            {getHolidayForDay(selectedDayForMobile) ? (
                                <p className={cn("text-xs font-medium", getHolidayForDay(selectedDayForMobile)?.textColor)}>
                                    {getHolidayForDay(selectedDayForMobile)?.name}
                                </p>
                            ) : (
                                <p className="text-xs text-muted">
                                    {getEventsForDay(selectedDayForMobile).length} event{getEventsForDay(selectedDayForMobile).length !== 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {canAddEvents && (
                                <button
                                    onClick={onMobileAddEvent}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-500 text-white text-xs font-medium"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add
                                </button>
                            )}
                            <button
                                onClick={onCloseMobilePanel}
                                className="p-1.5 text-faint hover:text-heading"
                            >
                                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {/* Birthdays for selected day */}
                        {getBirthdaysForDay(selectedDayForMobile).length > 0 && (
                            <div className="px-4 py-2 bg-pink-500/10 border-b border-pink-500/20">
                                {getBirthdaysForDay(selectedDayForMobile).map((birthday) => (
                                    <div key={birthday.id} className="flex items-center gap-2 py-1">
                                        <span className="text-lg">{'🎂'}</span>
                                        <span className="text-sm font-medium text-pink-600">{birthday.name}'s Birthday</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {getEventsForDay(selectedDayForMobile).length > 0 ? (
                            <div className="divide-y divide-line">
                                {getEventsForDay(selectedDayForMobile).map((event) => {
                                    const colors = getEventColors(event.type);
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            className="w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-surface-hover active:bg-surface-hover transition-colors"
                                        >
                                            <div className={cn("w-1 h-full min-h-[40px] rounded-full flex-shrink-0", colors.dot)} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-heading text-sm truncate">{event.title}</p>
                                                <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                                                    <Clock className="h-3 w-3" />
                                                    <span>{event.is_all_day ? 'All Day' : format(parseISO(event.start_time), 'h:mm a')}</span>
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
                                <p className="text-sm text-muted">No events scheduled</p>
                                {canAddEvents && (
                                    <button
                                        onClick={onMobileAddEvent}
                                        className="mt-2 text-sm text-accent-600 font-medium"
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
    );
}
