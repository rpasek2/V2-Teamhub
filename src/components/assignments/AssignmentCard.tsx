import { clsx } from 'clsx';
import type { GymnastAssignment, AssignmentEventType, GymnastProfile } from '../../types';
import { ProgressBar, ProgressRing } from './ProgressBar';
import { EventCardCompact, calculateEventProgress } from './EventCard';

interface AssignmentCardProps {
    assignment: GymnastAssignment;
    gymnast?: GymnastProfile | null;
    onClick?: () => void;
    showProgress?: boolean;
    compact?: boolean;
    className?: string;
}

export function AssignmentCard({
    assignment,
    gymnast,
    onClick,
    showProgress = true,
    compact = false,
    className
}: AssignmentCardProps) {
    const gymnastName = gymnast
        ? `${gymnast.first_name} ${gymnast.last_name}`
        : (assignment.gymnast_profiles as any)?.first_name
            ? `${(assignment.gymnast_profiles as any).first_name} ${(assignment.gymnast_profiles as any).last_name}`
            : 'Unknown Gymnast';

    const gymnastLevel = gymnast?.level || (assignment.gymnast_profiles as any)?.level || '';

    const eventContents: Partial<Record<AssignmentEventType, string>> = {
        vault: assignment.vault,
        bars: assignment.bars,
        beam: assignment.beam,
        floor: assignment.floor,
        strength: assignment.strength,
        flexibility: assignment.flexibility,
        conditioning: assignment.conditioning
    };

    const progress = calculateEventProgress(assignment.completed_items || {}, eventContents);
    const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    if (compact) {
        return (
            <div
                onClick={onClick}
                className={clsx(
                    'flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200',
                    onClick && 'cursor-pointer hover:border-mint-500 hover:bg-slate-50 transition-all',
                    className
                )}
            >
                <ProgressRing completed={progress.completed} total={progress.total} size={40} strokeWidth={3} />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{gymnastName}</p>
                    <p className="text-xs text-slate-500">{gymnastLevel}</p>
                </div>
                <span className="text-sm font-medium text-slate-500">
                    {progress.completed}/{progress.total}
                </span>
            </div>
        );
    }

    return (
        <div
            onClick={onClick}
            className={clsx(
                'card p-4 sm:p-5',
                onClick && 'cursor-pointer hover:border-mint-500/50 transition-all',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 font-semibold flex-shrink-0 border border-indigo-200">
                        {gymnastName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{gymnastName}</h3>
                        <p className="text-xs text-slate-500">{gymnastLevel}</p>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold text-mint-600">{percentage}%</div>
                    <div className="text-xs text-slate-500">{progress.completed}/{progress.total}</div>
                </div>
            </div>

            {/* Progress Bar */}
            {showProgress && (
                <div className="mb-4">
                    <ProgressBar
                        completed={progress.completed}
                        total={progress.total}
                        showLabel={false}
                    />
                </div>
            )}

            {/* Event Summary */}
            <div className="flex flex-wrap gap-1.5">
                {progress.byEvent.map(({ event, completed, total }) => (
                    <EventCardCompact
                        key={event}
                        event={event}
                        completed={completed}
                        total={total}
                    />
                ))}
            </div>
        </div>
    );
}

interface AssignmentListProps {
    assignments: GymnastAssignment[];
    onAssignmentClick?: (assignment: GymnastAssignment) => void;
    emptyMessage?: string;
    className?: string;
}

export function AssignmentList({
    assignments,
    onAssignmentClick,
    emptyMessage = 'No assignments for this date',
    className
}: AssignmentListProps) {
    if (assignments.length === 0) {
        return (
            <div className="text-center py-12 px-4">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                </div>
                <p className="text-slate-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={clsx('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
            {assignments.map(assignment => (
                <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    onClick={() => onAssignmentClick?.(assignment)}
                />
            ))}
        </div>
    );
}
