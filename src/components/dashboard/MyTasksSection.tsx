import { Link } from 'react-router-dom';
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

interface StaffTask {
    id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed';
    assigned_by: string | null;
    created_at: string;
}

interface MyTasksSectionProps {
    tasks: StaffTask[];
    onStatusChange: (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => void;
}

const PRIORITY_STYLES: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-600',
};

function getNextStatus(current: 'pending' | 'in_progress' | 'completed'): 'pending' | 'in_progress' | 'completed' {
    if (current === 'pending') return 'in_progress';
    if (current === 'in_progress') return 'completed';
    return 'pending';
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
    if (status === 'completed') return <CheckCircle2 className={className || 'w-5 h-5 text-green-500'} />;
    if (status === 'in_progress') return <Clock className={className || 'w-5 h-5 text-brand-500'} />;
    return <Circle className={className || 'w-5 h-5 text-slate-400'} />;
}

export function MyTasksSection({ tasks, onStatusChange }: MyTasksSectionProps) {
    const { user } = useAuth();

    if (tasks.length === 0) return null;

    const displayTasks = tasks.slice(0, 5);
    const hasMore = tasks.length > 5;

    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-medium rounded-full">
                        {tasks.length}
                    </span>
                </div>
                {user && (
                    <Link to={`staff/${user.id}`} className="text-sm text-brand-600 hover:text-brand-700">
                        View All
                    </Link>
                )}
            </div>
            <div className="space-y-2">
                {displayTasks.map((task) => {
                    const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isToday(parseISO(task.due_date));
                    const isDueToday = task.due_date && isToday(parseISO(task.due_date));

                    return (
                        <div
                            key={task.id}
                            className={`card p-3 flex items-center gap-3 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}
                        >
                            <button
                                onClick={() => onStatusChange(task.id, getNextStatus(task.status))}
                                className="flex-shrink-0 hover:scale-110 transition-transform"
                                title={`Click to mark as ${getNextStatus(task.status).replace('_', ' ')}`}
                            >
                                <StatusIcon status={task.status} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-slate-900 truncate">
                                        {task.title}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                {task.due_date && (
                                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                                        isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-amber-600' : 'text-slate-500'
                                    }`}>
                                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                                        {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${format(parseISO(task.due_date), 'MMM d')}`}
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
            {hasMore && user && (
                <Link
                    to={`staff/${user.id}`}
                    className="block text-center text-sm text-brand-600 hover:text-brand-700 mt-3"
                >
                    +{tasks.length - 5} more tasks
                </Link>
            )}
        </div>
    );
}
