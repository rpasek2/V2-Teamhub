import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2 } from 'lucide-react';
import { useHub } from '../../context/HubContext';
import { useCreateTemplate } from '../../hooks/useTemplates';
import type { AssignmentEventType, AssignmentTemplateType, MainStation } from '../../types';
import { ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

interface SaveAsTemplateModalProps {
    event: AssignmentEventType;
    templateType: AssignmentTemplateType;
    exercises?: string;
    stations?: MainStation[];
    onClose: () => void;
    onSaved?: () => void;
}

export function SaveAsTemplateModal({
    event,
    templateType,
    exercises,
    stations,
    onClose,
    onSaved
}: SaveAsTemplateModalProps) {
    const { hub } = useHub();
    const { createTemplate, loading } = useCreateTemplate();
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const colors = ASSIGNMENT_EVENT_COLORS[event];

    const handleSave = async () => {
        if (!hub?.id || !name.trim()) return;

        setError('');
        const result = await createTemplate({
            hub_id: hub.id,
            name: name.trim(),
            event,
            template_type: templateType,
            exercises: templateType === 'checklist' ? exercises : '',
            stations: templateType === 'stations' ? stations : undefined
        });

        if (result) {
            onSaved?.();
            onClose();
        } else {
            setError('Failed to save template. Please try again.');
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="card p-6 max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-heading">Save as Template</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted hover:text-heading hover:bg-surface-hover rounded transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                        {ASSIGNMENT_EVENT_LABELS[event]} — {templateType === 'stations' ? 'Stations' : 'Checklist'}
                    </span>
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-muted mb-2">
                        Template Name
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Warm-up Routine, Competition Prep"
                        className="input w-full"
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && name.trim()) handleSave();
                        }}
                    />
                </div>

                {/* Preview */}
                <div className="mb-4 p-3 bg-surface-alt rounded-lg border border-line max-h-[150px] overflow-y-auto">
                    <p className="text-xs text-muted mb-2">Preview:</p>
                    {templateType === 'checklist' && exercises && (
                        <div className="text-sm text-body space-y-0.5">
                            {exercises.split('\n').filter(l => l.trim()).map((line, i) => (
                                <p key={i} className="truncate">{line}</p>
                            ))}
                        </div>
                    )}
                    {templateType === 'stations' && stations && (
                        <div className="text-sm text-body space-y-1">
                            {stations.map((s, i) => (
                                <div key={s.id} className="flex items-start gap-2">
                                    <span className="w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5">
                                        {i + 1}
                                    </span>
                                    <p className="truncate">{s.content.split('\n')[0]}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <p className="text-sm text-error-500 mb-4">{error}</p>
                )}

                <div className="flex items-center justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="btn-primary"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Template
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
