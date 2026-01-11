import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, Loader2, Palette } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface CustomEventModalProps {
    isOpen: boolean;
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

export function CustomEventModal({ isOpen, onClose, onSaved }: CustomEventModalProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    const [name, setName] = useState('');
    const [color, setColor] = useState('#10b981');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hubId || !name.trim()) return;

        setError('');
        setSaving(true);

        // Get highest display_order
        const { data: existing } = await supabase
            .from('rotation_events')
            .select('display_order')
            .eq('hub_id', hubId)
            .order('display_order', { ascending: false })
            .limit(1);

        const nextOrder = (existing?.[0]?.display_order ?? -1) + 1;

        const { error: insertError } = await supabase
            .from('rotation_events')
            .insert({
                hub_id: hubId,
                name: name.trim(),
                color,
                is_default: false,
                display_order: nextOrder,
                created_by: user?.id
            });

        if (insertError) {
            console.error('Error creating event:', insertError);
            if (insertError.message.includes('duplicate')) {
                setError('An event with this name already exists');
            } else {
                setError('Failed to create event');
            }
            setSaving(false);
            return;
        }

        await onSaved();
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-lg w-full mx-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-100 rounded-lg">
                            <Palette className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Create Custom Event</h2>
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

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
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
                            Create Event
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
