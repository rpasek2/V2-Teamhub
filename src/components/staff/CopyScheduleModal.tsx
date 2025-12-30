import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Copy, Check, Clock } from 'lucide-react';
import { useCopySchedule, type StaffWithData } from '../../hooks/useStaffBulk';

interface CopyScheduleModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    staffData: StaffWithData[];
    onScheduleCopied: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CopyScheduleModal({ isOpen, onClose, hubId, staffData, onScheduleCopied }: CopyScheduleModalProps) {
    const { copySchedule, loading } = useCopySchedule();

    const [sourceUserId, setSourceUserId] = useState<string>('');
    const [selectedTargets, setSelectedTargets] = useState<Set<string>>(new Set());
    const [replaceMode, setReplaceMode] = useState(true);

    // Get source staff's schedule
    const sourceStaff = useMemo(() =>
        staffData.find(s => s.user_id === sourceUserId),
        [staffData, sourceUserId]
    );

    // Filter out source from target options
    const targetStaffOptions = useMemo(() =>
        staffData.filter(s => s.user_id !== sourceUserId),
        [staffData, sourceUserId]
    );

    const toggleTarget = (userId: string) => {
        const newSelected = new Set(selectedTargets);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedTargets(newSelected);
    };

    const selectAllTargets = () => {
        setSelectedTargets(new Set(targetStaffOptions.map(s => s.user_id)));
    };

    const clearTargets = () => {
        setSelectedTargets(new Set());
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Group source schedules by day
    const schedulesByDay = useMemo(() => {
        if (!sourceStaff) return [];
        return DAYS.map((day, index) => ({
            day,
            blocks: sourceStaff.schedules.filter(s => s.day_of_week === index),
        }));
    }, [sourceStaff]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceUserId || selectedTargets.size === 0) return;

        const success = await copySchedule({
            hub_id: hubId,
            source_user_id: sourceUserId,
            target_user_ids: Array.from(selectedTargets),
            replace: replaceMode,
        });

        if (success) {
            onScheduleCopied();
        }
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                            <Copy className="w-5 h-5 text-mint-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Copy Schedule</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        {/* Source Selection */}
                        <div>
                            <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-1">
                                Copy from *
                            </label>
                            <select
                                id="source"
                                value={sourceUserId}
                                onChange={(e) => {
                                    setSourceUserId(e.target.value);
                                    setSelectedTargets(new Set()); // Clear targets when source changes
                                }}
                                className="input w-full"
                                required
                            >
                                <option value="">Select staff member...</option>
                                {staffData.map(staff => (
                                    <option key={staff.user_id} value={staff.user_id}>
                                        {staff.profile?.full_name || 'Unknown'} ({staff.schedules.length} schedule blocks)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Schedule Preview */}
                        {sourceStaff && (
                            <div className="bg-slate-50 rounded-lg p-3">
                                <p className="text-sm font-medium text-slate-700 mb-2">Schedule Preview:</p>
                                {sourceStaff.schedules.length === 0 ? (
                                    <p className="text-sm text-slate-500 italic">No schedule blocks to copy</p>
                                ) : (
                                    <div className="space-y-1">
                                        {schedulesByDay.filter(d => d.blocks.length > 0).map(({ day, blocks }) => (
                                            <div key={day} className="flex items-start gap-2 text-sm">
                                                <span className="w-10 font-medium text-slate-600">{day}:</span>
                                                <div className="flex flex-wrap gap-1">
                                                    {blocks.map(block => (
                                                        <span
                                                            key={block.id}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded border border-slate-200 text-xs"
                                                        >
                                                            <Clock className="w-3 h-3 text-teal-500" />
                                                            {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                                            <span className="text-slate-500">({block.role_label})</span>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Target Selection */}
                        {sourceUserId && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Apply to *
                                </label>

                                {/* Quick Select Buttons */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        type="button"
                                        onClick={selectAllTargets}
                                        className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                    >
                                        Select All
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearTargets}
                                        className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {/* Target Staff List */}
                                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {targetStaffOptions.map(staff => (
                                        <label
                                            key={staff.user_id}
                                            className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                                selectedTargets.has(staff.user_id)
                                                    ? 'bg-mint-50'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                selectedTargets.has(staff.user_id)
                                                    ? 'bg-mint-500 border-mint-500'
                                                    : 'border-slate-300'
                                            }`}>
                                                {selectedTargets.has(staff.user_id) && (
                                                    <Check className="w-3.5 h-3.5 text-white" />
                                                )}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedTargets.has(staff.user_id)}
                                                onChange={() => toggleTarget(staff.user_id)}
                                                className="sr-only"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 text-sm">
                                                    {staff.profile?.full_name || 'Unknown'}
                                                </p>
                                                {staff.schedules.length > 0 && (
                                                    <p className="text-xs text-slate-500">
                                                        Has {staff.schedules.length} existing schedule block{staff.schedules.length !== 1 ? 's' : ''}
                                                    </p>
                                                )}
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                                                {staff.role}
                                            </span>
                                        </label>
                                    ))}
                                </div>

                                {selectedTargets.size > 0 && (
                                    <p className="text-xs text-mint-600 mt-2">
                                        {selectedTargets.size} staff member{selectedTargets.size !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Mode Selection */}
                        {sourceUserId && selectedTargets.size > 0 && (
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-700">
                                    Copy Mode
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={replaceMode}
                                            onChange={() => setReplaceMode(true)}
                                            className="mt-0.5 text-mint-600 focus:ring-mint-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">Replace existing schedules</p>
                                            <p className="text-xs text-slate-500">Delete current schedules and replace with new ones</p>
                                        </div>
                                    </label>
                                    <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={!replaceMode}
                                            onChange={() => setReplaceMode(false)}
                                            className="mt-0.5 text-mint-600 focus:ring-mint-500"
                                        />
                                        <div>
                                            <p className="font-medium text-slate-900 text-sm">Merge with existing schedules</p>
                                            <p className="text-xs text-slate-500">Add new schedule blocks without removing existing ones</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="btn-ghost"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={loading || !sourceUserId || selectedTargets.size === 0 || (sourceStaff?.schedules.length === 0)}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Copying...
                                    </>
                                ) : (
                                    `Apply to ${selectedTargets.size} Staff`
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
