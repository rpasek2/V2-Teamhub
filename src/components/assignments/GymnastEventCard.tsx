import { useState, useEffect, useRef } from 'react';
import { MoreVertical, UserX, Trash2, Pencil, FileText } from 'lucide-react';
import { useToggleCompletion, useDeleteAssignment, useUpsertAssignment } from '../../hooks/useAssignments';
import { AssignmentDetailModal } from './AssignmentDetailModal';
import { SaveAsTemplateModal } from './SaveAsTemplateModal';
import type { GymnastAssignment, AssignmentEventType } from '../../types';

interface GymnastEventCardProps {
    assignment: GymnastAssignment;
    eventKey: AssignmentEventType;
    eventColor: string;
    borderColor: string;
    onUpdate?: () => void;
}

function parseExercises(text: string): string[] {
    if (!text) return [];
    return text.split('\n').filter(line => line.trim() !== '');
}

export function GymnastEventCard({ assignment, eventKey, eventColor, borderColor, onUpdate }: GymnastEventCardProps) {
    const { toggleCompletion } = useToggleCompletion();
    const { deleteAssignment } = useDeleteAssignment();
    const { upsertAssignment } = useUpsertAssignment();
    const cardRef = useRef<HTMLDivElement>(null);
    const [showMenu, setShowMenu] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showSaveTemplate, setShowSaveTemplate] = useState(false);
    const [localCompleted, setLocalCompleted] = useState<number[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    const gymnast = assignment.gymnast_profiles as any;
    const exercises = parseExercises(assignment[eventKey] || '');
    const completedItems = assignment.completed_items || {};

    // Initialize local state from assignment
    useEffect(() => {
        setLocalCompleted(completedItems[eventKey] || []);
    }, [completedItems, eventKey]);

    const completedCount = localCompleted.length;
    const totalCount = exercises.length;
    const isComplete = totalCount > 0 && completedCount === totalCount;

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setShowMenu(false);
            }
        };
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showMenu]);

    if (exercises.length === 0) {
        return null;
    }

    const handleToggle = async (index: number) => {
        // Optimistic update - no need to refetch since we update local state
        const newCompleted = localCompleted.includes(index)
            ? localCompleted.filter(i => i !== index)
            : [...localCompleted, index];
        setLocalCompleted(newCompleted);

        // Persist to database
        const result = await toggleCompletion(
            assignment.id,
            eventKey,
            index,
            completedItems
        );

        if (!result) {
            // Revert on failure
            setLocalCompleted(localCompleted);
        }
    };

    // Remove just this event's exercises
    const handleRemoveEvent = async () => {
        if (!confirm(`Remove ${gymnast?.first_name}'s exercises for this event?`)) return;
        setShowMenu(false);

        // Clear this event's content
        await upsertAssignment({
            id: assignment.id,
            hub_id: assignment.hub_id,
            gymnast_profile_id: assignment.gymnast_profile_id,
            date: assignment.date,
            [eventKey]: ''
        });
        onUpdate?.();
    };

    // Delete entire assignment
    const handleDeleteAssignment = async () => {
        if (!confirm(`Delete entire assignment for ${gymnast?.first_name} on this date?`)) return;
        setShowMenu(false);

        await deleteAssignment(assignment.id);
        onUpdate?.();
    };

    return (
        <div
            ref={cardRef}
            className={`${eventColor} rounded-lg border ${borderColor} p-3 sm:p-4 transition-all duration-300 ${
                isComplete ? 'ring-2 ring-accent-500 ring-offset-2 ring-offset-surface' : ''
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {isComplete && <span className="text-base sm:text-lg animate-bounce flex-shrink-0">🏆</span>}
                    <h4 className={`font-medium text-sm sm:text-base truncate ${isComplete ? 'text-accent-600' : 'text-heading'}`}>
                        {gymnast?.first_name} {gymnast?.last_name}
                    </h4>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs sm:text-sm ${isComplete ? 'text-accent-600 font-semibold' : 'text-muted'}`}>
                        {completedCount}/{totalCount}
                    </span>

                    {/* Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 text-muted hover:text-body hover:bg-surface-hover rounded transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-surface rounded-lg shadow-lg border border-line py-1 z-20">
                                <button
                                    onClick={() => { setShowMenu(false); setShowDetailModal(true); }}
                                    className="w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2"
                                >
                                    <Pencil className="w-4 h-4 text-muted" />
                                    Edit assignment
                                </button>
                                <button
                                    onClick={() => { setShowMenu(false); setShowSaveTemplate(true); }}
                                    className="w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4 text-muted" />
                                    Save as template
                                </button>
                                <button
                                    onClick={handleRemoveEvent}
                                    className="w-full px-3 py-2 text-left text-sm text-body hover:bg-surface-hover flex items-center gap-2"
                                >
                                    <UserX className="w-4 h-4 text-muted" />
                                    Mark absent (this event)
                                </button>
                                <button
                                    onClick={handleDeleteAssignment}
                                    className="w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-500/10 flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete all (full day)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Exercises */}
            <div className="space-y-1.5 sm:space-y-2">
                {exercises.map((exercise, index) => {
                    const isCompleted = localCompleted.includes(index);
                    return (
                        <label
                            key={index}
                            className={`flex items-start gap-2 sm:gap-3 cursor-pointer group ${
                                isCompleted ? 'opacity-60' : ''
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isCompleted}
                                onChange={() => handleToggle(index)}
                                className="mt-0.5 w-4 h-4 rounded border-line-strong bg-surface text-accent-500 focus:ring-accent-500 cursor-pointer flex-shrink-0"
                            />
                            <span
                                className={`text-xs sm:text-sm break-words ${
                                    isCompleted ? 'line-through text-faint' : 'text-body'
                                }`}
                            >
                                {exercise}
                            </span>
                        </label>
                    );
                })}
            </div>

            {showDetailModal && (
                <AssignmentDetailModal
                    assignment={assignment}
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    onUpdated={onUpdate}
                    canEdit
                />
            )}

            {showSaveTemplate && (
                <SaveAsTemplateModal
                    event={eventKey}
                    templateType="checklist"
                    exercises={assignment[eventKey] || ''}
                    onClose={() => setShowSaveTemplate(false)}
                />
            )}
        </div>
    );
}
