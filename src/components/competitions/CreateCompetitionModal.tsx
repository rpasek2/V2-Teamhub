import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface CreateCompetitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCompetitionCreated: () => void;
}

interface Gymnast {
    user_id: string;
    profiles: {
        full_name: string;
    };
}

export function CreateCompetitionModal({ isOpen, onClose, onCompetitionCreated }: CreateCompetitionModalProps) {
    const { hub } = useHub();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
    const [selectedGymnasts, setSelectedGymnasts] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        startDate: '',
        endDate: '',
        location: ''
    });

    useEffect(() => {
        if (isOpen && hub) {
            fetchGymnasts();
        }
    }, [isOpen, hub]);

    const fetchGymnasts = async () => {
        if (!hub) return;
        const { data, error } = await supabase
            .from('hub_members')
            .select('user_id, profiles(full_name)')
            .eq('hub_id', hub.id)
            .eq('role', 'gymnast');

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            setGymnasts(data as any || []);
        }
    };

    const toggleGymnast = (userId: string) => {
        setSelectedGymnasts(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create Competition
            const { data: compData, error: compError } = await supabase
                .from('competitions')
                .insert({
                    hub_id: hub.id,
                    name: formData.name,
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    location: formData.location,
                    created_by: user.id
                })
                .select()
                .single();

            if (compError) throw compError;

            // 2. Add Gymnasts
            if (selectedGymnasts.length > 0) {
                const gymnastInserts = selectedGymnasts.map(userId => ({
                    competition_id: compData.id,
                    user_id: userId
                }));

                const { error: rosterError } = await supabase
                    .from('competition_gymnasts')
                    .insert(gymnastInserts);

                if (rosterError) throw rosterError;
            }

            // 3. Auto-create calendar event for the competition
            const startDateTime = new Date(`${formData.startDate}T09:00:00`);
            const endDateTime = new Date(`${formData.endDate}T17:00:00`);

            const { error: eventError } = await supabase
                .from('events')
                .insert({
                    hub_id: hub.id,
                    title: formData.name,
                    description: `Competition: ${formData.name}${formData.location ? ` at ${formData.location}` : ''}`,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    location: formData.location || null,
                    type: 'competition',
                    rsvp_enabled: true,
                    created_by: user.id
                });

            if (eventError) {
                console.error('Error creating calendar event:', eventError);
                // Don't throw - competition was created successfully, calendar event is secondary
            }

            onCompetitionCreated();
            onClose();
            setFormData({ name: '', startDate: '', endDate: '', location: '' });
            setSelectedGymnasts([]);
        } catch (err: any) {
            console.error('Error creating competition:', err);
            setError(err.message || 'Failed to create competition');
        } finally {
            setLoading(false);
        }
    };

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

                                <div className="sm:flex sm:items-start">
                                    <div className="mt-3 w-full text-center sm:ml-4 sm:mt-0 sm:text-left">
                                        <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                            Create New Competition
                                        </Dialog.Title>
                                        <div className="mt-2">
                                            <form onSubmit={handleSubmit} className="space-y-4">
                                                {error && (
                                                    <div className="rounded-md bg-red-50 p-4">
                                                        <div className="flex">
                                                            <div className="flex-shrink-0">
                                                                <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div>
                                                    <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                                                        Competition Name
                                                    </label>
                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            name="name"
                                                            id="name"
                                                            required
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                                            placeholder="State Championships"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="startDate" className="block text-sm font-medium leading-6 text-gray-900">
                                                            Start Date
                                                        </label>
                                                        <div className="mt-2">
                                                            <input
                                                                type="date"
                                                                name="startDate"
                                                                id="startDate"
                                                                required
                                                                value={formData.startDate}
                                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-gray-900">
                                                            End Date
                                                        </label>
                                                        <div className="mt-2">
                                                            <input
                                                                type="date"
                                                                name="endDate"
                                                                id="endDate"
                                                                required
                                                                value={formData.endDate}
                                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label htmlFor="location" className="block text-sm font-medium leading-6 text-gray-900">
                                                        Location
                                                    </label>
                                                    <div className="mt-2">
                                                        <input
                                                            type="text"
                                                            name="location"
                                                            id="location"
                                                            value={formData.location}
                                                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                                            placeholder="City, State or Venue"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium leading-6 text-gray-900">
                                                        Select Gymnasts
                                                    </label>
                                                    <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-200 p-2">
                                                        {gymnasts.length > 0 ? (
                                                            <div className="space-y-2">
                                                                {gymnasts.map((gymnast) => (
                                                                    <div
                                                                        key={gymnast.user_id}
                                                                        className={`flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-50 ${selectedGymnasts.includes(gymnast.user_id) ? 'bg-brand-50' : ''
                                                                            }`}
                                                                        onClick={() => toggleGymnast(gymnast.user_id)}
                                                                    >
                                                                        <span className="text-sm text-gray-900">{gymnast.profiles.full_name}</span>
                                                                        {selectedGymnasts.includes(gymnast.user_id) && (
                                                                            <Check className="h-4 w-4 text-brand-600" />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-gray-500">No gymnasts found in roster.</p>
                                                        )}
                                                    </div>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        {selectedGymnasts.length} selected
                                                    </p>
                                                </div>

                                                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                                    <button
                                                        type="submit"
                                                        disabled={loading}
                                                        className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:ml-3 sm:w-auto disabled:opacity-50"
                                                    >
                                                        {loading ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Creating...
                                                            </>
                                                        ) : (
                                                            'Create Competition'
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                                                        onClick={onClose}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
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
