import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, CheckSquare, Circle, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO, isPast, isToday } from 'date-fns';

interface Task {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed';
    assigned_by: string | null;
    completed_at: string | null;
    created_at: string;
}

interface StaffTasksSectionProps {
    staffUserId: string;
    isOwner: boolean;
    isSelf: boolean;
}

export function StaffTasksSection({ staffUserId, isOwner, isSelf }: StaffTasksSectionProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'active' | 'completed'>('active');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<Task['priority']>('medium');

    useEffect(() => {
        fetchTasks();
    }, [staffUserId, hubId]);

    const fetchTasks = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_tasks')
            .select('*')
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('due_date', { ascending: true, nullsFirst: false })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tasks:', error);
        } else {
            setTasks(data || []);
        }
        setLoading(false);
    };

    const handleAddTask = async () => {
        if (!hubId || !title.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_tasks')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                title: title.trim(),
                description: description.trim() || null,
                due_date: dueDate || null,
                priority,
                assigned_by: user?.id,
            });

        if (error) {
            console.error('Error adding task:', error);
        } else {
            await fetchTasks();
            setShowAddForm(false);
            setTitle('');
            setDescription('');
            setDueDate('');
            setPriority('medium');
        }
        setSaving(false);
    };

    const handleUpdateStatus = async (taskId: string, newStatus: Task['status']) => {
        const updates: Record<string, unknown> = {
            status: newStatus,
            updated_at: new Date().toISOString(),
        };

        if (newStatus === 'completed') {
            updates.completed_at = new Date().toISOString();
        } else {
            updates.completed_at = null;
        }

        const { error } = await supabase
            .from('staff_tasks')
            .update(updates)
            .eq('id', taskId);

        if (error) {
            console.error('Error updating task:', error);
        } else {
            setTasks(tasks.map(t =>
                t.id === taskId
                    ? { ...t, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
                    : t
            ));
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        const { error } = await supabase
            .from('staff_tasks')
            .delete()
            .eq('id', taskId);

        if (error) {
            console.error('Error deleting task:', error);
        } else {
            setTasks(tasks.filter(t => t.id !== taskId));
        }
    };

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
            case 'completed': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'in_progress': return <Clock className="w-5 h-5 text-blue-500" />;
            case 'pending': return <Circle className="w-5 h-5 text-slate-400" />;
        }
    };

    const filteredTasks = tasks.filter(t =>
        filter === 'active'
            ? t.status !== 'completed'
            : t.status === 'completed'
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-800">Tasks</h3>
                <div className="flex items-center gap-2">
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                            onClick={() => setFilter('active')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                filter === 'active'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Active
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                filter === 'completed'
                                    ? 'bg-white text-slate-800 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Completed
                        </button>
                    </div>
                    {isOwner && !showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                        >
                            <Plus className="w-4 h-4" />
                            Add Task
                        </button>
                    )}
                </div>
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Task details..."
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                            <select
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddTask}
                            disabled={saving || !title.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Add Task
                        </button>
                    </div>
                </div>
            )}

            {/* Tasks List */}
            {filteredTasks.length === 0 ? (
                <div className="text-center py-8">
                    <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">
                        {filter === 'active' ? 'No active tasks.' : 'No completed tasks.'}
                    </p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {filteredTasks.map((task) => {
                        const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date)) && task.status !== 'completed';
                        const isDueToday = task.due_date && isToday(parseISO(task.due_date));

                        return (
                            <li
                                key={task.id}
                                className={`p-3 rounded-lg border ${
                                    isOverdue
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-white border-slate-200'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Status Toggle */}
                                    {(isSelf || isOwner) && task.status !== 'completed' && (
                                        <button
                                            onClick={() => handleUpdateStatus(
                                                task.id,
                                                task.status === 'pending' ? 'in_progress' : 'completed'
                                            )}
                                            className="mt-0.5 hover:scale-110 transition-transform"
                                        >
                                            {getStatusIcon(task.status)}
                                        </button>
                                    )}
                                    {task.status === 'completed' && (
                                        <span className="mt-0.5">{getStatusIcon(task.status)}</span>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`font-medium ${
                                                task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-800'
                                            }`}>
                                                {task.title}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        {task.description && (
                                            <p className="text-sm text-slate-500 mt-1">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2 text-xs">
                                            {task.due_date && (
                                                <span className={`flex items-center gap-1 ${
                                                    isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-slate-500'
                                                }`}>
                                                    {isOverdue && <AlertCircle className="w-3 h-3" />}
                                                    Due: {format(parseISO(task.due_date), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                            {task.completed_at && (
                                                <span className="text-green-600">
                                                    Completed: {format(parseISO(task.completed_at), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Delete (owner only) */}
                                    {isOwner && (
                                        <button
                                            onClick={() => handleDeleteTask(task.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
