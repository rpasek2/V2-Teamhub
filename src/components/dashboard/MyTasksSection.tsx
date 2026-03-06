import { Link } from 'react-router-dom';
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { useAuth } from '../../context/AuthContext';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');

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
    urgent: 'bg-red-500/15 text-red-600 dark:text-red-400',
    high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    low: 'bg-surface-hover text-subtle',
};

function getNextStatus(current: 'pending' | 'in_progress' | 'completed'): 'pending' | 'in_progress' | 'completed' {
    if (current === 'pending') return 'in_progress';
    if (current === 'in_progress') return 'completed';
    return 'pending';
}

function StatusIcon({ status, className }: { status: string; className?: string }) {
    if (status === 'completed') return <CheckCircle2 className={className || 'w-5 h-5 text-green-500'} />;
    if (status === 'in_progress') return <Clock className={className || 'w-5 h-5 text-accent-500'} />;
    return <Circle className={className || 'w-5 h-5 text-faint'} />;
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
                    <h2 className="text-lg font-semibold text-heading">My Tasks</h2>
                    <span className="px-2 py-0.5 bg-accent-500/15 text-accent-600 dark:text-accent-400 text-xs font-medium rounded-full">
                        {tasks.length}
                    </span>
                </div>
                {user && (
                    <Link to={`staff/${user.id}`} className="text-sm text-accent-600 hover:text-accent-700">
                        View All
                    </Link>
                )}
            </div>
            <div className="space-y-2">
                {displayTasks.map((task) => {
                    const isOverdue = task.due_date && isPast(parseLocalDate(task.due_date)) && !isToday(parseLocalDate(task.due_date));
                    const isDueToday = task.due_date && isToday(parseLocalDate(task.due_date));

                    return (
                        <div
                            key={task.id}
                            className={`card p-3 flex items-center gap-3 ${isOverdue ? 'border-red-500/20 bg-red-500/10' : ''}`}
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
                                    <span className="text-sm font-medium text-heading truncate">
                                        {task.title}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[task.priority]}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                {task.due_date && (
                                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${
                                        isOverdue ? 'text-red-600 font-medium' : isDueToday ? 'text-amber-600' : 'text-muted'
                                    }`}>
                                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                                        {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : `Due ${format(parseLocalDate(task.due_date), 'MMM d')}`}
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
                    className="block text-center text-sm text-accent-600 hover:text-accent-700 mt-3"
                >
                    +{tasks.length - 5} more tasks
                </Link>
            )}
        </div>
    );
}
