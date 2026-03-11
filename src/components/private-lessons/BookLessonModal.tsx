import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Calendar, Clock, User, DollarSign, Check, Users } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { LessonSlot, CoachLessonProfile, LessonPackage, Profile } from '../../types';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

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
    floor_choreo: 'Floor Choreography',
    beam_choreo: 'Beam Choreography',
    other: 'Other',
};

interface BookLessonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBooked: () => void;
    slot: LessonSlot;
    coachProfile?: CoachLessonProfile & { coach_profile?: Profile };
    packages?: LessonPackage[];
}

export function BookLessonModal({
    isOpen,
    onClose,
    onBooked,
    slot,
    coachProfile,
    packages = [],
}: BookLessonModalProps) {
    const { user } = useAuth();
    const { hub, linkedGymnasts } = useHub();

    const [selectedGymnastId, setSelectedGymnastId] = useState('');
    const [selectedEvent, setSelectedEvent] = useState('');
    const [selectedPackageId, setSelectedPackageId] = useState('');
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Filter linked gymnasts to those matching coach's levels
    const eligibleGymnasts = linkedGymnasts.filter(g => {
        if (!coachProfile?.levels?.length) return true;
        return coachProfile.levels.includes(g.level);
    });

    // Get available events (from coach profile, filtered by gymnast's gender if needed)
    const availableEvents = coachProfile?.events || [];

    // Get active packages sorted by price
    const activePackages = packages.filter(p => p.is_active).sort((a, b) => a.price - b.price);

    // Get selected package
    const selectedPackage = activePackages.find(p => p.id === selectedPackageId);

    useEffect(() => {
        // Reset form when modal opens
        if (isOpen) {
            setSelectedGymnastId('');
            setSelectedEvent('');
            // Auto-select first package if only one
            if (activePackages.length === 1) {
                setSelectedPackageId(activePackages[0].id);
            } else {
                setSelectedPackageId('');
            }
            setError('');
            setSuccess(false);
        }
    }, [isOpen, activePackages.length]);

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes} min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (mins === 0) return `${hours} hr`;
        return `${hours} hr ${mins} min`;
    };

    // Calculate end time based on selected package
    const getEndTime = () => {
        if (!selectedPackage) return slot.end_time;

        const [startHours, startMinutes] = slot.start_time.split(':').map(Number);
        const startDate = new Date();
        startDate.setHours(startHours, startMinutes, 0, 0);

        const endDate = addMinutes(startDate, selectedPackage.duration_minutes);
        return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    };

    const handleBook = async () => {
        if (!hub || !user || !selectedGymnastId || !selectedEvent) {
            setError('Please select a gymnast and lesson focus');
            return;
        }

        if (activePackages.length > 0 && !selectedPackageId) {
            setError('Please select a lesson package');
            return;
        }

        setError('');
        setBooking(true);

        try {
            // Get the selected gymnast
            const gymnast = eligibleGymnasts.find(g => g.id === selectedGymnastId);
            if (!gymnast) throw new Error('Gymnast not found');

            // Get coach name
            const coachName = coachProfile?.coach_profile?.full_name || 'Coach';

            // Calculate lesson times
            const slotDate = parseLocalDate(slot.slot_date);
            const [startHours, startMinutes] = slot.start_time.split(':').map(Number);

            const startTime = new Date(slotDate);
            startTime.setHours(startHours, startMinutes, 0, 0);

            // Use package duration if available, otherwise use slot end time
            const endTime = selectedPackage
                ? addMinutes(startTime, selectedPackage.duration_minutes)
                : (() => {
                    const [endHours, endMinutes] = slot.end_time.split(':').map(Number);
                    const et = new Date(slotDate);
                    et.setHours(endHours, endMinutes, 0, 0);
                    return et;
                })();

            // Create calendar event first
            const packageName = selectedPackage ? ` (${selectedPackage.name})` : '';
            const eventTitle = `Private Lesson: ${gymnast.first_name} ${gymnast.last_name} with ${coachName}${packageName}`;
            const eventDescription = `${EVENT_LABELS[selectedEvent] || selectedEvent} lesson`;

            const { data: eventData, error: eventError } = await supabase
                .from('events')
                .insert({
                    hub_id: hub.id,
                    title: eventTitle,
                    description: eventDescription,
                    start_time: startTime.toISOString(),
                    end_time: endTime.toISOString(),
                    type: 'private_lesson',
                    rsvp_enabled: false,
                    created_by: user.id,
                })
                .select('id')
                .single();

            if (eventError) throw eventError;

            // Determine cost from package or fallback to profile
            const cost = selectedPackage?.price ?? coachProfile?.cost_per_lesson ?? 0;

            // Create the booking
            const { error: bookingError } = await supabase
                .from('lesson_bookings')
                .insert({
                    hub_id: hub.id,
                    lesson_slot_id: slot.id,
                    booked_by_user_id: user.id,
                    gymnast_profile_id: selectedGymnastId,
                    event: selectedEvent,
                    status: 'confirmed',
                    cost,
                    calendar_event_id: eventData.id,
                });

            if (bookingError) {
                // If booking fails, delete the calendar event
                await supabase.from('events').delete().eq('id', eventData.id);
                throw bookingError;
            }

            // Update the slot with package_id if selected
            if (selectedPackageId) {
                await supabase
                    .from('lesson_slots')
                    .update({
                        package_id: selectedPackageId,
                        end_time: getEndTime(),
                        max_gymnasts: selectedPackage?.max_gymnasts || 1,
                    })
                    .eq('id', slot.id);
            }

            setSuccess(true);
            setTimeout(() => {
                onBooked();
                onClose();
            }, 1500);
        } catch (err) {
            console.error('Error booking lesson:', err);
            setError(err instanceof Error ? err.message : 'Failed to book lesson');
        } finally {
            setBooking(false);
        }
    };

    if (!isOpen) return null;

    const coachName = coachProfile?.coach_profile?.full_name || 'Coach';
    const displayEndTime = selectedPackage ? getEndTime() : slot.end_time;
    const displayPrice = selectedPackage?.price ?? coachProfile?.cost_per_lesson ?? 0;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-heading">Book Private Lesson</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-faint hover:text-subtle hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {success ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-heading mb-2">Booking Confirmed!</h3>
                        <p className="text-subtle">Your lesson has been scheduled and added to the calendar.</p>
                    </div>
                ) : (
                    <>
                        {/* Slot Info */}
                        <div className="bg-surface-alt rounded-lg p-4 mb-6">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                                    <User className="w-5 h-5 text-violet-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-heading">{coachName}</p>
                                    <p className="text-sm text-muted">Instructor</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="w-4 h-4 text-faint" />
                                    <span className="text-body">
                                        {format(parseLocalDate(slot.slot_date), 'EEE, MMM d, yyyy')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="w-4 h-4 text-faint" />
                                    <span className="text-body">
                                        {formatTime(slot.start_time)} - {formatTime(displayEndTime)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-2">
                                <DollarSign className="w-4 h-4 text-faint" />
                                <span className="text-body font-medium">
                                    ${displayPrice.toFixed(2)}
                                    {selectedPackage && (
                                        <span className="text-muted font-normal ml-1">
                                            ({selectedPackage.name})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>

                        {/* Select Package (if multiple packages available) */}
                        {activePackages.length > 1 && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-body mb-2">
                                    Select Lesson Package *
                                </label>
                                <div className="space-y-2">
                                    {activePackages.map(pkg => (
                                        <button
                                            key={pkg.id}
                                            type="button"
                                            onClick={() => setSelectedPackageId(pkg.id)}
                                            className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${
                                                selectedPackageId === pkg.id
                                                    ? 'border-accent-500 bg-accent-500/10'
                                                    : 'border-line bg-surface hover:border-line-strong'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="font-medium text-heading">{pkg.name}</p>
                                                    <div className="flex items-center gap-3 text-xs text-muted mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDuration(pkg.duration_minutes)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Users className="w-3 h-3" />
                                                            {pkg.max_gymnasts === 1 ? 'Private' : `Up to ${pkg.max_gymnasts}`}
                                                        </span>
                                                    </div>
                                                    {pkg.description && (
                                                        <p className="text-xs text-muted mt-1">{pkg.description}</p>
                                                    )}
                                                </div>
                                                <p className="text-lg font-bold text-accent-600">
                                                    ${pkg.price}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Select Gymnast */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-body mb-2">
                                Select Gymnast *
                            </label>
                            {eligibleGymnasts.length > 0 ? (
                                <select
                                    value={selectedGymnastId}
                                    onChange={(e) => setSelectedGymnastId(e.target.value)}
                                    className="input w-full"
                                >
                                    <option value="">Choose a gymnast...</option>
                                    {eligibleGymnasts.map(g => (
                                        <option key={g.id} value={g.id}>
                                            {g.first_name} {g.last_name} ({g.level})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-sm text-amber-600 bg-amber-500/10 p-3 rounded-lg">
                                    No linked gymnasts match the coach's levels ({coachProfile?.levels.join(', ')}).
                                </p>
                            )}
                        </div>

                        {/* Select Event */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-body mb-2">
                                Lesson Focus *
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {availableEvents.map(evt => (
                                    <button
                                        key={evt}
                                        type="button"
                                        onClick={() => setSelectedEvent(evt)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                            selectedEvent === evt
                                                ? 'bg-accent-500/15 text-accent-600 border-2 border-accent-500/30'
                                                : 'bg-surface-hover text-subtle border-2 border-transparent hover:bg-surface-active'
                                        }`}
                                    >
                                        {EVENT_LABELS[evt] || evt}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600 mb-4">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={onClose}
                                className="btn-secondary"
                                disabled={booking}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBook}
                                disabled={booking || !selectedGymnastId || !selectedEvent || (activePackages.length > 1 && !selectedPackageId)}
                                className="btn-primary flex items-center gap-2"
                            >
                                {booking && <Loader2 className="w-4 h-4 animate-spin" />}
                                Book for ${displayPrice.toFixed(2)}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
