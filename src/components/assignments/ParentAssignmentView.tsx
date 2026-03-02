import { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { useHub } from '../../context/HubContext';
import { useToggleCompletion } from '../../hooks/useAssignments';
import { EventCard, calculateEventProgress } from './EventCard';
import { ProgressBar } from './ProgressBar';
import type { GymnastAssignment, AssignmentEventType, CompletedItems } from '../../types';

interface ParentAssignmentViewProps {
    assignment: GymnastAssignment;
    onBack: () => void;
    onUpdated?: () => void;
}

export function ParentAssignmentView({ assignment, onBack, onUpdated }: ParentAssignmentViewProps) {
    const { hub, linkedGymnasts } = useHub();
    const [completedItems, setCompletedItems] = useState<CompletedItems>(assignment.completed_items || {});

    const { toggleCompletion, loading: toggling } = useToggleCompletion();

    // Check if parent can toggle completion based on hub settings
    const canToggle = hub?.settings?.allowParentToggle !== false;

    const gymnast = linkedGymnasts.find(g => g.id === assignment.gymnast_profile_id);
    const gymnastName = gymnast
        ? `${gymnast.first_name} ${gymnast.last_name}`
        : (assignment.gymnast_profiles as any)?.first_name
            ? `${(assignment.gymnast_profiles as any).first_name} ${(assignment.gymnast_profiles as any).last_name}`
            : 'Gymnast';

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

    const progress = useMemo(() => {
        return calculateEventProgress(completedItems, eventContents);
    }, [completedItems, eventContents]);

    const handleToggleExercise = async (event: AssignmentEventType, index: number) => {
        if (!canToggle || toggling) return;

        const newCompleted = await toggleCompletion(
            assignment.id,
            event,
            index,
            completedItems
        );

        if (newCompleted) {
            setCompletedItems(newCompleted);
            onUpdated?.();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="space-y-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 text-muted hover:text-heading hover:bg-surface-hover rounded-lg transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-semibold text-heading">
                            {gymnastName}'s Assignment
                        </h1>
                        <p className="text-sm text-muted">
                            {gymnastLevel && `${gymnastLevel} • `}
                            {format(new Date(assignment.date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                        </p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-muted">Progress</span>
                        <span className="text-sm font-bold text-accent-600">
                            {Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%
                        </span>
                    </div>
                    <ProgressBar
                        completed={progress.completed}
                        total={progress.total}
                        showLabel
                        size="lg"
                    />
                </div>
            </div>

            {/* Toggle Permission Notice */}
            {!canToggle && (
                <div className="bg-surface-hover border border-line rounded-lg p-4 text-sm text-muted">
                    <span className="text-body font-medium">View Only Mode: </span>
                    Coaches have disabled the ability for parents to mark exercises as complete.
                    Contact your coach if you believe this is an error.
                </div>
            )}

            {/* Event Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
                {progress.byEvent.map(({ event }) => {
                    const content = eventContents[event];
                    if (!content || !content.trim()) return null;

                    const exercises = content.split('\n').filter(line => line.trim());

                    return (
                        <EventCard
                            key={event}
                            event={event}
                            exercises={exercises}
                            completedItems={completedItems[event] || []}
                            onToggleExercise={(index) => handleToggleExercise(event, index)}
                            readOnly={!canToggle}
                        />
                    );
                })}
            </div>

            {/* Notes */}
            {assignment.notes && (
                <div className="card p-4">
                    <h3 className="font-medium text-heading mb-2">Coach's Notes</h3>
                    <p className="text-sm text-body whitespace-pre-wrap">{assignment.notes}</p>
                </div>
            )}

            {/* Completion Celebration */}
            {progress.completed === progress.total && progress.total > 0 && (
                <div className="text-center py-8 card bg-gradient-to-br from-success-100 to-accent-100 border-success-300">
                    <div className="text-5xl mb-4">&#127942;</div>
                    <h3 className="text-xl font-bold text-success-400 mb-2">
                        All Done!
                    </h3>
                    <p className="text-muted">
                        Great work completing today's training!
                    </p>
                </div>
            )}
        </div>
    );
}
