import { useState, useEffect } from 'react';
import { Loader2, Calendar, Clock, User, ChevronRight, Search } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
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
    lesson_slot: LessonSlot & { coach_profile: Profile };
    gymnast_profile: GymnastProfile;
};

export function MyBookingsTab() {
    const { user } = useAuth();
    const { hub } = useHub();

    const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
    const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);

    useEffect(() => {
        if (hub && user) {
            fetchBookings();
        }
    }, [hub, user, filter]);

    const fetchBookings = async () => {
        if (!hub || !user) return;

        setLoading(true);
        try {
            let query = supabase
                .from('lesson_bookings')
                .select(`
                    *,
                    lesson_slot:lesson_slots!lesson_slot_id(
                        *,
                        coach_profile:profiles!coach_user_id(id, full_name, avatar_url)
                    ),
                    gymnast_profile:gymnast_profiles!gymnast_profile_id(*)
                `)
                .eq('hub_id', hub.id)
                .eq('booked_by_user_id', user.id)
                .order('created_at', { ascending: false });

            // Filter by status
            if (filter !== 'all') {
                query = query.eq('status', 'confirmed');
            }

            const { data, error } = await query;
            if (error) throw error;

            // Filter by date for upcoming/past
            let filtered = data || [];
            const today = startOfDay(new Date());

            if (filter === 'upcoming') {
                filtered = filtered.filter(b => {
                    const slotDate = parseISO(b.lesson_slot.slot_date);
                    return !isBefore(slotDate, today);
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
                {(['upcoming', 'past', 'all'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            filter === f
                                ? 'bg-brand-100 text-brand-700'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Bookings List */}
            {bookings.length === 0 ? (
                <div className="card p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                        <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">No bookings found</h3>
                    <p className="text-sm text-slate-500">
                        {filter === 'upcoming'
                            ? 'You have no upcoming lessons scheduled.'
                            : filter === 'past'
                            ? 'No past lessons to display.'
                            : 'You haven\'t booked any lessons yet.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bookings.map(booking => {
                        const slot = booking.lesson_slot;
                        const gymnast = booking.gymnast_profile;
                        const coach = slot.coach_profile;
                        const isPast = isBefore(parseISO(slot.slot_date), startOfDay(new Date()));
                        const isCancelled = booking.status === 'cancelled';

                        return (
                            <button
                                key={booking.id}
                                onClick={() => setSelectedBooking(booking)}
                                className={`card p-4 w-full text-left hover:shadow-md transition-shadow ${
                                    isCancelled ? 'opacity-60' : ''
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Coach Avatar */}
                                    {coach.avatar_url ? (
                                        <img
                                            src={coach.avatar_url}
                                            alt={coach.full_name}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                                            {coach.full_name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="font-medium text-slate-900 truncate">
                                                {coach.full_name}
                                            </p>
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
                                            <span className="flex items-center gap-1">
                                                <User className="w-3.5 h-3.5" />
                                                {gymnast.first_name}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {format(parseISO(slot.slot_date), 'MMM d')}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {formatTime(slot.start_time)}
                                            </span>
                                        </div>
                                        <span className="inline-block mt-1.5 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs rounded-full">
                                            {EVENT_LABELS[booking.event] || booking.event}
                                        </span>
                                    </div>

                                    <ChevronRight className="w-5 h-5 text-slate-400" />
                                </div>
                            </button>
                        );
                    })}
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
