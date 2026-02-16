import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface UpcomingEvent {
    id: string;
    title: string;
    start_time: string;
    type: string;
}

interface UpcomingScheduleCardProps {
    upcomingEvents: UpcomingEvent[];
    loadingStats: boolean;
}

function formatEventType(type: string) {
    return type.charAt(0).toUpperCase() + type.slice(1);
}

function getEventTypeStyles(type: string) {
    const styles: Record<string, string> = {
        practice: 'badge-indigo',
        competition: 'badge-mint',
        meeting: 'badge-slate',
        social: 'badge-mint',
        other: 'badge-slate'
    };
    return styles[type] || styles.other;
}

export function UpcomingScheduleCard({ upcomingEvents, loadingStats }: UpcomingScheduleCardProps) {
    return (
        <div className="card">
            <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
            </div>
            <div className="p-6">
                {loadingStats ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-mint-500" />
                    </div>
                ) : upcomingEvents.length === 0 ? (
                    <div className="text-center py-8">
                        <CalendarDays className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">No upcoming events</p>
                    </div>
                ) : (
                    <ul className="space-y-2">
                        {upcomingEvents.map((event, index) => (
                            <li
                                key={event.id}
                                className="animate-slide-up"
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <Link
                                    to={`calendar?event=${event.id}`}
                                    className={clsx(
                                        "group flex items-center justify-between rounded-lg px-4 py-3",
                                        "bg-slate-50 border border-slate-200",
                                        "hover:bg-slate-100 hover:border-slate-300 transition-all duration-150"
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium text-sm text-slate-700 truncate">
                                            {event.title}
                                        </p>
                                        <span className={clsx(
                                            "inline-block mt-1.5",
                                            getEventTypeStyles(event.type)
                                        )}>
                                            {formatEventType(event.type)}
                                        </span>
                                    </div>
                                    <div className="ml-4 text-right flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">
                                                {format(parseISO(event.start_time), 'EEE, MMM d')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {format(parseISO(event.start_time), 'h:mm a')}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-mint-600 transition-colors" />
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {upcomingEvents.length > 0 && (
                <div className="px-6 py-4 border-t border-slate-200">
                    <Link
                        to="calendar"
                        className="btn-primary w-full"
                    >
                        <CalendarDays className="w-4 h-4" />
                        View Full Calendar
                    </Link>
                </div>
            )}
        </div>
    );
}
