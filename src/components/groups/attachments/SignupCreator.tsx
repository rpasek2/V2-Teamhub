import { useState } from 'react';
import { X, Plus, GripVertical, ClipboardList, Users } from 'lucide-react';
import type { SignupSlot, SignupSettings } from '../../../types';

interface SignupCreatorProps {
    onSave: (data: { title: string; description?: string; slots: SignupSlot[]; settings?: SignupSettings }) => void;
    onCancel: () => void;
    initialData?: { title: string; description?: string; slots: SignupSlot[]; settings?: SignupSettings };
}

export function SignupCreator({ onSave, onCancel, initialData }: SignupCreatorProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [slots, setSlots] = useState<SignupSlot[]>(initialData?.slots || [{ name: '' }, { name: '' }]);
    const [allowUserSlots, setAllowUserSlots] = useState(initialData?.settings?.allowUserSlots || false);

    const handleAddSlot = () => {
        if (slots.length < 20) {
            setSlots([...slots, { name: '' }]);
        }
    };

    const handleRemoveSlot = (index: number) => {
        if (slots.length > 1) {
            setSlots(slots.filter((_, i) => i !== index));
        }
    };

    const handleSlotChange = (index: number, field: keyof SignupSlot, value: string | number | undefined) => {
        const newSlots = [...slots];
        newSlots[index] = { ...newSlots[index], [field]: value };
        setSlots(newSlots);
    };

    const handleSave = () => {
        const filledSlots = slots.filter(s => s.name.trim() !== '');
        // Allow saving with no slots if user slots are enabled (potluck style)
        const hasValidSlots = filledSlots.length >= 1 || allowUserSlots;
        if (title.trim() && hasValidSlots) {
            onSave({
                title: title.trim(),
                description: description.trim() || undefined,
                slots: filledSlots,
                settings: allowUserSlots ? { allowUserSlots: true } : undefined
            });
        }
    };

    // Valid if has title AND either has slots OR allows user slots
    const isValid = title.trim() && (slots.filter(s => s.name.trim()).length >= 1 || allowUserSlots);

    return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-emerald-100 border-b border-emerald-200">
                <ClipboardList className="h-4 w-4 text-emerald-600" />
                <h5 className="text-sm font-semibold text-emerald-700">Create Sign-Up</h5>
                <button
                    type="button"
                    onClick={onCancel}
                    className="ml-auto p-1 text-emerald-400 hover:text-emerald-600 rounded"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Title <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Snack Sign-Up for Saturday Meet"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Description <span className="text-slate-400">(optional)</span>
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Add any additional details..."
                        rows={2}
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow resize-none"
                    />
                </div>

                {/* Slots */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Sign-Up Slots
                    </label>
                    <div className="space-y-2">
                        {slots.map((slot, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={slot.name}
                                    onChange={(e) => handleSlotChange(index, 'name', e.target.value)}
                                    placeholder={`Slot ${index + 1} (e.g., Fruit, Drinks)`}
                                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow"
                                />
                                <input
                                    type="number"
                                    value={slot.maxSignups || ''}
                                    onChange={(e) => handleSlotChange(index, 'maxSignups', e.target.value ? parseInt(e.target.value) : undefined)}
                                    placeholder="Max"
                                    min={1}
                                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-sm shadow-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow text-center"
                                    title="Maximum sign-ups (leave empty for unlimited)"
                                />
                                {slots.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSlot(index)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {slots.length < 20 && (
                        <button
                            type="button"
                            onClick={handleAddSlot}
                            className="mt-2 inline-flex items-center text-sm text-emerald-600 hover:text-emerald-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add slot
                        </button>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                        Leave "Max" empty for unlimited sign-ups per slot
                    </p>
                </div>

                {/* Allow User Slots Option */}
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allowUserSlots}
                            onChange={(e) => setAllowUserSlots(e.target.checked)}
                            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-emerald-600" />
                                <span className="text-sm font-medium text-slate-900">Allow members to add items</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Perfect for potlucks! Members can add their own items and sign up to bring them.
                            </p>
                        </div>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Sign-Up
                    </button>
                </div>
            </div>
        </div>
    );
}
