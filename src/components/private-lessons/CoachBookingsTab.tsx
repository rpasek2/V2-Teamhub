import { useState, useEffect } from 'react';
import { Loader2, User, ChevronRight, Search, Users } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, isToday } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { LessonBooking, LessonSlot, GymnastProfile, Profile } from '../../types';
import { LessonDetailsModal } from './LessonDetailsModal';

// Event label mapping
const EVENT_LABELS: Record<string, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    pommel: 'Pommel Horse',
    rings: 'Rings',
    pbars: 'Parallel Bars',
    highbar: 'High Bar',
    all_around: 'All-Around',
    strength: 'Strength',
    flexibility: 'Flexibility',
};

type BookingWithRelations = LessonBooking & {
    lesson_slot: LessonSlot;
    gymnast_profile: GymnastProfile;
    booked_by: Profile;
};

interface CoachBookingsTabProps {
    coachId?: string; // For staff viewing specific coach's bookings
}

export function CoachBookingsTab({ coachId }: CoachBookingsTabProps) {
    const { user } = useAuth();
    const { hub } = useHub();

    const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'today' | 'upcoming' | 'past' | 'all'>('upcoming');
    const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);

    const targetCoachId = coachId || user?.id;

    useEffect(() => {
        if (hub && targetCoachId) {
            fetchBookings();
        }
    }, [hub, targetCoachId, filter]);

    const fetchBookings = async () => {
        if (!hub || !targetCoachId) return;

        setLoading(true);
        try {
            let query = supabase
                .from('lesson_bookings')
                .select(`
                    *,
                    lesson_slot:lesson_slots!lesson_slot_id(*),
                    gymnast_profile:gymnast_profiles!gymnast_profile_id(*),
                    booked_by:profiles!booked_by_user_id(id, full_name, email, avatar_url)
                `)
                .eq('hub_id', hub.id)
                .order('created_at', { ascending: false });

            // Filter by coach (via lesson_slot)
            // We need to join through lesson_slots to filter by coach
            const { data: slots } = await supabase
                .from('lesson_slots')
                .select('id')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', targetCoachId);

            const slotIds = slots?.map(s => s.id) || [];
            if (slotIds.length === 0) {
                setBookings([]);
                setLoading(false);
                return;
            }

            query = query.in('lesson_slot_id', slotIds);

            // Filter by status
            if (filter !== 'all' && filter !== 'past') {
                query = query.eq('status', 'confirmed');
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter by date
            let filtered = data || [];
            const today = startOfDay(new Date());

            if (filter === 'today') {
                filtered = filtered.filter(b => isToday(parseISO(b.lesson_slot.slot_date)));
            } else if (filter === 'upcoming') {
                filtered = filtered.filter(b => {
                    const slotDate = parseISO(b.lesson_slot.slot_date);
                    return !isBefore(slotDate, today);
                });
                // Sort by date for upcoming
                filtered.sort((a, b) => {
                    const dateA = a.lesson_slot.slot_date + ' ' + a.lesson_slot.start_time;
                    const dateB = b.lesson_slot.slot_date + ' ' + b.lesson_slot.start_time;
                    return dateA.localeCompare(dateB);
                });
            } else if (filter === 'past') {
                filtered = filtered.filter(b => {
                    const slotDate = parseISO(b.lesson_slot.slot_date);
                    return isBefore(slotDate, today) || b.status === 'cancelled';
                });
            }

            setBookings(filtered as BookingWithRelations[]);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // Group bookings by date for upcoming view
    const groupedBookings = bookings.reduce((acc, booking) => {
        const date = booking.lesson_slot.slot_date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(booking);
        return acc;
    }, {} as Record<string, BookingWithRelations[]>);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="flex gap-2">
                {(['today', 'upcoming', 'past', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === f
                                ? 'bg-brand-100 text-brand-700'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {f === 'today' ? 'Today' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Stats Summary */}
            {filter === 'today' && (
                <div className="card p-4 bg-violet-50 border-violet-200">
                    <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-violet-600" />
                        <div>
                            <p className="font-medium text-violet-900">
                                {bookings.length} lesson{bookings.length !== 1 ? 's' : ''} today
                            </p>
                            {bookings.length > 0 && (
                                <p className="text-sm text-violet-600">
                                    Next: {formatTime(bookings[0]?.lesson_slot.start_time)} - {bookings[0]?.gymnast_profile.first_name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bookings List */}
            {bookings.length === 0 ? (
                <div className="card p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">No bookings found</h3>
                    <p className="text-sm text-slate-500">
                        {filter === 'today'
                            ? 'No lessons scheduled for today.'
                            : filter === 'upcoming'
                            ? 'No upcoming lessons scheduled.'
                            : filter === 'past'
                            ? 'No past lessons to display.'
                            : 'No lessons have been booked yet.'}
                    </p>
                </div>
            ) : filter === 'upcoming' ? (
                // Grouped by date view
                <div className="space-y-6">
                    {Object.entries(groupedBookings).map(([date, dateBookings]) => (
                        <div key={date}>
                            <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">
                                {isToday(parseISO(date))
                                    ? 'Today'
                                    : format(parseISO(date), 'EEEE, MMMM d')}
                            </h3>
                            <div className="space-y-2">
                                {dateBookings.map(booking => (
                                    <BookingRow
                                        key={booking.id}
                                        booking={booking}
                                        onClick={() => setSelectedBooking(booking)}
                                        showDate={false}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                // Flat list view
                <div className="space-y-2">
                    {bookings.map(booking => (
                        <BookingRow
                            key={booking.id}
                            booking={booking}
                            onClick={() => setSelectedBooking(booking)}
                            showDate={true}
                        />
                    ))}
                </div>
            )}

            {/* Lesson Details Modal */}
            {selectedBooking && (
                <LessonDetailsModal
                    isOpen={!!selectedBooking}
                    onClose={() => setSelectedBooking(null)}
                    onUpdated={() => {
                        fetchBookings();
                        setSelectedBooking(null);
                    }}
                    booking={selectedBooking}
                    canCancel={!isBefore(parseISO(selectedBooking.lesson_slot.slot_date), startOfDay(new Date()))}
                />
            )}
        </div>
    );
}

// Booking row component
interface BookingRowProps {
    booking: BookingWithRelations;
    onClick: () => void;
    showDate: boolean;
}

function BookingRow({ booking, onClick, showDate }: BookingRowProps) {
    const slot = booking.lesson_slot;
    const gymnast = booking.gymnast_profile;
    const parent = booking.booked_by;
    const isPast = isBefore(parseISO(slot.slot_date), startOfDay(new Date()));
    const isCancelled = booking.status === 'cancelled';

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    return (
        <button
            onClick={onClick}
            className={`card p-4 w-full text-left hover:shadow-md transition-shadow ${
                isCancelled ? 'opacity-60' : ''
            }`}
        >
            <div className="flex items-center gap-4">
                {/* Time Block */}
                <div className="text-center min-w-[60px]">
                    <p className="text-lg font-bold text-slate-900">
                        {formatTime(slot.start_time).replace(' ', '')}
                    </p>
                    {showDate && (
                        <p className="text-xs text-slate-500">
                            {format(parseISO(slot.slot_date), 'MMM d')}
                        </p>
                    )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 border-l border-slate-200 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-slate-900">
                            {gymnast.first_name} {gymnast.last_name}
                        </p>
                        <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">
                            {gymnast.level}
                        </span>
                        {isCancelled && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                Cancelled
                            </span>
                        )}
                        {isPast && !isCancelled && (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded">
                                Completed
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">
                            {EVENT_LABELS[booking.event] || booking.event}
                        </span>
                        <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {parent.full_name}
                        </span>
                    </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
        </button>
    );
}
