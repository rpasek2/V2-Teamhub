import { useState } from 'react';
import { Plus, Check, Trash2, ChevronDown, ChevronRight, Loader2, Target } from 'lucide-react';
import { format } from 'date-fns';
import { useGoals, useCreateGoal, useDeleteGoal, useToggleGoalCompletion, useCreateSubgoal, useToggleSubgoalCompletion, useDeleteSubgoal } from '../../hooks/useGoals';
import type { GymnastGoal, GymnastSubgoal } from '../../types';

interface GoalsSectionProps {
    gymnastProfileId: string;
    readOnly?: boolean;
}

export function GoalsSection({ gymnastProfileId, readOnly = false }: GoalsSectionProps) {
    const { goals, loading, refetch } = useGoals({ gymnastProfileId });
    const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [isAddingGoal, setIsAddingGoal] = useState(false);
    const [addingSubgoalTo, setAddingSubgoalTo] = useState<string | null>(null);
    const [newSubgoalTitle, setNewSubgoalTitle] = useState('');

    const { createGoal, loading: creatingGoal } = useCreateGoal();
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

    const handleAddGoal = async () => {
        if (!newGoalTitle.trim()) return;

        const result = await createGoal({
            gymnast_profile_id: gymnastProfileId,
            title: newGoalTitle.trim()
        });

        if (result) {
            setNewGoalTitle('');
            setIsAddingGoal(false);
            refetch();
        }
    };

    const handleToggleGoal = async (goal: GymnastGoal) => {
        await toggleGoalCompletion(goal.id, !!goal.completed_at);
        refetch();
    };

    const handleDeleteGoal = async (goalId: string) => {
        if (!confirm('Delete this goal and all its subgoals?')) return;
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
                <Loader2 className="w-6 h-6 text-mint-400 animate-spin" />
            </div>
        );
    }

    const activeGoals = goals.filter(g => !g.completed_at);
    const completedGoals = goals.filter(g => g.completed_at);

    return (
        <div className="space-y-4">
            {/* Add Goal */}
            {!readOnly && (
                <div>
                    {isAddingGoal ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newGoalTitle}
                                onChange={(e) => setNewGoalTitle(e.target.value)}
                                placeholder="Goal title..."
                                className="input flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddGoal();
                                    if (e.key === 'Escape') {
                                        setIsAddingGoal(false);
                                        setNewGoalTitle('');
                                    }
                                }}
                            />
                            <button
                                onClick={handleAddGoal}
                                disabled={creatingGoal || !newGoalTitle.trim()}
                                className="btn-primary py-2"
                            >
                                {creatingGoal ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                            </button>
                            <button
                                onClick={() => {
                                    setIsAddingGoal(false);
                                    setNewGoalTitle('');
                                }}
                                className="btn-ghost py-2"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsAddingGoal(true)}
                            className="flex items-center gap-2 text-sm text-mint-600 hover:text-mint-500 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Goal
                        </button>
                    )}
                </div>
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
                            onClick={() => setIsAddingGoal(true)}
                            className="mt-3 text-sm text-mint-600 hover:text-mint-500"
                        >
                            Add your first goal
                        </button>
                    )}
                </div>
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

    return (
        <div className={`rounded-lg border ${isCompleted ? 'border-success-500/30 bg-success-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-start gap-3 p-3">
                {/* Checkbox */}
                {!readOnly && (
                    <button
                        onClick={onToggleComplete}
                        className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-colors ${
                            isCompleted
                                ? 'bg-success-500 border-success-500'
                                : 'border-slate-300 hover:border-mint-500'
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
                            className="flex items-center gap-1 text-left"
                        >
                            {subgoals.length > 0 && (
                                isExpanded
                                    ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            )}
                            <span className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                {goal.title}
                            </span>
                        </button>

                        {!readOnly && !isCompleted && (
                            <button
                                onClick={onDelete}
                                className="p-1 text-slate-500 hover:text-error-400 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Subgoal Progress */}
                    {subgoals.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                            {completedSubgoals}/{subgoals.length} steps completed
                        </p>
                    )}

                    {/* Completed Date */}
                    {isCompleted && goal.completed_at && (
                        <p className="text-xs text-success-400 mt-1">
                            Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}
                        </p>
                    )}
                </div>
            </div>

            {/* Subgoals */}
            {isExpanded && (
                <div className="px-3 pb-3 pl-11 space-y-2">
                    {subgoals.map(subgoal => (
                        <div key={subgoal.id} className="flex items-center gap-2 group">
                            {!readOnly && (
                                <button
                                    onClick={() => onToggleSubgoal(subgoal)}
                                    className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                        subgoal.completed_at
                                            ? 'bg-success-500 border-success-500'
                                            : 'border-slate-300 hover:border-mint-500'
                                    }`}
                                >
                                    {subgoal.completed_at && <Check className="w-2.5 h-2.5 text-white" />}
                                </button>
                            )}
                            <span className={`text-sm flex-1 ${subgoal.completed_at ? 'text-slate-500 line-through' : 'text-slate-600'}`}>
                                {subgoal.title}
                            </span>
                            {!readOnly && !subgoal.completed_at && (
                                <button
                                    onClick={() => onDeleteSubgoal(subgoal.id)}
                                    className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-error-400 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add Subgoal */}
                    {!readOnly && !isCompleted && (
                        isAddingSubgoal ? (
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newSubgoalTitle || ''}
                                    onChange={(e) => onNewSubgoalChange?.(e.target.value)}
                                    placeholder="Step title..."
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
                                    className="text-xs text-mint-600 hover:text-mint-500"
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
                                className="flex items-center gap-1 text-xs text-slate-500 hover:text-mint-600 transition-colors"
                            >
                                <Plus className="w-3 h-3" />
                                Add step
                            </button>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
