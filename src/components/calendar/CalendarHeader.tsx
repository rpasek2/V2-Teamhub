import { format, startOfWeek, endOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Plus, Filter, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { EVENT_TYPE_COLORS } from './calendarUtils';

function cn(...inputs: (string | undefined | null | false)[]) {
    return twMerge(clsx(inputs));
}

type ViewType = 'month' | 'week' | 'agenda';
type EventType = 'all' | 'practice' | 'competition' | 'mentorship' | 'meeting' | 'social' | 'private_lesson' | 'camp' | 'clinic' | 'fundraiser' | 'other';

interface CalendarHeaderProps {
    currentDate: Date;
    view: ViewType;
    filterType: EventType;
    showFilter: boolean;
    canAddEvents: boolean;
    onPrevPeriod: () => void;
    onNextPeriod: () => void;
    onGoToToday: () => void;
    onViewChange: (view: ViewType) => void;
    onFilterTypeChange: (type: EventType) => void;
    onToggleFilter: () => void;
    onAddEvent: () => void;
}

export function CalendarHeader({
    currentDate,
    view,
    filterType,
    showFilter,
    canAddEvents,
    onPrevPeriod,
    onNextPeriod,
    onGoToToday,
    onViewChange,
    onFilterTypeChange,
    onToggleFilter,
    onAddEvent,
}: CalendarHeaderProps) {
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
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 px-4 sm:px-6 py-4 gap-4">
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-bold text-slate-900">
                    <time dateTime={format(currentDate, 'yyyy-MM')}>{getHeaderText()}</time>
                </h1>
                <div className="flex items-center rounded-lg bg-slate-100 p-0.5">
                    <button
                        type="button"
                        onClick={onPrevPeriod}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onGoToToday}
                        className="px-3 py-1 text-sm font-medium text-slate-600 hover:bg-slate-200 hover:text-slate-900 rounded-md transition-all"
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={onNextPeriod}
                        className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 hover:text-slate-900 transition-all"
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
                        onClick={onToggleFilter}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all",
                            filterType !== 'all'
                                ? "bg-mint-100 border-mint-300 text-mint-700"
                                : "bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200"
                        )}
                    >
                        <Filter className="h-4 w-4" />
                        <span className="hidden sm:inline">
                            {filterType === 'all' ? 'All Types' : filterType === 'private_lesson' ? 'Private Lessons' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                        </span>
                    </button>
                    {showFilter && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={onToggleFilter} />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-20">
                                {['all', 'practice', 'competition', 'mentorship', 'meeting', 'social', 'private_lesson', 'camp', 'clinic', 'fundraiser', 'other'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            onFilterTypeChange(type as EventType);
                                            onToggleFilter();
                                        }}
                                        className={cn(
                                            "w-full px-4 py-2 text-left text-sm flex items-center gap-3",
                                            filterType === type ? "bg-mint-100 text-mint-700" : "text-slate-700 hover:bg-slate-100"
                                        )}
                                    >
                                        {type !== 'all' && (
                                            <span className={cn("w-2 h-2 rounded-full", EVENT_TYPE_COLORS[type]?.dot || 'bg-slate-400')} />
                                        )}
                                        <span className="capitalize">{type === 'all' ? 'All Types' : type.replace('_', ' ')}</span>
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
                        onClick={() => onViewChange('month')}
                        className={cn(
                            "p-2 rounded-md text-sm font-medium transition-all",
                            view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        )}
                        title="Month View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('week')}
                        className={cn(
                            "p-2 rounded-md text-sm font-medium transition-all",
                            view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                        )}
                        title="Week View"
                    >
                        <CalendarIcon className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onViewChange('agenda')}
                        className={cn(
                            "p-2 rounded-md text-sm font-medium transition-all",
                            view === 'agenda' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
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
                        onClick={onAddEvent}
                        className="btn-primary"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Event</span>
                    </button>
                )}
            </div>
        </header>
    );
}
