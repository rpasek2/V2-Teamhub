import { useState, useRef } from 'react';
import { X, Plus, GripVertical, BarChart3 } from 'lucide-react';
import type { PollSettings } from '../../../types';

interface OptionWithId {
    id: number;
    value: string;
}

interface PollCreatorProps {
    onSave: (data: { question: string; options: string[]; settings: PollSettings }) => void;
    onCancel: () => void;
    initialData?: { question: string; options: string[]; settings: PollSettings };
}

export function PollCreator({ onSave, onCancel, initialData }: PollCreatorProps) {
    const nextIdRef = useRef(2);
    const [question, setQuestion] = useState(initialData?.question || '');
    const [options, setOptions] = useState<OptionWithId[]>(
        initialData?.options.map((v, i) => ({ id: i, value: v })) || [{ id: 0, value: '' }, { id: 1, value: '' }]
    );
    const [multipleChoice, setMultipleChoice] = useState(initialData?.settings.multipleChoice || false);
    const [showResultsBeforeVote, setShowResultsBeforeVote] = useState(initialData?.settings.showResultsBeforeVote || false);
    const [allowChangeVote, setAllowChangeVote] = useState(initialData?.settings.allowChangeVote ?? true);

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, { id: nextIdRef.current++, value: '' }]);
        }
    };

    const handleRemoveOption = (id: number) => {
        if (options.length > 2) {
            setOptions(options.filter(o => o.id !== id));
        }
    };

    const handleOptionChange = (id: number, value: string) => {
        setOptions(options.map(o => o.id === id ? { ...o, value } : o));
    };

    const handleSave = () => {
        const filledOptions = options.filter(o => o.value.trim() !== '').map(o => o.value);
        if (question.trim() && filledOptions.length >= 2) {
            onSave({
                question: question.trim(),
                options: filledOptions,
                settings: {
                    multipleChoice,
                    showResultsBeforeVote,
                    allowChangeVote
                }
            });
        }
    };

    const isValid = question.trim() && options.filter(o => o.value.trim()).length >= 2;

    return (
        <div className="rounded-xl border border-purple-200 bg-purple-50/50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-purple-100 border-b border-purple-200">
                <BarChart3 className="h-4 w-4 text-purple-600" />
                <h5 className="text-sm font-semibold text-purple-700">Create Poll</h5>
                <button
                    type="button"
                    onClick={onCancel}
                    className="ml-auto p-1 text-purple-400 hover:text-purple-600 rounded"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="p-4 space-y-4">
                {/* Question */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Question <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-shadow"
                    />
                </div>

                {/* Options */}
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                        Options <span className="text-slate-400">(min 2, max 10)</span>
                    </label>
                    <div className="space-y-2">
                        {options.map((option, index) => (
                            <div key={option.id} className="flex items-center gap-2">
                                <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={option.value}
                                    onChange={(e) => handleOptionChange(option.id, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-shadow"
                                />
                                {options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveOption(option.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 rounded"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {options.length < 10 && (
                        <button
                            type="button"
                            onClick={handleAddOption}
                            className="mt-2 inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add option
                        </button>
                    )}
                </div>

                {/* Settings */}
                <div className="space-y-3 pt-2 border-t border-purple-100">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={multipleChoice}
                            onChange={(e) => setMultipleChoice(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700">Allow multiple selections</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showResultsBeforeVote}
                            onChange={(e) => setShowResultsBeforeVote(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700">Show results before voting</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={allowChangeVote}
                            onChange={(e) => setAllowChangeVote(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                        />
                        <span className="text-sm text-slate-700">Allow changing vote</span>
                    </label>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={!isValid}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Add Poll
                    </button>
                </div>
            </div>
        </div>
    );
}
