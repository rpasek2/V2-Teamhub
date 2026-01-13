import { useState } from 'react';
import { Plus, Check, Trash2, ChevronDown, ChevronRight, Loader2, Target, Calendar } from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { useGoals, useDeleteGoal, useToggleGoalCompletion, useCreateSubgoal, useToggleSubgoalCompletion, useDeleteSubgoal } from '../../hooks/useGoals';
import { AddGoalModal } from './AddGoalModal';
import type { GymnastGoal, GymnastSubgoal } from '../../types';

interface GoalsSectionProps {
    gymnastProfileId: string;
    readOnly?: boolean;
}

export function GoalsSection({ gymnastProfileId, readOnly = false }: GoalsSectionProps) {
    const { goals, loading, refetch } = useGoals({ gymnastProfileId });
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
    const [showAddModal, setShowAddModal] = useState(false);
    const [addingSubgoalTo, setAddingSubgoalTo] = useState<string | null>(null);
    const [newSubgoalTitle, setNewSubgoalTitle] = useState('');

    const { deleteGoal } = useDeleteGoal();
    const { toggleGoalCompletion } = useToggleGoalCompletion();
    const { createSubgoal, loading: creatingSubgoal } = useCreateSubgoal();
    const { toggleSubgoalCompletion } = useToggleSubgoalCompletion();
    const { deleteSubgoal } = useDeleteSubgoal();

    const toggleExpanded = (goalId: string) => {
        setExpandedGoals(prev => {
            const next = new Set(prev);
            if (next.has(goalId)) {
                next.delete(goalId);
            } else {
                next.add(goalId);
            }
            return next;
        });
    };

    const handleToggleGoal = async (goal: GymnastGoal) => {
        await toggleGoalCompletion(goal.id, !!goal.completed_at);
        refetch();
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (!confirm('Delete this goal and all its milestones?')) return;
        await deleteGoal(goalId);
        refetch();
    };

    const handleAddSubgoal = async (goalId: string) => {
        if (!newSubgoalTitle.trim()) return;

        const result = await createSubgoal({
            goal_id: goalId,
            title: newSubgoalTitle.trim()
        });

        if (result) {
            setNewSubgoalTitle('');
            setAddingSubgoalTo(null);
            refetch();
        }
    };

    const handleToggleSubgoal = async (subgoal: GymnastSubgoal) => {
        await toggleSubgoalCompletion(subgoal.id, !!subgoal.completed_at);
        refetch();
    };

    const handleDeleteSubgoal = async (subgoalId: string) => {
        await deleteSubgoal(subgoalId);
        refetch();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
        );
    }

    const activeGoals = goals.filter(g => !g.completed_at);
    const completedGoals = goals.filter(g => g.completed_at);

    return (
        <div className="space-y-4">
            {/* Add Goal Button */}
            {!readOnly && (
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Goal
                </button>
            )}

            {/* Active Goals */}
            {activeGoals.length > 0 && (
                <div className="space-y-3">
                    {activeGoals.map(goal => (
                        <GoalItem
                            key={goal.id}
                            goal={goal}
                            isExpanded={expandedGoals.has(goal.id)}
                            onToggleExpanded={() => toggleExpanded(goal.id)}
                            onToggleComplete={() => handleToggleGoal(goal)}
                            onDelete={() => handleDeleteGoal(goal.id)}
                            onAddSubgoal={() => setAddingSubgoalTo(goal.id)}
                            onToggleSubgoal={handleToggleSubgoal}
                            onDeleteSubgoal={handleDeleteSubgoal}
                            isAddingSubgoal={addingSubgoalTo === goal.id}
                            newSubgoalTitle={newSubgoalTitle}
                            onNewSubgoalChange={setNewSubgoalTitle}
                            onSaveSubgoal={() => handleAddSubgoal(goal.id)}
                            onCancelSubgoal={() => {
                                setAddingSubgoalTo(null);
                                setNewSubgoalTitle('');
                            }}
                            creatingSubgoal={creatingSubgoal}
                            readOnly={readOnly}
                        />
                    ))}
                </div>
            )}

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-500 mb-3">
                        Completed ({completedGoals.length})
                    </h4>
                    <div className="space-y-2">
                        {completedGoals.map(goal => (
                            <GoalItem
                                key={goal.id}
                                goal={goal}
                                isExpanded={expandedGoals.has(goal.id)}
                                onToggleExpanded={() => toggleExpanded(goal.id)}
                                onToggleComplete={() => handleToggleGoal(goal)}
                                onDelete={() => handleDeleteGoal(goal.id)}
                                onToggleSubgoal={handleToggleSubgoal}
                                onDeleteSubgoal={handleDeleteSubgoal}
                                readOnly={readOnly}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {goals.length === 0 && (
                <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                        <Target className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">No goals set yet</p>
                    {!readOnly && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="mt-3 text-sm text-brand-600 hover:text-brand-700"
                        >
                            Add your first goal
                        </button>
                    )}
                </div>
            )}

            {/* Add Goal Modal */}
            {showAddModal && (
                <AddGoalModal
                    isOpen={true}
                    onClose={() => setShowAddModal(false)}
                    onSaved={refetch}
                    gymnastProfileId={gymnastProfileId}
                />
            )}
        </div>
    );
}

interface GoalItemProps {
    goal: GymnastGoal;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onToggleComplete: () => void;
    onDelete: () => void;
    onAddSubgoal?: () => void;
    onToggleSubgoal: (subgoal: GymnastSubgoal) => void;
    onDeleteSubgoal: (id: string) => void;
    isAddingSubgoal?: boolean;
    newSubgoalTitle?: string;
    onNewSubgoalChange?: (value: string) => void;
    onSaveSubgoal?: () => void;
    onCancelSubgoal?: () => void;
    creatingSubgoal?: boolean;
    readOnly?: boolean;
}

// Get color for event badge
function getEventBadgeColor(event: string): string {
    const eventLower = event.toLowerCase();
    if (eventLower.includes('vault')) return 'bg-emerald-100 text-emerald-700';
    if (eventLower.includes('bar')) return 'bg-sky-100 text-sky-700';
    if (eventLower.includes('beam')) return 'bg-pink-100 text-pink-700';
    if (eventLower.includes('floor')) return 'bg-amber-100 text-amber-700';
    if (eventLower.includes('pommel')) return 'bg-orange-100 text-orange-700';
    if (eventLower.includes('ring')) return 'bg-violet-100 text-violet-700';
    if (eventLower.includes('parallel')) return 'bg-teal-100 text-teal-700';
    if (eventLower.includes('high bar')) return 'bg-indigo-100 text-indigo-700';
    if (eventLower.includes('strength')) return 'bg-red-100 text-red-700';
    if (eventLower.includes('flexibility')) return 'bg-purple-100 text-purple-700';
    if (eventLower.includes('mental')) return 'bg-cyan-100 text-cyan-700';
    if (eventLower.includes('competition')) return 'bg-rose-100 text-rose-700';
    return 'bg-slate-100 text-slate-600';
}

function GoalItem({
    goal,
    isExpanded,
    onToggleExpanded,
    onToggleComplete,
    onDelete,
    onAddSubgoal,
    onToggleSubgoal,
    onDeleteSubgoal,
    isAddingSubgoal,
    newSubgoalTitle,
    onNewSubgoalChange,
    onSaveSubgoal,
    onCancelSubgoal,
    creatingSubgoal,
    readOnly
}: GoalItemProps) {
    const isCompleted = !!goal.completed_at;
    const subgoals = goal.subgoals || [];
    const completedSubgoals = subgoals.filter(s => s.completed_at).length;

    // Calculate target date status
    const targetDate = goal.target_date ? new Date(goal.target_date) : null;
    const isOverdue = targetDate && !isCompleted && isPast(targetDate) && !isToday(targetDate);
    const isDueSoon = targetDate && !isCompleted && !isPast(targetDate) && differenceInDays(targetDate, new Date()) <= 7;

    return (
        <div className={`rounded-lg border ${
            isCompleted
                ? 'border-success-500/30 bg-success-50'
                : isOverdue
                    ? 'border-error-200 bg-error-50/50'
                    : 'border-slate-200 bg-white'
        }`}>
            <div className="flex items-start gap-3 p-3">
                {/* Checkbox */}
                {!readOnly && (
                    <button
                        onClick={onToggleComplete}
                        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                            isCompleted
                                ? 'bg-success-500 border-success-500'
                                : 'border-slate-300 hover:border-brand-500'
                        }`}
                    >
                        {isCompleted && <Check className="w-3 h-3 text-white" />}
                    </button>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <button
                            onClick={onToggleExpanded}
                            className="flex items-start gap-1 text-left flex-1 min-w-0"
                        >
                            {(subgoals.length > 0 || goal.description) && (
                                isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                                    : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                                <span className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                    {goal.title}
                                </span>

                                {/* Event/Category and Target Date badges */}
                                <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    {goal.event && (
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getEventBadgeColor(goal.event)}`}>
                                            {goal.event}
                                        </span>
                                    )}
                                    {targetDate && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                            isCompleted
                                                ? 'bg-slate-100 text-slate-500'
                                                : isOverdue
                                                    ? 'bg-error-100 text-error-700'
                                                    : isDueSoon
                                                        ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            <Calendar className="w-3 h-3" />
                                            {format(targetDate, 'MMM d, yyyy')}
                                            {isOverdue && ' (overdue)'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>

                        {!readOnly && !isCompleted && (
                            <button
                                onClick={onDelete}
                                className="p-1 text-slate-400 hover:text-error-500 transition-colors flex-shrink-0"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Subgoal Progress */}
                    {subgoals.length > 0 && (
                        <div className="mt-2">
                            <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all ${isCompleted ? 'bg-success-500' : 'bg-brand-500'}`}
                                        style={{ width: `${(completedSubgoals / subgoals.length) * 100}%` }}
                                    />
                                </div>
                                <span className="text-xs text-slate-500">
                                    {completedSubgoals}/{subgoals.length}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Completed Date */}
                    {isCompleted && goal.completed_at && (
                        <p className="text-xs text-success-600 mt-2">
                            Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}
                        </p>
                    )}
                </div>
            </div>

            {/* Expanded Content - Description and Subgoals */}
            {isExpanded && (
                <div className="px-3 pb-3 pl-11 space-y-3">
                    {/* Description */}
                    {goal.description && (
                        <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3">
                            {goal.description}
                        </p>
                    )}

                    {/* Milestones/Subgoals */}
                    {subgoals.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Milestones</p>
                            {subgoals.map(subgoal => {
                                const subgoalDate = subgoal.target_date ? new Date(subgoal.target_date) : null;
                                const subgoalOverdue = subgoalDate && !subgoal.completed_at && isPast(subgoalDate) && !isToday(subgoalDate);

                                return (
                                    <div key={subgoal.id} className="flex items-start gap-2 group">
                                        {!readOnly && (
                                            <button
                                                onClick={() => onToggleSubgoal(subgoal)}
                                                className={`flex-shrink-0 w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors ${
                                                    subgoal.completed_at
                                                        ? 'bg-success-500 border-success-500'
                                                        : 'border-slate-300 hover:border-brand-500'
                                                }`}
                                            >
                                                {subgoal.completed_at && <Check className="w-2.5 h-2.5 text-white" />}
                                            </button>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <span className={`text-sm ${subgoal.completed_at ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                                                {subgoal.title}
                                            </span>
                                            {subgoalDate && (
                                                <span className={`ml-2 text-xs ${
                                                    subgoal.completed_at
                                                        ? 'text-slate-400'
                                                        : subgoalOverdue
                                                            ? 'text-error-600'
                                                            : 'text-slate-400'
                                                }`}>
                                                    {format(subgoalDate, 'MMM d')}
                                                    {subgoalOverdue && ' (overdue)'}
                                                </span>
                                            )}
                                        </div>
                                        {!readOnly && !subgoal.completed_at && (
                                            <button
                                                onClick={() => onDeleteSubgoal(subgoal.id)}
                                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-error-500 transition-all flex-shrink-0"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Milestone */}
                    {!readOnly && !isCompleted && (
                        isAddingSubgoal ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newSubgoalTitle || ''}
                                    onChange={(e) => onNewSubgoalChange?.(e.target.value)}
                                    placeholder="Milestone description..."
                                    className="input text-sm py-1 flex-1"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') onSaveSubgoal?.();
                                        if (e.key === 'Escape') onCancelSubgoal?.();
                                    }}
                                />
                                <button
                                    onClick={onSaveSubgoal}
                                    disabled={creatingSubgoal || !newSubgoalTitle?.trim()}
                                    className="text-xs text-brand-600 hover:text-brand-700"
                                >
                                    {creatingSubgoal ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                                </button>
                                <button
                                    onClick={onCancelSubgoal}
                                    className="text-xs text-slate-500 hover:text-slate-400"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={onAddSubgoal}
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add milestone
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
