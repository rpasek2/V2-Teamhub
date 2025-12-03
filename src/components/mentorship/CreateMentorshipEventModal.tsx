import { useState } from 'react';
import { Loader2, CalendarDays } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../ui/Modal';

interface CreateMentorshipEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    hubId: string;
}

export function CreateMentorshipEventModal({ isOpen, onClose, onCreated, hubId }: CreateMentorshipEventModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [location, setLocation] = useState('');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setEventDate('');
        setStartTime('');
        setEndTime('');
        setLocation('');
        setError(null);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim() || !eventDate) {
            setError('Please provide a title and date');
            return;
        }

        setLoading(true);
        setError(null);

        // Create calendar event with type 'mentorship'
        const startDateTime = startTime
            ? new Date(`${eventDate}T${startTime}`)
            : new Date(`${eventDate}T09:00`);
        const endDateTime = endTime
            ? new Date(`${eventDate}T${endTime}`)
            : new Date(`${eventDate}T10:00`);

        const { error: insertError } = await supabase
            .from('events')
            .insert({
                hub_id: hubId,
                title: title.trim(),
                description: description.trim() || null,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                location: location.trim() || null,
                type: 'mentorship',
                rsvp_enabled: false,
                created_by: user?.id
            });

        if (insertError) {
            setError(insertError.message);
            setLoading(false);
            return;
        }

        setLoading(false);
        resetForm();
        onCreated();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Add Mentorship Event">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                        Event Title *
                    </label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Holiday Gift Exchange"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Description */}
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="Event details..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    />
                </div>

                {/* Date */}
                <div>
                    <label htmlFor="eventDate" className="block text-sm font-medium text-slate-700 mb-1">
                        Date *
                    </label>
                    <input
                        type="date"
                        id="eventDate"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        required
                    />
                </div>

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="startTime" className="block text-sm font-medium text-slate-700 mb-1">
                            Start Time
                        </label>
                        <input
                            type="time"
                            id="startTime"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label htmlFor="endTime" className="block text-sm font-medium text-slate-700 mb-1">
                            End Time
                        </label>
                        <input
                            type="time"
                            id="endTime"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                        Location
                    </label>
                    <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., Main Lobby"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                </div>

                {/* Calendar Info */}
                <div className="flex items-start gap-3 p-3 bg-pink-50 border border-pink-200 rounded-xl">
                    <CalendarDays className="h-4 w-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-pink-700">
                        This event will also appear on the hub calendar.
                    </p>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !title.trim() || !eventDate}
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Add Event
                    </button>
                </div>
            </form>
        </Modal>
    );
}
