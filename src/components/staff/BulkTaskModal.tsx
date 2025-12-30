import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Users, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBulkAssignTask, type StaffWithData } from '../../hooks/useStaffBulk';

interface BulkTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    staffData: StaffWithData[];
    onTasksAssigned: () => void;
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';

export function BulkTaskModal({ isOpen, onClose, hubId, staffData, onTasksAssigned }: BulkTaskModalProps) {
    const { user } = useAuth();
    const { bulkAssignTask, loading } = useBulkAssignTask();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<Priority>('medium');
    const [selectedStaff, setSelectedStaff] = useState<Set<string>>(new Set());

    const toggleStaff = (userId: string) => {
        const newSelected = new Set(selectedStaff);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedStaff(newSelected);
    };

    const selectAll = () => {
        setSelectedStaff(new Set(staffData.map(s => s.user_id)));
    };

    const selectByRole = (role: string) => {
        setSelectedStaff(new Set(staffData.filter(s => s.role === role).map(s => s.user_id)));
    };

    const clearSelection = () => {
        setSelectedStaff(new Set());
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || selectedStaff.size === 0) return;

        const success = await bulkAssignTask({
            hub_id: hubId,
            staff_user_ids: Array.from(selectedStaff),
            title: title.trim(),
            description: description.trim() || undefined,
            due_date: dueDate || undefined,
            priority,
            assigned_by: user?.id,
        });

        if (success) {
            onTasksAssigned();
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
                            <Users className="w-5 h-5 text-mint-600" />
                            <h2 className="text-lg font-semibold text-slate-900">Bulk Assign Task</h2>
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
                        {/* Task Title */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                                Task Title *
                            </label>
                            <input
                                id="title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter task title..."
                                className="input w-full"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
                                Description <span className="text-slate-400">(optional)</span>
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Task details..."
                                rows={2}
                                className="input w-full resize-none"
                            />
                        </div>

                        {/* Due Date & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">
                                    Priority
                                </label>
                                <select
                                    id="priority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as Priority)}
                                    className="input w-full"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="urgent">Urgent</option>
                                </select>
                            </div>
                        </div>

                        {/* Staff Selection */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Assign To *
                            </label>

                            {/* Quick Select Buttons */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                <button
                                    type="button"
                                    onClick={selectAll}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                                >
                                    Select All
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectByRole('coach')}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                                >
                                    Coaches Only
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectByRole('director')}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors"
                                >
                                    Directors Only
                                </button>
                                <button
                                    type="button"
                                    onClick={clearSelection}
                                    className="px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Staff List */}
                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                {staffData.map(staff => (
                                    <label
                                        key={staff.user_id}
                                        className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                                            selectedStaff.has(staff.user_id)
                                                ? 'bg-mint-50'
                                                : 'hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            selectedStaff.has(staff.user_id)
                                                ? 'bg-mint-500 border-mint-500'
                                                : 'border-slate-300'
                                        }`}>
                                            {selectedStaff.has(staff.user_id) && (
                                                <Check className="w-3.5 h-3.5 text-white" />
                                            )}
                                        </div>
                                        <input
                                            type="checkbox"
                                            checked={selectedStaff.has(staff.user_id)}
                                            onChange={() => toggleStaff(staff.user_id)}
                                            className="sr-only"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-slate-900 text-sm">
                                                {staff.profile?.full_name || 'Unknown'}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                                            {staff.role}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            {selectedStaff.size > 0 && (
                                <p className="text-xs text-mint-600 mt-2">
                                    {selectedStaff.size} staff member{selectedStaff.size !== 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>

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
                                disabled={loading || !title.trim() || selectedStaff.size === 0}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Assigning...
                                    </>
                                ) : (
                                    `Assign to ${selectedStaff.size} Staff`
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
