import { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import type { RotationEvent } from '../../types';
import { EditEventModal } from './EditEventModal';

interface EventPaletteProps {
    events: RotationEvent[];
    selectedEvent: RotationEvent | null;
    onSelectEvent: (event: RotationEvent | null) => void;
    onAddCustom: () => void;
    onEventUpdated: () => void;
    canManage: boolean;
}

export function EventPalette({
    events,
    selectedEvent,
    onSelectEvent,
    onAddCustom,
    onEventUpdated,
    canManage
}: EventPaletteProps) {
    const [editingEvent, setEditingEvent] = useState<RotationEvent | null>(null);
    // Convert hex to Tailwind-style classes based on the color
    const getEventStyle = (event: RotationEvent, isSelected: boolean) => {
        const baseStyle = {
            backgroundColor: `${event.color}20`, // 20% opacity
            borderColor: event.color,
            color: event.color
        };

        if (isSelected) {
            return {
                ...baseStyle,
                backgroundColor: `${event.color}40`, // 40% opacity when selected
                boxShadow: `0 0 0 2px ${event.color}`
            };
        }

        return baseStyle;
    };

    return (
        <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-700">
                    Events
                    {selectedEvent && (
                        <span className="text-slate-400 font-normal ml-2">
                            — Click on grid to place
                        </span>
                    )}
                </h3>
                {canManage && (
                    <button
                        onClick={onAddCustom}
                        className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Custom Event
                    </button>
                )}
            </div>

            <div className="flex flex-wrap gap-2">
                {events.map(event => {
                    const isSelected = selectedEvent?.id === event.id;
                    return (
                        <div key={event.id} className="relative group">
                            <button
                                onClick={() => onSelectEvent(isSelected ? null : event)}
                                style={getEventStyle(event, isSelected)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all ${
                                    isSelected ? 'ring-2 ring-offset-1' : 'hover:opacity-80'
                                } ${canManage ? 'pr-7' : ''}`}
                            >
                                {event.name}
                            </button>
                            {canManage && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingEvent(event);
                                    }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/30 transition-opacity"
                                    title="Edit color"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    );
                })}

                {events.length === 0 && (
                    <p className="text-sm text-slate-400">No events configured</p>
                )}
            </div>

            {selectedEvent && (
                <p className="text-xs text-slate-500 mt-3">
                    Click and drag on the grid below to create a "{selectedEvent.name}" rotation block.
                    Click this event again to deselect.
                </p>
            )}

            {/* Edit Event Modal */}
            {editingEvent && (
                <EditEventModal
                    event={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSaved={() => {
                        onEventUpdated();
                        setEditingEvent(null);
                    }}
                />
            )}
        </div>
    );
}
