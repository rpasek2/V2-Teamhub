import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Calendar, MapPin, AlignLeft, Users, X, Trophy, HeartHandshake, Star, Clock } from 'lucide-react';
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
    { value: 'practice', label: 'Practice', icon: '🏋️', color: 'bg-blue-500/10 border-blue-500/30 text-blue-600' },
    { value: 'competition', label: 'Comp', icon: '🏆', color: 'bg-purple-500/10 border-purple-500/30 text-purple-600' },
    { value: 'mentorship', label: 'Mentor', icon: '💕', color: 'bg-pink-500/10 border-pink-500/30 text-pink-600' },
    { value: 'camp', label: 'Camp', icon: '🏕️', color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' },
    { value: 'clinic', label: 'Clinic', icon: '🎯', color: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600' },
    { value: 'meeting', label: 'Meeting', icon: '👥', color: 'bg-amber-500/10 border-amber-500/30 text-amber-600' },
    { value: 'social', label: 'Social', icon: '🎉', color: 'bg-green-500/10 border-green-500/30 text-green-600' },
    { value: 'private_lesson', label: 'Private', icon: '👤', color: 'bg-violet-500/10 border-violet-500/30 text-violet-600' },
    { value: 'fundraiser', label: 'Fundraise', icon: '💰', color: 'bg-orange-500/10 border-orange-500/30 text-orange-600' },
    { value: 'other', label: 'Other', icon: '📌', color: 'bg-surface-hover border-line-strong text-body' },
] as const;

// Valid event type values for validation
const VALID_EVENT_TYPES = EVENT_TYPES.map(t => t.value);

// Input length limits
const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_LOCATION_LENGTH = 200;

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
        rsvpEnabled: false,
        isSaveTheDate: false,
        isAllDay: false
    });

    // Types that are automatically considered "save the date" events
    const SAVE_THE_DATE_TYPES = ['competition', 'mentorship', 'camp'];

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
                rsvpEnabled: false,
                isSaveTheDate: false,
                isAllDay: false
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
            // Validate event type against allowed values
            if (!(VALID_EVENT_TYPES as readonly string[]).includes(formData.type)) {
                throw new Error('Invalid event type selected');
            }

            // Validate input lengths
            if (formData.title.length > MAX_TITLE_LENGTH) {
                throw new Error(`Title must be ${MAX_TITLE_LENGTH} characters or less`);
            }
            if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
                throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or less`);
            }
            if (formData.location.length > MAX_LOCATION_LENGTH) {
                throw new Error(`Location must be ${MAX_LOCATION_LENGTH} characters or less`);
            }

            let startDateTime: Date;
            let endDateTime: Date;

            if (formData.isAllDay) {
                // For all-day events, set to midnight and 11:59:59 PM
                startDateTime = new Date(`${formData.startDate}T00:00:00`);
                endDateTime = new Date(`${formData.endDate}T23:59:59`);
            } else {
                startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
                endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
            }

            if (endDateTime <= startDateTime) {
                throw new Error(formData.isAllDay ? 'End date must be on or after start date' : 'End time must be after start time');
            }

            // If this is a competition event, also create a competition record
            if (formData.type === 'competition') {
                const { error: competitionError } = await supabase
                    .from('competitions')
                    .insert({
                        hub_id: hub.id,
                        name: formData.title,
                        start_date: formData.startDate,
                        end_date: formData.endDate,
                        location: formData.location || null,
                        notes: formData.description || null,
                        created_by: user.id
                    });

                if (competitionError) throw competitionError;
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
                    is_all_day: formData.isAllDay,
                    is_save_the_date: formData.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(formData.type),
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
            <div className="relative w-full max-w-lg transform rounded-2xl bg-surface shadow-2xl transition-all max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header with colored accent based on event type */}
                <div className={`relative px-6 py-5 ${selectedType?.color.split(' ')[0] || 'bg-surface-hover'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">{selectedType?.icon}</span>
                            <div>
                                <h3 className="text-lg font-semibold text-heading">Create Event</h3>
                                {initialDate && (
                                    <p className="text-sm text-subtle">
                                        {format(initialDate, 'EEEE, MMMM d, yyyy')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full p-2 text-muted hover:bg-surface/50 hover:text-body transition-colors"
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
                            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4">
                                <div className="flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-600">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Event Type Selection */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">
                                Event Type
                            </label>
                            <div className="grid grid-cols-5 gap-1.5">
                                {EVENT_TYPES.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData,
                                            type: type.value,
                                            // Auto-enable save the date for competition, mentorship, camp
                                            isSaveTheDate: SAVE_THE_DATE_TYPES.includes(type.value)
                                        })}
                                        className={`flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg border-2 transition-all aspect-square ${
                                            formData.type === type.value
                                                ? type.color + ' border-current shadow-sm'
                                                : 'bg-surface border-line text-subtle hover:border-line-strong hover:bg-surface-hover'
                                        }`}
                                    >
                                        <span className="text-lg leading-none">{type.icon}</span>
                                        <span className="text-[10px] font-medium leading-tight">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Competition Warning */}
                            {formData.type === 'competition' && (
                                <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl mt-2">
                                    <Trophy className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-purple-600">
                                        This will also create a competition in the Competitions tab.
                                    </p>
                                </div>
                            )}

                            {/* Mentorship Info */}
                            {formData.type === 'mentorship' && (
                                <div className="flex items-start gap-3 p-3 bg-pink-500/10 border border-pink-500/20 rounded-xl mt-2">
                                    <HeartHandshake className="h-4 w-4 text-pink-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-pink-600">
                                        This will also appear in the Mentorship tab.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Event Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-body mb-2">
                                Event Title
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                maxLength={MAX_TITLE_LENGTH}
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="block w-full rounded-lg border-0 py-2.5 px-3 text-heading bg-surface shadow-sm ring-1 ring-inset ring-line-strong placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm"
                                placeholder="e.g., Team Practice, Parents Meeting..."
                            />
                        </div>

                        {/* Date & Time Section */}
                        <div className="bg-surface-alt rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-body">
                                    <Calendar className="h-4 w-4" />
                                    <span className="text-sm font-medium">Date & Time</span>
                                </div>
                                {/* All Day Toggle */}
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-faint" />
                                    <span className="text-xs font-medium text-subtle">All Day</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={formData.isAllDay}
                                        onClick={() => setFormData({ ...formData, isAllDay: !formData.isAllDay })}
                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                                            formData.isAllDay ? 'bg-accent-600' : 'bg-surface-active'
                                        }`}
                                    >
                                        <span
                                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                                                formData.isAllDay ? 'translate-x-4' : 'translate-x-0'
                                            }`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {formData.isAllDay ? (
                                /* All Day - Just date pickers */
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="startDate" className="block text-xs font-medium text-muted mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            id="startDate"
                                            required
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: formData.endDate < e.target.value ? e.target.value : formData.endDate })}
                                            className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="endDate" className="block text-xs font-medium text-muted mb-1">
                                            End Date
                                        </label>
                                        <input
                                            type="date"
                                            id="endDate"
                                            required
                                            value={formData.endDate}
                                            min={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                            className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                        />
                                    </div>
                                </div>
                            ) : (
                                /* Specific Times - Date + Time pickers */
                                <>
                                    {/* Start */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="startDate" className="block text-xs font-medium text-muted mb-1">
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                id="startDate"
                                                required
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value, endDate: e.target.value })}
                                                className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="startTime" className="block text-xs font-medium text-muted mb-1">
                                                Start Time
                                            </label>
                                            <input
                                                type="time"
                                                id="startTime"
                                                required
                                                value={formData.startTime}
                                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                                className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                            />
                                        </div>
                                    </div>

                                    {/* End */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label htmlFor="endDate" className="block text-xs font-medium text-muted mb-1">
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                id="endDate"
                                                required
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="endTime" className="block text-xs font-medium text-muted mb-1">
                                                End Time
                                            </label>
                                            <input
                                                type="time"
                                                id="endTime"
                                                required
                                                value={formData.endTime}
                                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                                className="block w-full rounded-lg border-0 py-2 px-3 text-heading shadow-sm ring-1 ring-inset ring-line-strong focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm bg-surface"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Location */}
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-body mb-2">
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-faint" />
                                    Location
                                </span>
                            </label>
                            <input
                                type="text"
                                id="location"
                                maxLength={MAX_LOCATION_LENGTH}
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="block w-full rounded-lg border-0 py-2.5 px-3 text-heading bg-surface shadow-sm ring-1 ring-inset ring-line-strong placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm"
                                placeholder="e.g., Main Gym, Conference Room..."
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-body mb-2">
                                <span className="flex items-center gap-2">
                                    <AlignLeft className="h-4 w-4 text-faint" />
                                    Description
                                    <span className="text-faint font-normal">(optional)</span>
                                </span>
                            </label>
                            <textarea
                                id="description"
                                rows={3}
                                maxLength={MAX_DESCRIPTION_LENGTH}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="block w-full rounded-lg border-0 py-2.5 px-3 text-heading bg-surface shadow-sm ring-1 ring-inset ring-line-strong placeholder:text-faint focus:ring-2 focus:ring-inset focus:ring-accent-500 text-sm resize-none"
                                placeholder="Add any additional details about the event..."
                            />
                        </div>

                        {/* RSVP Toggle */}
                        <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-surface rounded-lg shadow-sm">
                                    <Users className="h-5 w-5 text-subtle" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-heading">Enable RSVPs</p>
                                    <p className="text-xs text-muted">Allow members to respond to this event</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.rsvpEnabled}
                                onClick={() => setFormData({ ...formData, rsvpEnabled: !formData.rsvpEnabled })}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 ${
                                    formData.rsvpEnabled ? 'bg-accent-600' : 'bg-surface-active'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                                        formData.rsvpEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>

                        {/* Save the Date Toggle */}
                        <div className="flex items-center justify-between p-4 bg-surface-alt rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-surface rounded-lg shadow-sm">
                                    <Star className="h-5 w-5 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-heading">Save the Date</p>
                                    <p className="text-xs text-muted">Include in season's important events list</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={formData.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(formData.type)}
                                onClick={() => setFormData({ ...formData, isSaveTheDate: !formData.isSaveTheDate })}
                                disabled={SAVE_THE_DATE_TYPES.includes(formData.type)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                    (formData.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(formData.type)) ? 'bg-amber-500' : 'bg-surface-active'
                                }`}
                            >
                                <span
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface shadow ring-0 transition duration-200 ease-in-out ${
                                        (formData.isSaveTheDate || SAVE_THE_DATE_TYPES.includes(formData.type)) ? 'translate-x-5' : 'translate-x-0'
                                    }`}
                                />
                            </button>
                        </div>
                        {SAVE_THE_DATE_TYPES.includes(formData.type) && (
                            <p className="text-xs text-muted -mt-3 ml-1">
                                Competitions, mentorship, and camp events are automatically included.
                            </p>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="sticky bottom-0 bg-surface border-t border-line px-6 py-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-body bg-surface border border-line-strong hover:bg-surface-hover transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-accent-600 hover:bg-accent-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
