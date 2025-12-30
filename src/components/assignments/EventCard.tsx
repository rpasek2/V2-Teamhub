import { clsx } from 'clsx';
import { Check, Circle } from 'lucide-react';
import type { AssignmentEventType, CompletedItems } from '../../types';
import { ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface EventCardProps {
    event: AssignmentEventType;
    exercises: string[];
    completedItems: number[];
    onToggleExercise?: (index: number) => void;
    readOnly?: boolean;
    className?: string;
}

export function EventCard({
    event,
    exercises,
    completedItems,
    onToggleExercise,
    readOnly = false,
    className
}: EventCardProps) {
    const colors = ASSIGNMENT_EVENT_COLORS[event];
    const label = ASSIGNMENT_EVENT_LABELS[event];
    const completedCount = completedItems.length;
    const totalCount = exercises.length;
    const isComplete = completedCount === totalCount && totalCount > 0;

    if (exercises.length === 0) return null;

    return (
        <div
            className={clsx(
                'rounded-xl border p-4 transition-all',
                colors.bg,
                colors.border,
                isComplete && 'ring-2 ring-success-500/50 ring-offset-1 ring-offset-white',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                    {isComplete && <span className="text-lg">&#127942;</span>}
                    <h3 className={clsx(
                        'font-semibold',
                        isComplete ? 'text-success-400' : colors.text
                    )}>
                        {label}
                    </h3>
                </div>
                <span className={clsx(
                    'text-sm font-medium',
                    isComplete ? 'text-success-500' : 'text-slate-500'
                )}>
                    {completedCount}/{totalCount}
                    {isComplete && ' ✓'}
                </span>
            </div>

            {/* Exercise List */}
            <ul className="space-y-2">
                {exercises.map((exercise, index) => {
                    const isCompleted = completedItems.includes(index);

                    return (
                        <li
                            key={index}
                            onClick={() => !readOnly && onToggleExercise?.(index)}
                            className={clsx(
                                'flex items-start gap-3 text-sm',
                                !readOnly && 'cursor-pointer hover:bg-slate-100 -mx-2 px-2 py-1 rounded-lg transition-colors',
                                isCompleted ? 'text-slate-400' : 'text-slate-700'
                            )}
                        >
                            {isCompleted ? (
                                <Check className="w-5 h-5 text-success-400 flex-shrink-0 mt-0.5" />
                            ) : (
                                <Circle className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                            )}
                            <span className={isCompleted ? 'line-through' : ''}>
                                {exercise}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

interface EventCardCompactProps {
    event: AssignmentEventType;
    completed: number;
    total: number;
    className?: string;
}

export function EventCardCompact({ event, completed, total, className }: EventCardCompactProps) {
    const colors = ASSIGNMENT_EVENT_COLORS[event];
    const label = ASSIGNMENT_EVENT_LABELS[event];
    const isComplete = completed === total && total > 0;

    return (
        <div
            className={clsx(
                'px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5',
                colors.bg,
                colors.text,
                className
            )}
        >
            <span>{label}</span>
            <span className="opacity-70">
                {completed}/{total}
            </span>
            {isComplete && (
                <Check className="w-3 h-3" />
            )}
        </div>
    );
}

export function calculateEventProgress(
    completedItems: CompletedItems,
    eventContents: Partial<Record<AssignmentEventType, string>>
): { completed: number; total: number; byEvent: Array<{ event: AssignmentEventType; completed: number; total: number }> } {
    let totalCompleted = 0;
    let totalExercises = 0;
    const byEvent: Array<{ event: AssignmentEventType; completed: number; total: number }> = [];

    const events: AssignmentEventType[] = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

    events.forEach(event => {
        const content = eventContents[event];
        if (content && content.trim()) {
            const exercises = content.split('\n').filter(line => line.trim());
            const eventCompleted = (completedItems[event] || []).length;

            totalExercises += exercises.length;
            totalCompleted += eventCompleted;

            byEvent.push({
                event,
                completed: eventCompleted,
                total: exercises.length
            });
        }
    });

    return {
        completed: totalCompleted,
        total: totalExercises,
        byEvent
    };
}
