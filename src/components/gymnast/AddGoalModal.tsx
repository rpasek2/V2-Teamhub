import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Plus, Trash2, Calendar, Target } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface SubgoalInput {
    id: string;
    title: string;
    target_date: string;
}

interface AddGoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    gymnastProfileId: string;
}

// Event options for gymnastics (combined WAG and MAG plus general categories)
// value = database value (lowercase), label = display label
const EVENT_OPTIONS: { value: string; label: string }[] = [
    { value: 'vault', label: 'Vault' },
    { value: 'bars', label: 'Bars' },
    { value: 'beam', label: 'Beam' },
    { value: 'floor', label: 'Floor' },
    { value: 'pommel', label: 'Pommel Horse' },
    { value: 'rings', label: 'Rings' },
    { value: 'pbars', label: 'Parallel Bars' },
    { value: 'highbar', label: 'High Bar' },
    { value: 'overall', label: 'Overall' },
    { value: 'strength', label: 'Strength' },
    { value: 'flexibility', label: 'Flexibility' },
    { value: 'mental', label: 'Mental' },
    { value: 'competition', label: 'Competition' }
];

export function AddGoalModal({
    isOpen,
    onClose,
    onSaved,
    gymnastProfileId
}: AddGoalModalProps) {
    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [event, setEvent] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [subgoals, setSubgoals] = useState<SubgoalInput[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const addSubgoal = () => {
        setSubgoals(prev => [
            ...prev,
            { id: crypto.randomUUID(), title: '', target_date: '' }
        ]);
    };

    const updateSubgoal = (id: string, field: 'title' | 'target_date', value: string) => {
        setSubgoals(prev =>
            prev.map(sg => sg.id === id ? { ...sg, [field]: value } : sg)
        );
    };

    const removeSubgoal = (id: string) => {
        setSubgoals(prev => prev.filter(sg => sg.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title.trim()) {
            setError('Please enter a goal title');
            return;
        }

        setError('');
        setSaving(true);

        try {
            // Create the goal
            const insertData = {
                gymnast_profile_id: gymnastProfileId,
                title: title.trim(),
                description: description.trim() || null,
                event: event || null,
                target_date: targetDate || null,
                created_by: user?.id || null
            };

            const { data: goalData, error: goalError } = await supabase
                .from('gymnast_goals')
                .insert(insertData)
                .select('id')
                .single();

            if (goalError) {
                console.error('Goal insert error:', goalError);
                throw new Error(goalError.message || 'Failed to create goal');
            }

            // Create subgoals if any
            const validSubgoals = subgoals.filter(sg => sg.title.trim());
            if (validSubgoals.length > 0 && goalData) {
                const subgoalsToInsert = validSubgoals.map(sg => ({
                    goal_id: goalData.id,
                    title: sg.title.trim(),
                    target_date: sg.target_date || null
                }));

                const { error: subgoalError } = await supabase
                    .from('gymnast_subgoals')
                    .insert(subgoalsToInsert);

                if (subgoalError) {
                    console.error('Error creating subgoals:', subgoalError);
                }
            }

            onSaved();
            onClose();
        } catch (err: unknown) {
            console.error('Error creating goal:', err);
            const errorMessage = err instanceof Error ? err.message :
                (typeof err === 'object' && err !== null && 'message' in err) ? String((err as {message: unknown}).message) :
                'Failed to create goal';
            setError(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Quick date helpers
    const setQuickDate = (months: number) => {
        const date = addMonths(new Date(), months);
        setTargetDate(format(date, 'yyyy-MM-dd'));
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
                            <Target className="w-5 h-5 text-brand-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-900">Add Goal</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Goal Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Goal *
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Make Nationals, Score 9.5+ on Beam"
                            className="input w-full"
                            autoFocus
                        />
                    </div>

                    {/* Event Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Event (optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {EVENT_OPTIONS.map((evt) => (
                                <button
                                    key={evt.value}
                                    type="button"
                                    onClick={() => setEvent(event === evt.value ? '' : evt.value)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        event === evt.value
                                            ? 'bg-brand-100 text-brand-700 border-2 border-brand-300'
                                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                    }`}
                                >
                                    {evt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Target Date
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setQuickDate(1)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            >
                                1 month
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate(3)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            >
                                3 months
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate(6)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            >
                                6 months
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate(12)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded transition-colors"
                            >
                                1 year
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type="date"
                                value={targetDate}
                                onChange={(e) => setTargetDate(e.target.value)}
                                className="input w-full pl-10"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Notes (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add any additional details about this goal..."
                            rows={2}
                            className="input w-full resize-none"
                        />
                    </div>

                    {/* Milestones/Subgoals */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-slate-700">
                                Milestones
                            </label>
                            <button
                                type="button"
                                onClick={addSubgoal}
                                className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700"
                            >
                                <Plus className="w-4 h-4" />
                                Add Milestone
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            Break down your goal into smaller, dated milestones
                        </p>

                        {subgoals.length > 0 && (
                            <div className="space-y-3">
                                {subgoals.map((subgoal, index) => (
                                    <div
                                        key={subgoal.id}
                                        className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200"
                                    >
                                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-medium flex items-center justify-center mt-1">
                                            {index + 1}
                                        </span>
                                        <div className="flex-1 space-y-2">
                                            <input
                                                type="text"
                                                value={subgoal.title}
                                                onChange={(e) => updateSubgoal(subgoal.id, 'title', e.target.value)}
                                                placeholder="Milestone description..."
                                                className="input w-full text-sm"
                                            />
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                <input
                                                    type="date"
                                                    value={subgoal.target_date}
                                                    onChange={(e) => updateSubgoal(subgoal.id, 'target_date', e.target.value)}
                                                    className="input text-sm py-1 flex-1"
                                                />
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeSubgoal(subgoal.id)}
                                            className="p-1 text-slate-400 hover:text-error-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {subgoals.length === 0 && (
                            <button
                                type="button"
                                onClick={addSubgoal}
                                className="w-full p-4 border-2 border-dashed border-slate-200 rounded-lg text-slate-500 hover:border-brand-300 hover:text-brand-600 transition-colors text-sm"
                            >
                                <Plus className="w-5 h-5 mx-auto mb-1" />
                                Add a milestone to track progress
                            </button>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !title.trim()}
                            className="btn-primary"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Goal
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
