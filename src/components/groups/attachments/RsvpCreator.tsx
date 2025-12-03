import { useState } from 'react';
import { X, CalendarCheck } from 'lucide-react';

interface RsvpCreatorProps {
    onSave: (data: { title: string; date?: string; time?: string; location?: string }) => void;
    onCancel: () => void;
    initialData?: { title: string; date?: string; time?: string; location?: string };
}

export function RsvpCreator({ onSave, onCancel, initialData }: RsvpCreatorProps) {
    const [title, setTitle] = useState(initialData?.title || '');
    const [date, setDate] = useState(initialData?.date || '');
    const [time, setTime] = useState(initialData?.time || '');
    const [location, setLocation] = useState(initialData?.location || '');

    const handleSave = () => {
        if (title.trim()) {
            onSave({
                title: title.trim(),
                date: date || undefined,
                time: time || undefined,
                location: location.trim() || undefined
            });
        }
    };

    const isValid = title.trim();

    return (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-100 border-b border-blue-200">
                <CalendarCheck className="h-4 w-4 text-blue-600" />
                <h5 className="text-sm font-semibold text-blue-700">Create RSVP Request</h5>
                <button
                    type="button"
                    onClick={onCancel}
                    className="ml-auto p-1 text-blue-400 hover:text-blue-600 rounded"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="p-4 space-y-4">
                {/* Title */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Event/Activity Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Team Pizza Party"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                    />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Date <span className="text-slate-400">(optional)</span>
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Time <span className="text-slate-400">(optional)</span>
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Location <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g., Main Gym"
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-shadow"
                    />
                </div>

                {/* Preview */}
                <div className="bg-blue-100/50 rounded-lg p-3 text-sm text-blue-800">
                    <p className="font-medium">Members will be asked to respond:</p>
                    <p className="text-blue-600 mt-1">Going / Not Going / Maybe</p>
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
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add RSVP
                    </button>
                </div>
            </div>
        </div>
    );
}
