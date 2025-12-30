import { useState, useEffect, useRef } from 'react';
import { MoreVertical, UserX, Trash2 } from 'lucide-react';
import { useToggleCompletion, useDeleteAssignment, useUpsertAssignment } from '../../hooks/useAssignments';
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
        // Optimistic update
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

        if (result) {
            onUpdate?.();
        } else {
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
                isComplete ? 'ring-2 ring-mint-500 ring-offset-2 ring-offset-white' : ''
            }`}
        >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                    {isComplete && <span className="text-base sm:text-lg animate-bounce flex-shrink-0">🏆</span>}
                    <h4 className={`font-medium text-sm sm:text-base truncate ${isComplete ? 'text-mint-600' : 'text-slate-900'}`}>
                        {gymnast?.first_name} {gymnast?.last_name}
                    </h4>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-xs sm:text-sm ${isComplete ? 'text-mint-600 font-semibold' : 'text-slate-500'}`}>
                        {completedCount}/{totalCount}
                    </span>

                    {/* Menu */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
                                <button
                                    onClick={handleRemoveEvent}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 flex items-center gap-2"
                                >
                                    <UserX className="w-4 h-4 text-slate-500" />
                                    Mark absent (this event)
                                </button>
                                <button
                                    onClick={handleDeleteAssignment}
                                    className="w-full px-3 py-2 text-left text-sm text-error-500 hover:bg-error-50 flex items-center gap-2"
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
                                className="mt-0.5 w-4 h-4 rounded border-slate-300 bg-white text-mint-500 focus:ring-mint-500 cursor-pointer flex-shrink-0"
                            />
                            <span
                                className={`text-xs sm:text-sm break-words ${
                                    isCompleted ? 'line-through text-slate-400' : 'text-slate-700'
                                }`}
                            >
                                {exercise}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}
