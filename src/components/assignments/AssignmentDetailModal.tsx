import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Save, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToggleCompletion, useUpsertAssignment, useDeleteAssignment } from '../../hooks/useAssignments';
import { EventCard, calculateEventProgress } from './EventCard';
import { ProgressBar } from './ProgressBar';
import type { GymnastAssignment, AssignmentEventType, CompletedItems } from '../../types';
import { ASSIGNMENT_EVENTS, ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface AssignmentDetailModalProps {
    assignment: GymnastAssignment;
    isOpen: boolean;
    onClose: () => void;
    onUpdated?: () => void;
    canEdit?: boolean;
    canToggleCompletion?: boolean;
}

export function AssignmentDetailModal({
    assignment,
    isOpen,
    onClose,
    onUpdated,
    canEdit = false,
    canToggleCompletion = true
}: AssignmentDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedAssignment, setEditedAssignment] = useState(assignment);
    const [completedItems, setCompletedItems] = useState<CompletedItems>(assignment.completed_items || {});
    const [isSaving, setIsSaving] = useState(false);

    const { toggleCompletion } = useToggleCompletion();
    const { upsertAssignment } = useUpsertAssignment();
    const { deleteAssignment } = useDeleteAssignment();

    const gymnastName = (assignment.gymnast_profiles as any)?.first_name
        ? `${(assignment.gymnast_profiles as any).first_name} ${(assignment.gymnast_profiles as any).last_name}`
        : 'Unknown Gymnast';

    const gymnastLevel = (assignment.gymnast_profiles as any)?.level || '';

    const eventContents: Partial<Record<AssignmentEventType, string>> = {
        vault: editedAssignment.vault,
        bars: editedAssignment.bars,
        beam: editedAssignment.beam,
        floor: editedAssignment.floor,
        strength: editedAssignment.strength,
        flexibility: editedAssignment.flexibility,
        conditioning: editedAssignment.conditioning
    };

    const progress = useMemo(() => {
        return calculateEventProgress(completedItems, eventContents);
    }, [completedItems, eventContents]);

    const handleToggleExercise = async (event: AssignmentEventType, index: number) => {
        if (!canToggleCompletion) return;

        const newCompleted = await toggleCompletion(
            assignment.id,
            event,
            index,
            completedItems
        );

        if (newCompleted) {
            setCompletedItems(newCompleted);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await upsertAssignment({
                id: assignment.id,
                hub_id: assignment.hub_id,
                gymnast_profile_id: assignment.gymnast_profile_id,
                date: assignment.date,
                vault: editedAssignment.vault,
                bars: editedAssignment.bars,
                beam: editedAssignment.beam,
                floor: editedAssignment.floor,
                strength: editedAssignment.strength,
                flexibility: editedAssignment.flexibility,
                conditioning: editedAssignment.conditioning,
                notes: editedAssignment.notes
            });
            setIsEditing(false);
            onUpdated?.();
        } catch (err) {
            console.error('Error saving assignment:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this assignment?')) return;

        setIsSaving(true);
        try {
            const success = await deleteAssignment(assignment.id);
            if (success) {
                onClose();
                onUpdated?.();
            }
        } catch (err) {
            console.error('Error deleting assignment:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const updateEventContent = (event: AssignmentEventType, content: string) => {
        setEditedAssignment(prev => ({
            ...prev,
            [event]: content
        }));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center text-indigo-600 text-xl font-semibold border border-indigo-200">
                            {gymnastName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-slate-900">{gymnastName}</h2>
                            <p className="text-sm text-slate-500">
                                {gymnastLevel} • {format(new Date(assignment.date + 'T00:00:00'), 'EEE, MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress */}
                <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Progress</span>
                        <span className="text-sm font-bold text-mint-600">
                            {progress.completed}/{progress.total}
                        </span>
                    </div>
                    <ProgressBar
                        completed={progress.completed}
                        total={progress.total}
                        showLabel={false}
                        size="lg"
                    />
                </div>

                {/* Content */}
                {isEditing ? (
                    <div className="space-y-4">
                        {ASSIGNMENT_EVENTS.map(event => {
                            const colors = ASSIGNMENT_EVENT_COLORS[event];
                            return (
                                <div key={event}>
                                    <label className={`block text-sm font-medium mb-2 ${colors.text}`}>
                                        {ASSIGNMENT_EVENT_LABELS[event]}
                                    </label>
                                    <textarea
                                        value={editedAssignment[event] || ''}
                                        onChange={(e) => updateEventContent(event, e.target.value)}
                                        placeholder="Enter exercises, one per line..."
                                        className="input w-full min-h-[80px] resize-none font-mono text-sm"
                                        rows={3}
                                    />
                                </div>
                            );
                        })}

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-2">
                                Notes
                            </label>
                            <textarea
                                value={editedAssignment.notes || ''}
                                onChange={(e) => setEditedAssignment(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Add notes..."
                                className="input w-full min-h-[60px] resize-none"
                                rows={2}
                            />
                        </div>
                    </div>
                ) : (
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
                                    readOnly={!canToggleCompletion}
                                />
                            );
                        })}
                    </div>
                )}

                {/* Notes (view mode) */}
                {!isEditing && assignment.notes && (
                    <div className="mt-6 pt-6 border-t border-slate-200">
                        <h3 className="text-sm font-medium text-slate-500 mb-2">Notes</h3>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{assignment.notes}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-200">
                    {canEdit && !isEditing && (
                        <button
                            onClick={handleDelete}
                            disabled={isSaving}
                            className="btn-danger"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    )}

                    <div className="flex items-center gap-3 ml-auto">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditedAssignment(assignment);
                                    }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="btn-primary"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                            </>
                        ) : (
                            <>
                                {canEdit && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn-secondary"
                                    >
                                        Edit Assignment
                                    </button>
                                )}
                                <button onClick={onClose} className="btn-primary">
                                    Done
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
