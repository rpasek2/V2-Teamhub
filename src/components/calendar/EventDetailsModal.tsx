import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, MapPin, Clock, Calendar as CalendarIcon, Users, Pencil, Trash2, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types';

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event | null;
    onEventUpdated?: () => void;
    canEdit?: boolean;
}

interface Attendee {
    user_id: string;
    status: 'going' | 'maybe' | 'not_going';
    profiles: {
        full_name: string;
        email: string;
    };
}

export function EventDetailsModal({ isOpen, onClose, event, onEventUpdated, canEdit = false }: EventDetailsModalProps) {
    const { user } = useAuth();
    const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        location: '',
        type: 'practice',
        rsvpEnabled: true
    });

    useEffect(() => {
        if (isOpen && event && user) {
            fetchRsvpStatus();
            fetchAttendees();
            setIsEditing(false);
            // Initialize edit form
            setEditForm({
                title: event.title,
                description: event.description || '',
                startDate: format(parseISO(event.start_time), 'yyyy-MM-dd'),
                startTime: format(parseISO(event.start_time), 'HH:mm'),
                endDate: format(parseISO(event.end_time), 'yyyy-MM-dd'),
                endTime: format(parseISO(event.end_time), 'HH:mm'),
                location: event.location || '',
                type: event.type,
                rsvpEnabled: event.rsvp_enabled
            });
        }
    }, [isOpen, event, user]);

    const fetchRsvpStatus = async () => {
        if (!event || !user) return;
        const { data } = await supabase
            .from('event_rsvps')
            .select('status')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .single();

        if (data) setRsvpStatus(data.status as 'going' | 'maybe' | 'not_going');
        else setRsvpStatus(null);
    };

    const fetchAttendees = async () => {
        if (!event) return;
        const { data } = await supabase
            .from('event_rsvps')
            .select('user_id, status, profiles(full_name, email)')
            .eq('event_id', event.id)
            .eq('status', 'going');

        if (data) {
            const mapped = data.map((d: { user_id: string; status: string; profiles: { full_name: string; email: string } | { full_name: string; email: string }[] }) => ({
                user_id: d.user_id,
                status: d.status as 'going' | 'maybe' | 'not_going',
                profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
            }));
            setAttendees(mapped as Attendee[]);
        }
    };

    const handleRsvp = async (status: 'going' | 'maybe' | 'not_going') => {
        if (!event || !user) return;
        setLoading(true);

        const { error } = await supabase
            .from('event_rsvps')
            .upsert({
                event_id: event.id,
                user_id: user.id,
                status: status
            }, { onConflict: 'event_id,user_id' });

        if (!error) {
            setRsvpStatus(status);
            fetchAttendees();
        }
        setLoading(false);
    };

    const handleSaveEdit = async () => {
        if (!event) return;
        setLoading(true);

        try {
            const startDateTime = new Date(`${editForm.startDate}T${editForm.startTime}`);
            const endDateTime = new Date(`${editForm.endDate}T${editForm.endTime}`);

            if (endDateTime <= startDateTime) {
                alert('End time must be after start time');
                setLoading(false);
                return;
            }

            const { error } = await supabase
                .from('events')
                .update({
                    title: editForm.title,
                    description: editForm.description || null,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    location: editForm.location || null,
                    type: editForm.type,
                    rsvp_enabled: editForm.rsvpEnabled
                })
                .eq('id', event.id);

            if (error) throw error;

            setIsEditing(false);
            if (onEventUpdated) onEventUpdated();
            onClose();
        } catch (err) {
            console.error('Error updating event:', err);
            alert('Failed to update event');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!event) return;
        if (!confirm('Are you sure you want to delete this event? This cannot be undone.')) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', event.id);

            if (error) throw error;

            if (onEventUpdated) onEventUpdated();
            onClose();
        } catch (err) {
            console.error('Error deleting event:', err);
            alert('Failed to delete event');
        } finally {
            setDeleting(false);
        }
    };

    if (!event) return null;

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
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <Dialog.Panel className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Header */}
                                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        {!isEditing && (
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${getEventTypeColor(event.type)}`}>
                                                {event.type}
                                            </span>
                                        )}
                                        {isEditing && <span className="text-sm font-medium text-slate-500">Editing Event</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {canEdit && !isEditing && (
                                            <>
                                                <button
                                                    onClick={() => setIsEditing(true)}
                                                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Edit event"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={deleting}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete event"
                                                >
                                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={onClose}
                                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="px-6 py-5">
                                    {isEditing ? (
                                        /* Edit Form */
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                                <input
                                                    type="text"
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                                    <select
                                                        value={editForm.type}
                                                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    >
                                                        <option value="practice">Practice</option>
                                                        <option value="competition">Competition</option>
                                                        <option value="meeting">Meeting</option>
                                                        <option value="social">Social</option>
                                                        <option value="other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.location}
                                                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.startDate}
                                                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={editForm.startTime}
                                                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                                    <input
                                                        type="date"
                                                        value={editForm.endDate}
                                                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={editForm.endTime}
                                                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                                        className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                                <textarea
                                                    rows={3}
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                />
                                            </div>

                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id="rsvpEnabled"
                                                    checked={editForm.rsvpEnabled}
                                                    onChange={(e) => setEditForm({ ...editForm, rsvpEnabled: e.target.checked })}
                                                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                />
                                                <label htmlFor="rsvpEnabled" className="ml-2 text-sm text-slate-700">Enable RSVPs</label>
                                            </div>

                                            <div className="flex gap-3 pt-4">
                                                <button
                                                    onClick={() => setIsEditing(false)}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleSaveEdit}
                                                    disabled={loading}
                                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50"
                                                >
                                                    {loading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Save Changes'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* View Mode */
                                        <>
                                            <Dialog.Title as="h3" className="text-xl font-bold text-slate-900">
                                                {event.title}
                                            </Dialog.Title>

                                            <div className="mt-4 space-y-3">
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <CalendarIcon className="mr-3 h-5 w-5 text-slate-400" />
                                                    {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
                                                </div>
                                                <div className="flex items-center text-sm text-slate-600">
                                                    <Clock className="mr-3 h-5 w-5 text-slate-400" />
                                                    {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                                                </div>
                                                {event.location && (
                                                    <div className="flex items-center text-sm text-slate-600">
                                                        <MapPin className="mr-3 h-5 w-5 text-slate-400" />
                                                        {event.location}
                                                    </div>
                                                )}
                                            </div>

                                            {event.description && (
                                                <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                                                    <p className="text-sm text-slate-600">{event.description}</p>
                                                </div>
                                            )}

                                            {event.rsvp_enabled && (
                                                <>
                                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                                        <h4 className="text-sm font-semibold text-slate-900 mb-3">Your RSVP</h4>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleRsvp('going')}
                                                                disabled={loading}
                                                                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                                                                    rsvpStatus === 'going'
                                                                        ? 'bg-green-500 text-white shadow-sm'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                Going
                                                            </button>
                                                            <button
                                                                onClick={() => handleRsvp('maybe')}
                                                                disabled={loading}
                                                                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                                                                    rsvpStatus === 'maybe'
                                                                        ? 'bg-amber-500 text-white shadow-sm'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                Maybe
                                                            </button>
                                                            <button
                                                                onClick={() => handleRsvp('not_going')}
                                                                disabled={loading}
                                                                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all ${
                                                                    rsvpStatus === 'not_going'
                                                                        ? 'bg-red-500 text-white shadow-sm'
                                                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                Can't Go
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="mt-6 pt-6 border-t border-slate-100">
                                                        <h4 className="text-sm font-semibold text-slate-900 flex items-center mb-3">
                                                            <Users className="mr-2 h-4 w-4 text-slate-400" />
                                                            Attendees ({attendees.length})
                                                        </h4>
                                                        <div className="max-h-32 overflow-y-auto">
                                                            {attendees.length > 0 ? (
                                                                <div className="flex flex-wrap gap-2">
                                                                    {attendees.map((attendee) => (
                                                                        <div
                                                                            key={attendee.user_id}
                                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
                                                                        >
                                                                            <div className="h-5 w-5 rounded-full bg-green-200 flex items-center justify-center text-xs font-medium">
                                                                                {attendee.profiles.full_name?.[0] || '?'}
                                                                            </div>
                                                                            {attendee.profiles.full_name}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <p className="text-sm text-slate-500 italic">No one has RSVP'd yet.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
