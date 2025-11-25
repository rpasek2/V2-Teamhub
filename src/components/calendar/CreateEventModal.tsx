import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Calendar, MapPin, AlignLeft, Users, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface CreateEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEventCreated: () => void;
    initialDate?: Date;
}

const EVENT_TYPES = [
    { value: 'practice', label: 'Practice', icon: '🏋️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
    { value: 'competition', label: 'Competition', icon: '🏆', color: 'bg-purple-100 border-purple-300 text-purple-700' },
    { value: 'meeting', label: 'Meeting', icon: '👥', color: 'bg-amber-100 border-amber-300 text-amber-700' },
    { value: 'social', label: 'Social', icon: '🎉', color: 'bg-green-100 border-green-300 text-green-700' },
    { value: 'other', label: 'Other', icon: '📌', color: 'bg-slate-100 border-slate-300 text-slate-700' },
];

export function CreateEventModal({ isOpen, onClose, onEventCreated, initialDate }: CreateEventModalProps) {
    const { hub } = useHub();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getInitialDate = () => {
        const date = initialDate || new Date();
        return date.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: getInitialDate(),
        startTime: '09:00',
        endDate: getInitialDate(),
        endTime: '10:00',
        location: '',
        type: 'practice',
        rsvpEnabled: true
    });

    // Update dates when initialDate changes
    useEffect(() => {
        if (initialDate) {
            const dateStr = initialDate.toISOString().split('T')[0];
            setFormData(prev => ({
                ...prev,
                startDate: dateStr,
                endDate: dateStr
            }));
        }
    }, [initialDate]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            const dateStr = getInitialDate();
            setFormData({
                title: '',
                description: '',
                startDate: dateStr,
                startTime: '09:00',
                endDate: dateStr,
                endTime: '10:00',
                location: '',
                type: 'practice',
                rsvpEnabled: true
            });
            setError(null);
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

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
                    description: formData.description || null,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    location: formData.location || null,
                    type: formData.type,
                    rsvp_enabled: formData.rsvpEnabled,
                    created_by: user.id
                });

            if (insertError) throw insertError;

            onEventCreated();
            onClose();
        } catch (err: any) {
            console.error('Error creating event:', err);
            setError(err.message || 'Failed to create event');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const selectedType = EVENT_TYPES.find(t => t.value === formData.type);

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg transform rounded-2xl bg-white shadow-2xl transition-all max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with colored accent based on event type */}
                <div className={`relative px-6 py-5 ${selectedType?.color.split(' ')[0] || 'bg-slate-100'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedType?.icon}</span>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Create Event</h3>
                                {initialDate && (
                                    <p className="text-sm text-slate-600">
                                        {format(initialDate, 'EEEE, MMMM d, yyyy')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-slate-500 hover:bg-white/50 hover:text-slate-700 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-5">
                        {/* Error Alert */}
                        {error && (
                            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Event Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Event Type
                            </label>
                            <div className="grid grid-cols-5 gap-2">
                                {EVENT_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: type.value })}
                                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                                            formData.type === type.value
                                                ? type.color + ' border-current shadow-sm'
                                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span className="text-xl">{type.icon}</span>
                                        <span className="text-xs font-medium">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Event Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-2">
                                Event Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm"
                                placeholder="e.g., Team Practice, Parents Meeting..."
                            />
                        </div>

                        {/* Date & Time Section */}
                        <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                            <div className="flex items-center gap-2 text-slate-700">
                                <Calendar className="h-4 w-4" />
                                <span className="text-sm font-medium">Date & Time</span>
                            </div>

                            {/* Start */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="startDate" className="block text-xs font-medium text-slate-500 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        id="startDate"
                                        required
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="startTime" className="block text-xs font-medium text-slate-500 mb-1">
                                        Start Time
                                    </label>
                                    <input
                                        type="time"
                                        id="startTime"
                                        required
                                        value={formData.startTime}
                                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                    />
                                </div>
                            </div>

                            {/* End */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="endDate" className="block text-xs font-medium text-slate-500 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        required
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="endTime" className="block text-xs font-medium text-slate-500 mb-1">
                                        End Time
                                    </label>
                                    <input
                                        type="time"
                                        id="endTime"
                                        required
                                        value={formData.endTime}
                                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        className="block w-full rounded-lg border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-slate-400" />
                                    Location
                                </span>
                            </label>
                            <input
                                type="text"
                                id="location"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-500 text-sm"
                                placeholder="e.g., Main Gym, Conference Room..."
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
                                <span className="flex items-center gap-2">
                                    <AlignLeft className="h-4 w-4 text-slate-400" />
                                    Description
                                    <span className="text-slate-400 font-normal">(optional)</span>
                                </span>
                            </label>
                            <textarea
                                id="description"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                                aria-checked={formData.rsvpEnabled}
                                onClick={() => setFormData({ ...formData, rsvpEnabled: !formData.rsvpEnabled })}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                                    formData.rsvpEnabled ? 'bg-brand-600' : 'bg-slate-200'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                        formData.rsvpEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Event'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
