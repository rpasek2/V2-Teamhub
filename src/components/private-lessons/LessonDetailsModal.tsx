import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Calendar, Clock, User, DollarSign, AlertTriangle, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { LessonBooking, LessonSlot, GymnastProfile, Profile } from '../../types';

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

interface LessonDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpdated: () => void;
    booking: LessonBooking & {
        lesson_slot?: LessonSlot & { coach_profile?: Profile };
        gymnast_profile?: GymnastProfile;
        booked_by?: Profile;
    };
    canCancel?: boolean;
}

export function LessonDetailsModal({
    isOpen,
    onClose,
    onUpdated,
    booking,
    canCancel = true,
}: LessonDetailsModalProps) {
    const { user } = useAuth();
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancellationReason, setCancellationReason] = useState('');
    const [error, setError] = useState('');

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    const handleCancel = async () => {
        if (!user) return;

        setError('');
        setCancelling(true);

        try {
            // Update the booking to cancelled
            const { error: updateError } = await supabase
                .from('lesson_bookings')
                .update({
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString(),
                    cancelled_by: user.id,
                    cancellation_reason: cancellationReason.trim() || null,
                })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            // Delete the calendar event if it exists
            if (booking.calendar_event_id) {
                await supabase
                    .from('events')
                    .delete()
                    .eq('id', booking.calendar_event_id);
            }

            onUpdated();
            onClose();
        } catch (err) {
            console.error('Error cancelling booking:', err);
            setError('Failed to cancel booking');
        } finally {
            setCancelling(false);
        }
    };

    if (!isOpen) return null;

    const slot = booking.lesson_slot;
    const gymnast = booking.gymnast_profile;
    const coachName = slot?.coach_profile?.full_name || 'Coach';
    const gymnastName = gymnast ? `${gymnast.first_name} ${gymnast.last_name}` : 'Gymnast';
    const isCancelled = booking.status === 'cancelled';

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">Lesson Details</h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Status Badge */}
                {isCancelled && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-red-700">This lesson has been cancelled</span>
                    </div>
                )}

                {/* Lesson Info */}
                <div className="space-y-4 mb-6">
                    {/* Coach */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-violet-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Coach</p>
                            <p className="font-medium text-slate-900">{coachName}</p>
                        </div>
                    </div>

                    {/* Gymnast */}
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase">Gymnast</p>
                            <p className="font-medium text-slate-900">{gymnastName}</p>
                            {gymnast?.level && (
                                <p className="text-sm text-slate-500">{gymnast.level}</p>
                            )}
                        </div>
                    </div>

                    {/* Date & Time */}
                    {slot && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <Calendar className="w-4 h-4" />
                                    <span className="text-xs uppercase">Date</span>
                                </div>
                                <p className="font-medium text-slate-900">
                                    {format(parseISO(slot.slot_date), 'EEE, MMM d, yyyy')}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-2 text-slate-400 mb-1">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-xs uppercase">Time</span>
                                </div>
                                <p className="font-medium text-slate-900">
                                    {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Event Focus */}
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500 uppercase mb-1">Focus</p>
                        <span className="px-2.5 py-1 bg-brand-100 text-brand-700 rounded-full text-sm font-medium">
                            {EVENT_LABELS[booking.event] || booking.event}
                        </span>
                    </div>

                    {/* Cost */}
                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
                        <DollarSign className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-900 font-medium">${booking.cost.toFixed(2)}</span>
                    </div>

                    {/* Cancellation Info */}
                    {isCancelled && booking.cancellation_reason && (
                        <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-red-500 uppercase mb-1">Cancellation Reason</p>
                            <p className="text-sm text-red-700">{booking.cancellation_reason}</p>
                        </div>
                    )}
                </div>

                {/* Cancel Confirmation */}
                {showCancelConfirm && !isCancelled && (
                    <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-medium text-amber-800 mb-3">
                            Are you sure you want to cancel this lesson?
                        </p>
                        <textarea
                            value={cancellationReason}
                            onChange={(e) => setCancellationReason(e.target.value)}
                            placeholder="Reason for cancellation (optional)"
                            rows={2}
                            className="input w-full mb-3 text-sm"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="btn-secondary text-sm"
                                disabled={cancelling}
                            >
                                Keep Booking
                            </button>
                            <button
                                onClick={handleCancel}
                                disabled={cancelling}
                                className="btn-danger text-sm flex items-center gap-1"
                            >
                                {cancelling ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Trash2 className="w-4 h-4" />
                                )}
                                Cancel Lesson
                            </button>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 mb-4">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">
                        Close
                    </button>
                    {canCancel && !isCancelled && !showCancelConfirm && (
                        <button
                            onClick={() => setShowCancelConfirm(true)}
                            className="btn-danger flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            Cancel Lesson
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
