import { useState, useMemo } from 'react';
import { Plus, Filter, Circle, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import type { StaffWithData, Task } from '../../hooks/useStaffBulk';
import { useBulkUpdateTasks } from '../../hooks/useStaffBulk';
import { BulkTaskModal } from './BulkTaskModal';

interface TeamTasksViewProps {
    hubId: string;
    staffData: StaffWithData[];
    onDataChanged: () => void;
}

type StatusFilter = 'all' | 'pending' | 'in_progress' | 'completed';
type PriorityFilter = 'all' | 'low' | 'medium' | 'high' | 'urgent';
type SortBy = 'due_date' | 'priority' | 'staff';

interface FlattenedTask extends Task {
    staffName: string;
    staffId: string;
}

export function TeamTasksView({ hubId, staffData, onDataChanged }: TeamTasksViewProps) {
    const [staffFilter, setStaffFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('due_date');
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    const { bulkDeleteTasks, loading: bulkLoading } = useBulkUpdateTasks();

    // Flatten all tasks with staff info
    const allTasks: FlattenedTask[] = useMemo(() => {
        const tasks: FlattenedTask[] = [];
        staffData.forEach(staff => {
            staff.tasks.forEach(task => {
                tasks.push({
                    ...task,
                    staffName: staff.profile?.full_name || 'Unknown',
                    staffId: staff.user_id,
                });
            });
        });
        return tasks;
    }, [staffData]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        return allTasks.filter(task => {
            if (staffFilter !== 'all' && task.staffId !== staffFilter) return false;
            if (statusFilter !== 'all' && task.status !== statusFilter) return false;
            if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
            return true;
        });
    }, [allTasks, staffFilter, statusFilter, priorityFilter]);

    // Sort tasks
    const sortedTasks = useMemo(() => {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

        return [...filteredTasks].sort((a, b) => {
            switch (sortBy) {
                case 'due_date':
                    if (!a.due_date && !b.due_date) return 0;
                    if (!a.due_date) return 1;
                    if (!b.due_date) return -1;
                    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                case 'priority':
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                case 'staff':
                    return a.staffName.localeCompare(b.staffName);
                default:
                    return 0;
            }
        });
    }, [filteredTasks, sortBy]);

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'urgent': return 'text-red-600 bg-red-50';
            case 'high': return 'text-orange-600 bg-orange-50';
            case 'medium': return 'text-amber-600 bg-amber-50';
            case 'low': return 'text-slate-600 bg-slate-50';
        }
    };

    const getStatusIcon = (status: Task['status']) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
            case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
            case 'pending': return <Circle className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusLabel = (status: Task['status']) => {
        switch (status) {
            case 'completed': return 'Completed';
            case 'in_progress': return 'In Progress';
            case 'pending': return 'Pending';
        }
    };

    const toggleTaskSelection = (taskId: string) => {
        const newSelected = new Set(selectedTasks);
        if (newSelected.has(taskId)) {
            newSelected.delete(taskId);
        } else {
            newSelected.add(taskId);
        }
        setSelectedTasks(newSelected);
    };

    const selectAllVisible = () => {
        const newSelected = new Set(selectedTasks);
        sortedTasks.forEach(task => newSelected.add(task.id));
        setSelectedTasks(newSelected);
    };

    const clearSelection = () => {
        setSelectedTasks(new Set());
    };

    const handleBulkDelete = async () => {
        if (selectedTasks.size === 0) return;
        if (!confirm(`Delete ${selectedTasks.size} task(s)? This cannot be undone.`)) return;

        const success = await bulkDeleteTasks(Array.from(selectedTasks));
        if (success) {
            setSelectedTasks(new Set());
            onDataChanged();
        }
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={staffFilter}
                            onChange={(e) => setStaffFilter(e.target.value)}
                            className="input py-1.5 text-sm"
                        >
                            <option value="all">All Staff</option>
                            {staffData.map(staff => (
                                <option key={staff.user_id} value={staff.user_id}>
                                    {staff.profile?.full_name || 'Unknown'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className="input py-1.5 text-sm"
                    >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>

                    <select
                        value={priorityFilter}
                        onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                        className="input py-1.5 text-sm"
                    >
                        <option value="all">All Priority</option>
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortBy)}
                        className="input py-1.5 text-sm"
                    >
                        <option value="due_date">Sort by Due Date</option>
                        <option value="priority">Sort by Priority</option>
                        <option value="staff">Sort by Staff</option>
                    </select>
                </div>

                {/* Actions */}
                <button
                    onClick={() => setShowBulkModal(true)}
                    className="btn-primary text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Bulk Assign Task
                </button>
            </div>

            {/* Bulk Actions Bar */}
            {selectedTasks.size > 0 && (
                <div className="flex items-center justify-between gap-4 p-3 bg-mint-50 border border-mint-200 rounded-lg">
                    <span className="text-sm text-mint-700 font-medium">
                        {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearSelection}
                            className="btn-ghost text-sm py-1"
                        >
                            Clear
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={bulkLoading}
                            className="btn-danger text-sm py-1"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Tasks Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px]">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="w-10 p-4">
                                    <input
                                        type="checkbox"
                                        checked={sortedTasks.length > 0 && sortedTasks.every(t => selectedTasks.has(t.id))}
                                        onChange={(e) => e.target.checked ? selectAllVisible() : clearSelection()}
                                        className="rounded border-slate-300 text-mint-600 focus:ring-mint-500"
                                    />
                                </th>
                                <th className="text-left p-4 font-semibold text-slate-700">Task</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Assigned To</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Due Date</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Priority</th>
                                <th className="text-left p-4 font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedTasks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500">
                                        No tasks found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                sortedTasks.map(task => {
                                    const isOverdue = task.due_date &&
                                        isPast(parseISO(task.due_date)) &&
                                        !isToday(parseISO(task.due_date)) &&
                                        task.status !== 'completed';
                                    const isDueToday = task.due_date && isToday(parseISO(task.due_date));

                                    return (
                                        <tr
                                            key={task.id}
                                            className={`hover:bg-slate-50/50 ${isOverdue ? 'bg-red-50/50' : ''}`}
                                        >
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTasks.has(task.id)}
                                                    onChange={() => toggleTaskSelection(task.id)}
                                                    className="rounded border-slate-300 text-mint-600 focus:ring-mint-500"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <p className={`font-medium ${
                                                    task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'
                                                }`}>
                                                    {task.title}
                                                </p>
                                                {task.description && (
                                                    <p className="text-sm text-slate-500 line-clamp-1">
                                                        {task.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="p-4 text-sm text-slate-700">
                                                {task.staffName}
                                            </td>
                                            <td className="p-4">
                                                {task.due_date ? (
                                                    <span className={`text-sm flex items-center gap-1 ${
                                                        isOverdue
                                                            ? 'text-red-600 font-medium'
                                                            : isDueToday
                                                            ? 'text-amber-600 font-medium'
                                                            : 'text-slate-600'
                                                    }`}>
                                                        {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                                                        {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                                    </span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">No due date</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getPriorityColor(task.priority)}`}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="flex items-center gap-1.5 text-sm">
                                                    {getStatusIcon(task.status)}
                                                    <span className="text-slate-600">
                                                        {getStatusLabel(task.status)}
                                                    </span>
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Total: {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}</span>
                <span className="text-slate-300">|</span>
                <span>Overdue: {sortedTasks.filter(t => t.due_date && isPast(parseISO(t.due_date)) && !isToday(parseISO(t.due_date)) && t.status !== 'completed').length}</span>
            </div>

            {/* Bulk Task Modal */}
            {showBulkModal && (
                <BulkTaskModal
                    isOpen={showBulkModal}
                    onClose={() => setShowBulkModal(false)}
                    hubId={hubId}
                    staffData={staffData}
                    onTasksAssigned={() => {
                        setShowBulkModal(false);
                        onDataChanged();
                    }}
                />
            )}
        </div>
    );
}
