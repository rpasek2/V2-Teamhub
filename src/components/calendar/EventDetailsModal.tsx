import { Fragment, useEffect, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, MapPin, Clock, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface Event {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    location?: string;
    description?: string;
    type: string;
    rsvp_enabled: boolean;
}

interface EventDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: Event | null;
}

interface Attendee {
    user_id: string;
    status: 'going' | 'maybe' | 'not_going';
    profiles: {
        full_name: string;
        email: string;
    };
}

export function EventDetailsModal({ isOpen, onClose, event }: EventDetailsModalProps) {
    const { user } = useAuth();
    const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going' | null>(null);
    const [attendees, setAttendees] = useState<Attendee[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && event && user) {
            fetchRsvpStatus();
            fetchAttendees();
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

        if (data) setRsvpStatus(data.status as any);
        else setRsvpStatus(null);
    };

    const fetchAttendees = async () => {
        if (!event) return;
        const { data } = await supabase
            .from('event_rsvps')
            .select('user_id, status, profiles(full_name, email)')
            .eq('event_id', event.id)
            .eq('status', 'going');

        if (data) setAttendees(data as any || []);
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
            }, { onConflict: 'event_id, user_id' });

        if (!error) {
            setRsvpStatus(status);
            fetchAttendees();
        }
        setLoading(false);
    };

    if (!event) return null;

    return (
        <Transition.Root show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-10" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
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
                            <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                                    <button
                                        type="button"
                                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        <span className="sr-only">Close</span>
                                        <X className="h-6 w-6" aria-hidden="true" />
                                    </button>
                                </div>

                                <div>
                                    <div className="mt-3 sm:mt-0">
                                        <Dialog.Title as="h3" className="text-xl font-semibold leading-6 text-gray-900">
                                            {event.title}
                                        </Dialog.Title>
                                        <div className="mt-1">
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 capitalize">
                                                {event.type}
                                            </span>
                                        </div>

                                        <div className="mt-4 space-y-3">
                                            <div className="flex items-center text-sm text-gray-500">
                                                <CalendarIcon className="mr-2 h-5 w-5 text-gray-400" />
                                                {format(parseISO(event.start_time), 'EEEE, MMMM d, yyyy')}
                                            </div>
                                            <div className="flex items-center text-sm text-gray-500">
                                                <Clock className="mr-2 h-5 w-5 text-gray-400" />
                                                {format(parseISO(event.start_time), 'h:mm a')} - {format(parseISO(event.end_time), 'h:mm a')}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center text-sm text-gray-500">
                                                    <MapPin className="mr-2 h-5 w-5 text-gray-400" />
                                                    {event.location}
                                                </div>
                                            )}
                                        </div>

                                        {event.description && (
                                            <div className="mt-4 text-sm text-gray-600">
                                                {event.description}
                                            </div>
                                        )}

                                        {event.rsvp_enabled && (
                                            <>
                                                <div className="mt-6 border-t border-gray-200 pt-4">
                                                    <h4 className="text-sm font-medium text-gray-900">Your RSVP</h4>
                                                    <div className="mt-3 flex gap-3">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRsvp('going')}
                                                            disabled={loading}
                                                            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${rsvpStatus === 'going'
                                                                ? 'bg-brand-600 text-white ring-brand-600 hover:bg-brand-500'
                                                                : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            Going
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRsvp('maybe')}
                                                            disabled={loading}
                                                            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${rsvpStatus === 'maybe'
                                                                ? 'bg-yellow-600 text-white ring-yellow-600 hover:bg-yellow-500'
                                                                : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            Maybe
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRsvp('not_going')}
                                                            disabled={loading}
                                                            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold shadow-sm ring-1 ring-inset ${rsvpStatus === 'not_going'
                                                                ? 'bg-red-600 text-white ring-red-600 hover:bg-red-500'
                                                                : 'bg-white text-gray-900 ring-gray-300 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            Not Going
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-6 border-t border-gray-200 pt-4">
                                                    <h4 className="text-sm font-medium text-gray-900 flex items-center">
                                                        <Users className="mr-2 h-4 w-4" />
                                                        Attendees ({attendees.length})
                                                    </h4>
                                                    <div className="mt-3 max-h-40 overflow-y-auto">
                                                        {attendees.length > 0 ? (
                                                            <ul className="space-y-2">
                                                                {attendees.map((attendee) => (
                                                                    <li key={attendee.user_id} className="text-sm text-gray-600 flex items-center">
                                                                        <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600 mr-2">
                                                                            {attendee.profiles.full_name?.[0] || '?'}
                                                                        </div>
                                                                        {attendee.profiles.full_name}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-sm text-gray-500 italic">No one has RSVP'd yet.</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    );
}
