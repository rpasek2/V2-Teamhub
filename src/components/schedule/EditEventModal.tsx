import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Palette, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { RotationEvent } from '../../types';

interface EditEventModalProps {
    event: RotationEvent;
    onClose: () => void;
    onSaved: () => void;
}

// Comprehensive color palette organized by hue
const PRESET_COLORS = [
    // Reds
    { name: 'Red', hex: '#ef4444' },
    { name: 'Rose', hex: '#f43f5e' },
    { name: 'Crimson', hex: '#dc2626' },
    { name: 'Coral', hex: '#f87171' },

    // Oranges
    { name: 'Orange', hex: '#f97316' },
    { name: 'Amber', hex: '#f59e0b' },
    { name: 'Tangerine', hex: '#fb923c' },
    { name: 'Peach', hex: '#fdba74' },

    // Yellows
    { name: 'Yellow', hex: '#eab308' },
    { name: 'Gold', hex: '#ca8a04' },
    { name: 'Lemon', hex: '#facc15' },
    { name: 'Honey', hex: '#fbbf24' },

    // Greens
    { name: 'Lime', hex: '#84cc16' },
    { name: 'Green', hex: '#22c55e' },
    { name: 'Emerald', hex: '#10b981' },
    { name: 'Teal', hex: '#14b8a6' },

    // Cyans
    { name: 'Cyan', hex: '#06b6d4' },
    { name: 'Aqua', hex: '#22d3d1' },
    { name: 'Turquoise', hex: '#2dd4bf' },
    { name: 'Ocean', hex: '#0891b2' },

    // Blues
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Blue', hex: '#3b82f6' },
    { name: 'Indigo', hex: '#6366f1' },
    { name: 'Navy', hex: '#4f46e5' },

    // Purples
    { name: 'Violet', hex: '#8b5cf6' },
    { name: 'Purple', hex: '#a855f7' },
    { name: 'Grape', hex: '#9333ea' },
    { name: 'Lavender', hex: '#c084fc' },

    // Pinks
    { name: 'Pink', hex: '#ec4899' },
    { name: 'Magenta', hex: '#d946ef' },
    { name: 'Fuchsia', hex: '#e879f9' },
    { name: 'Blush', hex: '#f472b6' },

    // Neutrals
    { name: 'Slate', hex: '#64748b' },
    { name: 'Gray', hex: '#6b7280' },
    { name: 'Stone', hex: '#78716c' },
    { name: 'Brown', hex: '#92400e' },
];

export function EditEventModal({ event, onClose, onSaved }: EditEventModalProps) {
    const [name, setName] = useState(event.name);
    const [color, setColor] = useState(event.color);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setError('');
        setSaving(true);

        const { error: updateError } = await supabase
            .from('rotation_events')
            .update({
                name: name.trim(),
                color
            })
            .eq('id', event.id);

        if (updateError) {
            console.error('Error updating event:', updateError);
            if (updateError.message.includes('duplicate')) {
                setError('An event with this name already exists');
            } else {
                setError('Failed to update event');
            }
            setSaving(false);
            return;
        }

        onSaved();
    };

    const handleDelete = async () => {
        setDeleting(true);

        const { error: deleteError } = await supabase
            .from('rotation_events')
            .delete()
            .eq('id', event.id);

        if (deleteError) {
            console.error('Error deleting event:', deleteError);
            setError('Failed to delete event. It may be in use by rotation blocks.');
            setDeleting(false);
            setShowDeleteConfirm(false);
            return;
        }

        onSaved();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-lg w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 rounded-lg">
                            <Palette className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Edit Event</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Event Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Event Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Dance, Trampoline, Pit Work"
                            required
                            className="input w-full"
                        />
                    </div>

                    {/* Color Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Color
                        </label>
                        <div className="grid grid-cols-8 sm:grid-cols-11 gap-1.5">
                            {PRESET_COLORS.map(preset => (
                                <button
                                    key={preset.hex}
                                    type="button"
                                    onClick={() => setColor(preset.hex)}
                                    title={preset.name}
                                    className={`w-8 h-8 rounded-md transition-all ${
                                        color === preset.hex
                                            ? 'ring-2 ring-offset-1 ring-slate-500 scale-110'
                                            : 'hover:scale-110 hover:ring-1 hover:ring-slate-300'
                                    }`}
                                    style={{ backgroundColor: preset.hex }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Preview
                        </label>
                        <div
                            className="inline-flex px-4 py-2 rounded-lg text-sm font-medium border-2"
                            style={{
                                backgroundColor: `${color}20`,
                                borderColor: color,
                                color: color
                            }}
                        >
                            {name || 'Event Name'}
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && !event.is_default && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-700 mb-3">
                                Are you sure you want to delete this event? Existing rotation blocks using this event will keep their name but lose the event reference.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="btn-danger text-sm"
                                >
                                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Yes, Delete
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="btn-secondary text-sm"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between pt-4">
                        <div>
                            {!event.is_default && !showDeleteConfirm && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="btn-ghost text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !name.trim()}
                                className="btn-primary"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
