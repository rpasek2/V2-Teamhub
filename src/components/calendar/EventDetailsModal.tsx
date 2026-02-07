import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, MapPin, Clock, Calendar as CalendarIcon, Users, Pencil, Trash2, Loader2, AlignLeft, Star, Trophy, HeartHandshake } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import type { Event } from '../../types';

const EVENT_TYPES = [
    { value: 'practice', label: 'Practice', icon: '🏋️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
    { value: 'competition', label: 'Comp', icon: '🏆', color: 'bg-purple-100 border-purple-300 text-purple-700' },
    { value: 'mentorship', label: 'Mentor', icon: '💕', color: 'bg-pink-100 border-pink-300 text-pink-700' },
    { value: 'camp', label: 'Camp', icon: '🏕️', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
    { value: 'clinic', label: 'Clinic', icon: '🎯', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
    { value: 'meeting', label: 'Meeting', icon: '👥', color: 'bg-amber-100 border-amber-300 text-amber-700' },
    { value: 'social', label: 'Social', icon: '🎉', color: 'bg-green-100 border-green-300 text-green-700' },
    { value: 'private_lesson', label: 'Private', icon: '👤', color: 'bg-violet-100 border-violet-300 text-violet-700' },
    { value: 'fundraiser', label: 'Fundraise', icon: '💰', color: 'bg-orange-100 border-orange-300 text-orange-700' },
    { value: 'other', label: 'Other', icon: '📌', color: 'bg-slate-100 border-slate-300 text-slate-700' },
] as const;

// Types that are automatically considered "save the date" events
const SAVE_THE_DATE_TYPES = ['competition', 'mentorship', 'camp'];

// Input length limits
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 200;

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
        rsvpEnabled: true,
        isSaveTheDate: false
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
                rsvpEnabled: event.rsvp_enabled,
                isSaveTheDate: (event as any).is_save_the_date || SAVE_THE_DATE_TYPES.includes(event.type)
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
            // Validate input lengths
            if (editForm.title.length > MAX_TITLE_LENGTH) {
                alert(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
                setLoading(false);
                return;
            }
            if (editForm.description.length > MAX_DESCRIPTION_LENGTH) {
                alert(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
                setLoading(false);
                return;
            }
            if (editForm.location.length > MAX_LOCATION_LENGTH) {
                alert(`Location must be ${MAX_LOCATION_LENGTH} characters or less`);
                setLoading(false);
                return;
            }

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
                    rsvp_enabled: editForm.rsvpEnabled,
                    is_save_the_date: editForm.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(editForm.type)
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
        const eventType = EVENT_TYPES.find(t => t.value === type);
        if (eventType) {
            return eventType.color.replace('border-', '').split(' ').filter(c => c.startsWith('bg-') || c.startsWith('text-')).join(' ');
        }
        return 'bg-slate-100 text-slate-700';
    };

    const selectedType = EVENT_TYPES.find(t => t.value === editForm.type);

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
                                <div className={`flex items-center justify-between px-6 py-4 ${isEditing ? (selectedType?.color.split(' ')[0] || 'bg-slate-100') : 'border-b border-slate-100'}`}>
                                    <div className="flex items-center gap-3">
                                        {!isEditing && (
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize ${getEventTypeColor(event.type)}`}>
                                                {event.type.replace('_', ' ')}
                                            </span>
                                        )}
                                        {isEditing && (
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{selectedType?.icon}</span>
                                                <span className="text-lg font-semibold text-slate-900">Edit Event</span>
                                            </div>
                                        )}
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
                                        <div className="space-y-5">
                                            {/* Event Type Selection */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Event Type
                                                </label>
                                                <div className="grid grid-cols-5 gap-1.5">
                                                    {EVENT_TYPES.map((type) => (
                                                        <button
                                                            key={type.value}
                                                            type="button"
                                                            onClick={() => setEditForm({
                                                                ...editForm,
                                                                type: type.value,
                                                                isSaveTheDate: SAVE_THE_DATE_TYPES.includes(type.value) ? true : editForm.isSaveTheDate
                                                            })}
                                                            className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all aspect-square ${
                                                                editForm.type === type.value
                                                                    ? type.color + ' border-current shadow-sm'
                                                                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <span className="text-lg leading-none">{type.icon}</span>
                                                            <span className="text-[10px] font-medium leading-tight">{type.label}</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Competition Warning */}
                                                {editForm.type === 'competition' && (
                                                    <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl mt-2">
                                                        <Trophy className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-purple-700">
                                                            This event is linked to the Competitions tab.
                                                        </p>
                                                    </div>
                                                )}

                                                {/* Mentorship Info */}
                                                {editForm.type === 'mentorship' && (
                                                    <div className="flex items-start gap-3 p-3 bg-pink-50 border border-pink-200 rounded-xl mt-2">
                                                        <HeartHandshake className="h-4 w-4 text-pink-600 flex-shrink-0 mt-0.5" />
                                                        <p className="text-xs text-pink-700">
                                                            This event appears in the Mentorship tab.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Event Title */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    Event Title
                                                </label>
                                                <input
                                                    type="text"
                                                    required
                                                    maxLength={MAX_TITLE_LENGTH}
                                                    value={editForm.title}
                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                    className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm"
                                                    placeholder="e.g., Team Practice, Parents Meeting..."
                                                />
                                            </div>

                                            {/* Date & Time Section */}
                                            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                                                <div className="flex items-center gap-2 text-slate-700">
                                                    <CalendarIcon className="h-4 w-4" />
                                                    <span className="text-sm font-medium">Date & Time</span>
                                                </div>

                                                {/* Start */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                                            Start Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={editForm.startDate}
                                                            onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                                                            className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                                            Start Time
                                                        </label>
                                                        <input
                                                            type="time"
                                                            required
                                                            value={editForm.startTime}
                                                            onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                                                            className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                {/* End */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                                            End Date
                                                        </label>
                                                        <input
                                                            type="date"
                                                            required
                                                            value={editForm.endDate}
                                                            onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                                                            className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-slate-500 mb-1">
                                                            End Time
                                                        </label>
                                                        <input
                                                            type="time"
                                                            required
                                                            value={editForm.endTime}
                                                            onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                                                            className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Location */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    <span className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                        Location
                                                    </span>
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={MAX_LOCATION_LENGTH}
                                                    value={editForm.location}
                                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                                    className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm"
                                                    placeholder="e.g., Main Gym, Conference Room..."
                                                />
                                            </div>

                                            {/* Description */}
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    <span className="flex items-center gap-2">
                                                        <AlignLeft className="h-4 w-4 text-slate-400" />
                                                        Description
                                                        <span className="text-slate-400 font-normal">(optional)</span>
                                                    </span>
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    maxLength={MAX_DESCRIPTION_LENGTH}
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm resize-none"
                                                    placeholder="Add any additional details about the event..."
                                                />
                                            </div>

                                            {/* RSVP Toggle */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Users className="h-5 w-5 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">Enable RSVPs</p>
                                                        <p className="text-xs text-slate-500">Allow members to respond to this event</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={editForm.rsvpEnabled}
                                                    onClick={() => setEditForm({ ...editForm, rsvpEnabled: !editForm.rsvpEnabled })}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                                        editForm.rsvpEnabled ? 'bg-brand-600' : 'bg-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            editForm.rsvpEnabled ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>

                                            {/* Save the Date Toggle */}
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Star className="h-5 w-5 text-amber-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-900">Save the Date</p>
                                                        <p className="text-xs text-slate-500">Include in season's important events list</p>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={editForm.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(editForm.type)}
                                                    onClick={() => setEditForm({ ...editForm, isSaveTheDate: !editForm.isSaveTheDate })}
                                                    disabled={SAVE_THE_DATE_TYPES.includes(editForm.type)}
                                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                                        (editForm.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(editForm.type)) ? 'bg-amber-500' : 'bg-slate-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                            (editForm.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(editForm.type)) ? 'translate-x-5' : 'translate-x-0'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                            {SAVE_THE_DATE_TYPES.includes(editForm.type) && (
                                                <p className="text-xs text-slate-500 -mt-3 ml-1">
                                                    Competitions, mentorship, and camp events are automatically included.
                                                </p>
                                            )}

                                            {/* Action Buttons */}
                                            <div className="flex gap-3 pt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(false)}
                                                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleSaveEdit}
                                                    disabled={loading || !editForm.title.trim()}
                                                    className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                                >
                                                    {loading ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Saving...
                                                        </>
                                                    ) : (
                                                        'Save Changes'
                                                    )}
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
