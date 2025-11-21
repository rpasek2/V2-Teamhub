import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
    initialDate?: Date;
}

export function CreateEventModal({ isOpen, onClose, onEventCreated, initialDate }: CreateEventModalProps) {
    const { hub } = useHub();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endDate: initialDate ? initialDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endTime: '10:00',
        location: '',
        type: 'practice',
        rsvpEnabled: true
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user) return;

        setLoading(true);
        setError(null);

        try {
            const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
            const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

            if (endDateTime <= startDateTime) {
                throw new Error('End time must be after start time');
            }

            const { error: insertError } = await supabase
                .from('events')
                .insert({
                    hub_id: hub.id,
                    title: formData.title,
                    description: formData.description,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    location: formData.location,
                    type: formData.type,
                    rsvp_enabled: formData.rsvpEnabled,
                    created_by: user.id
                });

            if (insertError) throw insertError;

            onEventCreated();
            onClose();
            // Reset form (optional, or keep for next time)
            setFormData({
                title: '',
                description: '',
                startDate: new Date().toISOString().split('T')[0],
                startTime: '09:00',
                endDate: new Date().toISOString().split('T')[0],
                endTime: '10:00',
                location: '',
                type: 'practice',
                rsvpEnabled: true
            });
        } catch (err: any) {
            console.error('Error creating event:', err);
            setError(err.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Event">
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
                    <label htmlFor="title" className="block text-sm font-medium leading-6 text-slate-900">
                        Event Title
                    </label>
                    <div className="mt-2">
                        <input
                            type="text"
                            id="title"
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            placeholder="e.g., Team Practice"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium leading-6 text-slate-900">
                            Event Type
                        </label>
                        <div className="mt-2">
                            <select
                                id="type"
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            >
                                <option value="practice">Practice</option>
                                <option value="competition">Competition</option>
                                <option value="meeting">Meeting</option>
                                <option value="social">Social</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium leading-6 text-slate-900">
                            Location
                        </label>
                        <div className="mt-2">
                            <input
                                type="text"
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                placeholder="Gym A"
                            />
                        </div>
                    </div>
                </div>

                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="rsvpEnabled"
                            name="rsvpEnabled"
                            type="checkbox"
                            checked={formData.rsvpEnabled}
                            onChange={(e) => setFormData({ ...formData, rsvpEnabled: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-600"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="rsvpEnabled" className="font-medium text-gray-900">
                            Enable RSVPs
                        </label>
                        <p className="text-gray-500">Allow members to respond to this event.</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startDate" className="block text-sm font-medium leading-6 text-slate-900">
                            Start Date
                        </label>
                        <div className="mt-2">
                            <input
                                type="date"
                                id="startDate"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium leading-6 text-slate-900">
                            Start Time
                        </label>
                        <div className="mt-2">
                            <input
                                type="time"
                                id="startTime"
                                required
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="endDate" className="block text-sm font-medium leading-6 text-slate-900">
                            End Date
                        </label>
                        <div className="mt-2">
                            <input
                                type="date"
                                id="endDate"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium leading-6 text-slate-900">
                            End Time
                        </label>
                        <div className="mt-2">
                            <input
                                type="time"
                                id="endTime"
                                required
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label htmlFor="description" className="block text-sm font-medium leading-6 text-slate-900">
                        Description
                    </label>
                    <div className="mt-2">
                        <textarea
                            id="description"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                            placeholder="Additional details..."
                        />
                    </div>
                </div>

                <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 sm:col-start-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            'Create Event'
                        )}
                    </button>
                    <button
                        type="button"
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:col-start-1 sm:mt-0"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </Modal>
    );
}
