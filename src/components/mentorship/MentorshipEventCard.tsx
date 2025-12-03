import { format, parseISO } from 'date-fns';
import { MapPin, Clock, Trash2 } from 'lucide-react';

// Use calendar event structure
interface CalendarEvent {
    id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
}

interface MentorshipEventCardProps {
    event: CalendarEvent;
    isPast?: boolean;
    onDelete?: (id: string) => void;
}

export function MentorshipEventCard({ event, isPast, onDelete }: MentorshipEventCardProps) {
    const eventDate = parseISO(event.start_time);
    const formattedDate = format(eventDate, 'MMM d');
    const formattedTime = format(eventDate, 'h:mm a');

    return (
        <div className={`p-3 rounded-lg border ${isPast ? 'bg-slate-50 border-slate-200' : 'bg-pink-50 border-pink-200'}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    {/* Date Badge */}
                    <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded mb-1 ${
                        isPast ? 'bg-slate-200 text-slate-600' : 'bg-pink-200 text-pink-700'
                    }`}>
                        {formattedDate}
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-slate-900 truncate">{event.title}</h3>

                    {/* Details */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        {event.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formattedTime}
                        </span>
                    </div>

                    {/* Description preview */}
                    {event.description && (
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">{event.description}</p>
                    )}
                </div>

                {/* Delete Button */}
                {onDelete && !isPast && (
                    <button
                        onClick={() => {
                            if (confirm('Delete this event? This will also remove it from the calendar.')) {
                                onDelete(event.id);
                            }
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete event"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
