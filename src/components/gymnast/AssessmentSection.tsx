import { useState, useEffect } from 'react';
import { Save, Loader2, ClipboardList, TrendingUp, TrendingDown, AlertTriangle, FileText } from 'lucide-react';
import { useAssessment, useUpsertAssessment } from '../../hooks/useAssessments';

interface AssessmentSectionProps {
    gymnastProfileId: string;
    readOnly?: boolean;
}

export function AssessmentSection({ gymnastProfileId, readOnly = false }: AssessmentSectionProps) {
    const { assessment, loading, refetch } = useAssessment({ gymnastProfileId });
    const { upsertAssessment, loading: saving } = useUpsertAssessment();

    const [strengths, setStrengths] = useState('');
    const [weaknesses, setWeaknesses] = useState('');
    const [overallPlan, setOverallPlan] = useState('');
    const [injuries, setInjuries] = useState('');
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (assessment) {
            setStrengths(assessment.strengths || '');
            setWeaknesses(assessment.weaknesses || '');
            setOverallPlan(assessment.overall_plan || '');
            setInjuries(assessment.injuries || '');
        }
    }, [assessment]);

    const handleSave = async () => {
        const result = await upsertAssessment({
            gymnast_profile_id: gymnastProfileId,
            strengths: strengths.trim(),
            weaknesses: weaknesses.trim(),
            overall_plan: overallPlan.trim(),
            injuries: injuries.trim()
        });

        if (result) {
            setIsDirty(false);
            refetch();
        }
    };

    const handleChange = (setter: (value: string) => void, value: string) => {
        setter(value);
        setIsDirty(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-mint-400 animate-spin" />
            </div>
        );
    }

    // Read-only view for parents
    if (readOnly) {
        const hasContent = strengths || weaknesses || overallPlan || injuries;

        if (!hasContent) {
            return (
                <div className="text-center py-8">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                        <ClipboardList className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-sm">No assessment available yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {strengths && (
                    <AssessmentCard
                        icon={<TrendingUp className="w-4 h-4 text-success-400" />}
                        title="Strengths"
                        content={strengths}
                        color="success"
                    />
                )}

                {weaknesses && (
                    <AssessmentCard
                        icon={<TrendingDown className="w-4 h-4 text-amber-400" />}
                        title="Areas for Improvement"
                        content={weaknesses}
                        color="amber"
                    />
                )}

                {overallPlan && (
                    <AssessmentCard
                        icon={<FileText className="w-4 h-4 text-indigo-400" />}
                        title="Training Plan"
                        content={overallPlan}
                        color="indigo"
                    />
                )}

                {injuries && (
                    <AssessmentCard
                        icon={<AlertTriangle className="w-4 h-4 text-error-400" />}
                        title="Injury Notes"
                        content={injuries}
                        color="error"
                    />
                )}
            </div>
        );
    }

    // Editable view for coaches
    return (
        <div className="space-y-4">
            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-success-400 mb-2">
                    <TrendingUp className="w-4 h-4" />
                    Strengths
                </label>
                <textarea
                    value={strengths}
                    onChange={(e) => handleChange(setStrengths, e.target.value)}
                    placeholder="What are this gymnast's strengths?"
                    className="input w-full min-h-[80px] resize-none"
                    rows={3}
                />
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-2">
                    <TrendingDown className="w-4 h-4" />
                    Areas for Improvement
                </label>
                <textarea
                    value={weaknesses}
                    onChange={(e) => handleChange(setWeaknesses, e.target.value)}
                    placeholder="What areas need improvement?"
                    className="input w-full min-h-[80px] resize-none"
                    rows={3}
                />
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-indigo-400 mb-2">
                    <FileText className="w-4 h-4" />
                    Overall Training Plan
                </label>
                <textarea
                    value={overallPlan}
                    onChange={(e) => handleChange(setOverallPlan, e.target.value)}
                    placeholder="What's the training plan for this gymnast?"
                    className="input w-full min-h-[100px] resize-none"
                    rows={4}
                />
            </div>

            <div>
                <label className="flex items-center gap-2 text-sm font-medium text-error-400 mb-2">
                    <AlertTriangle className="w-4 h-4" />
                    Injury Notes
                </label>
                <textarea
                    value={injuries}
                    onChange={(e) => handleChange(setInjuries, e.target.value)}
                    placeholder="Any injury concerns or modifications needed?"
                    className="input w-full min-h-[80px] resize-none"
                    rows={3}
                />
            </div>

            {isDirty && (
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Assessment
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}

interface AssessmentCardProps {
    icon: React.ReactNode;
    title: string;
    content: string;
    color: 'success' | 'amber' | 'indigo' | 'error';
}

function AssessmentCard({ icon, title, content, color }: AssessmentCardProps) {
    const colorClasses = {
        success: 'border-success-500/30 bg-success-500/5',
        amber: 'border-amber-500/30 bg-amber-500/5',
        indigo: 'border-indigo-500/30 bg-indigo-500/5',
        error: 'border-error-500/30 bg-error-500/5'
    };

    return (
        <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <h4 className="text-sm font-medium text-slate-900">{title}</h4>
            </div>
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{content}</p>
        </div>
    );
}
