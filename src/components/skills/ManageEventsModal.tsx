import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, ChevronUp, ChevronDown, AlertCircle, GripVertical, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SkillEvent, SkillEventsConfig } from '../../types';
import { PREDEFINED_SKILL_EVENTS, DEFAULT_WAG_SKILL_EVENTS, DEFAULT_MAG_SKILL_EVENTS } from '../../types';

interface ManageEventsModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    gender: 'Female' | 'Male';
    currentEvents: SkillEvent[];
    onEventsUpdated: (events: SkillEvent[]) => void;
}

export function ManageEventsModal({
    isOpen,
    onClose,
    hubId,
    gender,
    currentEvents,
    onEventsUpdated
}: ManageEventsModalProps) {
    const [localEvents, setLocalEvents] = useState<SkillEvent[]>([]);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [customEventName, setCustomEventName] = useState('');
    const [customEventLabel, setCustomEventLabel] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLocalEvents([...currentEvents]);
    }, [currentEvents]);

    // Get available predefined events that aren't already added
    const availablePredefinedEvents = PREDEFINED_SKILL_EVENTS.filter(
        predefined => !localEvents.some(e => e.id === predefined.id)
    );

    const handleAddPredefinedEvent = (event: SkillEvent) => {
        setLocalEvents([...localEvents, event]);
        setShowAddMenu(false);
    };

    const handleAddCustomEvent = () => {
        if (!customEventName.trim()) return;

        const id = customEventName.trim().toLowerCase().replace(/\s+/g, '_');
        const label = customEventLabel.trim() || customEventName.trim().substring(0, 4).toUpperCase();

        // Check for duplicate ID
        if (localEvents.some(e => e.id === id)) {
            setError('An event with this name already exists');
            return;
        }

        const newEvent: SkillEvent = {
            id,
            label,
            fullName: customEventName.trim()
        };

        setLocalEvents([...localEvents, newEvent]);
        setCustomEventName('');
        setCustomEventLabel('');
        setShowAddMenu(false);
    };

    const handleRemoveEvent = (eventId: string) => {
        if (localEvents.length <= 1) {
            setError('You must have at least one event');
            return;
        }
        setLocalEvents(localEvents.filter(e => e.id !== eventId));
    };

    const handleMoveEvent = (eventId: string, direction: 'up' | 'down') => {
        const index = localEvents.findIndex(e => e.id === eventId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localEvents.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newEvents = [...localEvents];
        const [moved] = newEvents.splice(index, 1);
        newEvents.splice(newIndex, 0, moved);

        setLocalEvents(newEvents);
    };

    const handleSave = async () => {
        if (localEvents.length === 0) {
            setError('You must have at least one event');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // First fetch current hub settings
            const { data: hubData, error: fetchError } = await supabase
                .from('hubs')
                .select('settings')
                .eq('id', hubId)
                .single();

            if (fetchError) throw fetchError;

            const currentSettings = hubData?.settings || {};
            const currentSkillEvents: SkillEventsConfig = currentSettings.skillEvents || {};

            // Update the events for the current gender
            const updatedSkillEvents: SkillEventsConfig = {
                ...currentSkillEvents,
                [gender]: localEvents
            };

            // Save back to hub settings
            const { error: updateError } = await supabase
                .from('hubs')
                .update({
                    settings: {
                        ...currentSettings,
                        skillEvents: updatedSkillEvents
                    }
                })
                .eq('id', hubId);

            if (updateError) throw updateError;

            onEventsUpdated(localEvents);
            onClose();
        } catch (err: any) {
            console.error('Error saving events:', err);
            setError(err.message || 'Failed to save events');
        } finally {
            setSaving(false);
        }
    };

    const handleResetToDefaults = () => {
        const defaults = gender === 'Female' ? DEFAULT_WAG_SKILL_EVENTS : DEFAULT_MAG_SKILL_EVENTS;
        setLocalEvents([...defaults]);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-lg transform rounded-xl bg-surface shadow-2xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-heading">
                                Manage Events
                            </h2>
                            <p className="text-sm text-muted">
                                {gender === 'Female' ? 'Girls' : 'Boys'} - Skill Tracking Events
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-faint hover:bg-surface-hover hover:text-muted"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-red-600">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Current Events List */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-medium text-body">
                                    Active Events ({localEvents.length})
                                </label>
                                <button
                                    onClick={handleResetToDefaults}
                                    className="text-xs text-muted hover:text-body"
                                >
                                    Reset to defaults
                                </button>
                            </div>

                            {localEvents.length === 0 ? (
                                <div className="rounded-lg border-2 border-dashed border-line p-8 text-center">
                                    <p className="text-sm text-muted">
                                        No events configured. Add events below.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {localEvents.map((event, index) => (
                                        <div
                                            key={event.id}
                                            className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2 hover:bg-surface-hover"
                                        >
                                            <div className="flex flex-col items-center text-faint">
                                                <GripVertical className="h-5 w-5" />
                                            </div>

                                            {/* Event Badge */}
                                            <div className="w-12 rounded bg-indigo-500/10 px-2 py-1 text-center text-xs font-semibold text-indigo-600">
                                                {event.label}
                                            </div>

                                            {/* Event Name */}
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-medium text-heading truncate">
                                                    {event.fullName}
                                                </span>
                                            </div>

                                            {/* Move Buttons */}
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleMoveEvent(event.id, 'up')}
                                                    disabled={index === 0}
                                                    className="rounded p-1 text-faint hover:bg-surface-hover hover:text-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move up"
                                                >
                                                    <ChevronUp className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveEvent(event.id, 'down')}
                                                    disabled={index === localEvents.length - 1}
                                                    className="rounded p-1 text-faint hover:bg-surface-hover hover:text-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                                                    title="Move down"
                                                >
                                                    <ChevronDown className="h-4 w-4" />
                                                </button>
                                            </div>

                                            {/* Delete Button */}
                                            <button
                                                onClick={() => handleRemoveEvent(event.id)}
                                                className="rounded p-1.5 text-faint hover:bg-red-500/10 hover:text-red-600"
                                                title="Remove event"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Add Event Section */}
                        <div className="border-t border-line pt-4">
                            {!showAddMenu ? (
                                <button
                                    onClick={() => setShowAddMenu(true)}
                                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong px-4 py-3 text-sm font-medium text-subtle hover:border-line-strong hover:bg-surface-hover"
                                >
                                    <Plus className="h-4 w-4" />
                                    Add Event
                                </button>
                            ) : (
                                <div className="space-y-4">
                                    {/* Predefined Events */}
                                    {availablePredefinedEvents.length > 0 && (
                                        <div>
                                            <label className="text-xs font-medium text-muted uppercase tracking-wide">
                                                Predefined Events
                                            </label>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {availablePredefinedEvents.map(event => (
                                                    <button
                                                        key={event.id}
                                                        onClick={() => handleAddPredefinedEvent(event)}
                                                        className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-body hover:border-accent-300 hover:bg-accent-500/10"
                                                    >
                                                        <span className="font-medium">{event.label}</span>
                                                        <span className="text-muted">{event.fullName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom Event */}
                                    <div>
                                        <label className="text-xs font-medium text-muted uppercase tracking-wide">
                                            Custom Event
                                        </label>
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                type="text"
                                                value={customEventName}
                                                onChange={(e) => setCustomEventName(e.target.value)}
                                                placeholder="Event name (e.g., Dance)"
                                                className="flex-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-heading focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                                            />
                                            <input
                                                type="text"
                                                value={customEventLabel}
                                                onChange={(e) => setCustomEventLabel(e.target.value.toUpperCase().slice(0, 4))}
                                                placeholder="Label"
                                                maxLength={4}
                                                className="w-20 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-heading text-center focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                                            />
                                            <button
                                                onClick={handleAddCustomEvent}
                                                disabled={!customEventName.trim()}
                                                className="rounded-lg bg-accent-600 px-3 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                                            >
                                                <Check className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            setShowAddMenu(false);
                                            setCustomEventName('');
                                            setCustomEventLabel('');
                                        }}
                                        className="text-sm text-muted hover:text-body"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        <p className="mt-4 text-xs text-muted">
                            Changes will affect which events appear in the Skills tab. Existing skill data is preserved.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 border-t border-line px-6 py-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-surface-hover px-4 py-2 text-sm font-medium text-body hover:bg-surface-active"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || localEvents.length === 0}
                            className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
