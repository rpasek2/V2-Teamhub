import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';

interface AnnouncementQuestion {
    id: string;
    type: string;
    question: string;
    options?: string[];
    required: boolean;
}

interface AnnouncementResponsesModalProps {
    isOpen: boolean;
    onClose: () => void;
    announcement: {
        id: string;
        title: string;
        type: string;
        created_at: string;
        is_active: boolean;
        questions: AnnouncementQuestion[] | null;
    };
}

interface RecipientRow {
    id: string;
    user_id: string;
    status: string;
    responses: { question_id: string; answer: string }[] | null;
    completed_at: string | null;
    profiles: { full_name: string | null } | null;
}

export function AnnouncementResponsesModal({ isOpen, onClose, announcement }: AnnouncementResponsesModalProps) {
    const [recipients, setRecipients] = useState<RecipientRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) {
            setRecipients([]);
            setLoading(true);
            return;
        }

        const fetchRecipients = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('announcement_recipients')
                .select('id, user_id, status, responses, completed_at, profiles:user_id(full_name)')
                .eq('announcement_id', announcement.id)
                .order('completed_at', { ascending: true, nullsFirst: false });

            if (error) {
                console.error('Error fetching announcement recipients:', error);
            } else {
                setRecipients((data as unknown as RecipientRow[]) || []);
            }
            setLoading(false);
        };

        fetchRecipients();
    }, [isOpen, announcement.id]);

    const totalCount = recipients.length;
    const acknowledgedCount = recipients.filter(r => r.status !== 'pending').length;
    const pendingCount = totalCount - acknowledgedCount;
    const responseRate = totalCount > 0 ? Math.round((acknowledgedCount / totalCount) * 100) : 0;

    const questions = announcement.questions || [];
    const isQuestionnaire = announcement.type === 'questionnaire' && questions.length > 0;

    const completedRecipients = recipients.filter(r => r.status !== 'pending');
    const pendingRecipients = recipients.filter(r => r.status === 'pending');

    const getName = (r: RecipientRow): string =>
        r.profiles?.full_name || 'Unknown';

    const getAnswer = (r: RecipientRow, questionId: string): string => {
        if (!r.responses) return '';
        const resp = r.responses.find(res => res.question_id === questionId);
        return resp?.answer || '';
    };

    const truncate = (text: string, max: number): string =>
        text.length > max ? text.slice(0, max) + '...' : text;

    // Aggregate multiple-choice results
    const getAggregatedResults = (question: AnnouncementQuestion) => {
        const options = question.options || [];
        const counts: Record<string, number> = {};
        for (const opt of options) {
            counts[opt] = 0;
        }
        for (const r of completedRecipients) {
            const answer = getAnswer(r, question.id);
            if (answer && counts[answer] !== undefined) {
                counts[answer]++;
            }
        }
        const total = completedRecipients.length;
        return options.map(opt => ({
            option: opt,
            count: counts[opt] || 0,
            percentage: total > 0 ? Math.round(((counts[opt] || 0) / total) * 100) : 0,
        }));
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={announcement.title} size="xl">
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-muted" />
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Header area: status badge + date */}
                    <div className="flex items-center gap-3">
                        {announcement.is_active ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-500/10 px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-500/10 px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                Expired
                            </span>
                        )}
                        <span className="text-sm text-muted">
                            Created {format(parseISO(announcement.created_at), 'MMM d, yyyy')}
                        </span>
                    </div>

                    {/* Summary stats bar */}
                    <div className="flex gap-3">
                        <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                            <p className="text-2xl font-bold text-heading">{totalCount}</p>
                            <p className="text-xs text-muted mt-0.5">Total</p>
                        </div>
                        <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                            <p className="text-2xl font-bold text-green-600">{acknowledgedCount}</p>
                            <p className="text-xs text-muted mt-0.5">Acknowledged</p>
                        </div>
                        <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
                            <p className="text-xs text-muted mt-0.5">Pending</p>
                        </div>
                        {isQuestionnaire && (
                            <div className="flex-1 rounded-lg border border-line bg-surface p-3 text-center">
                                <p className="text-2xl font-bold text-accent-600">{responseRate}%</p>
                                <p className="text-xs text-muted mt-0.5">Response Rate</p>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    {isQuestionnaire ? (
                        <div className="space-y-6">
                            {/* Aggregated results for multiple-choice questions */}
                            {questions.filter(q => q.type === 'multiple_choice').length > 0 && (
                                <div className="space-y-5">
                                    <h4 className="text-sm font-semibold text-heading uppercase tracking-wide">
                                        Poll Results
                                    </h4>
                                    {questions
                                        .filter(q => q.type === 'multiple_choice')
                                        .map(q => {
                                            const results = getAggregatedResults(q);
                                            return (
                                                <div key={q.id} className="space-y-2">
                                                    <p className="text-sm font-medium text-heading">{q.question}</p>
                                                    <div className="space-y-1.5">
                                                        {results.map(r => (
                                                            <div key={r.option} className="flex items-center gap-3">
                                                                <span className="text-sm text-body w-32 flex-shrink-0 truncate" title={r.option}>
                                                                    {r.option}
                                                                </span>
                                                                <div className="flex-1 h-6 rounded-full bg-surface-hover overflow-hidden">
                                                                    {r.percentage > 0 && (
                                                                        <div
                                                                            className="h-full rounded-full bg-accent-500 transition-all duration-300"
                                                                            style={{ width: `${r.percentage}%` }}
                                                                        />
                                                                    )}
                                                                </div>
                                                                <span className="text-sm text-muted w-16 text-right flex-shrink-0">
                                                                    {r.percentage}% ({r.count})
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}

                            {/* Response table */}
                            <div>
                                <h4 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">
                                    Individual Responses
                                </h4>
                                <div className="overflow-x-auto border border-line rounded-lg">
                                    <table className="min-w-full text-sm">
                                        <thead>
                                            <tr className="bg-surface-hover">
                                                <th className="sticky left-0 bg-surface-hover text-left px-4 py-2.5 font-medium text-heading border-b border-line whitespace-nowrap z-10">
                                                    Name
                                                </th>
                                                {questions.map((q, idx) => (
                                                    <th
                                                        key={q.id}
                                                        className="text-left px-4 py-2.5 font-medium text-heading border-b border-line whitespace-nowrap"
                                                        title={q.question}
                                                    >
                                                        Q{idx + 1}: {truncate(q.question, 30)}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-line">
                                            {completedRecipients.map(r => (
                                                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                                                    <td className="sticky left-0 bg-surface px-4 py-2.5 text-body font-medium whitespace-nowrap z-10">
                                                        {getName(r)}
                                                    </td>
                                                    {questions.map(q => (
                                                        <td key={q.id} className="px-4 py-2.5 text-body whitespace-nowrap">
                                                            {getAnswer(r, q.id) || <span className="text-faint">—</span>}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {pendingRecipients.map(r => (
                                                <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                                                    <td className="sticky left-0 bg-surface px-4 py-2.5 text-muted italic whitespace-nowrap z-10">
                                                        {getName(r)}
                                                    </td>
                                                    {questions.map(q => (
                                                        <td key={q.id} className="px-4 py-2.5 text-faint whitespace-nowrap">
                                                            —
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                            {recipients.length === 0 && (
                                                <tr>
                                                    <td
                                                        colSpan={questions.length + 1}
                                                        className="px-4 py-8 text-center text-muted"
                                                    >
                                                        No recipients found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Acknowledgement list */
                        <div>
                            <h4 className="text-sm font-semibold text-heading uppercase tracking-wide mb-3">
                                Recipients
                            </h4>
                            <div className="border border-line rounded-lg divide-y divide-line">
                                {completedRecipients.map(r => (
                                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm font-medium text-heading">{getName(r)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                <CheckCircle2 className="h-3 w-3" />
                                                Acknowledged
                                            </span>
                                            <span className="text-xs text-muted">
                                                {r.completed_at
                                                    ? format(parseISO(r.completed_at), 'MMM d, yyyy')
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                {pendingRecipients.map(r => (
                                    <div key={r.id} className="flex items-center justify-between px-4 py-3">
                                        <span className="text-sm text-muted italic">{getName(r)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                                <Clock className="h-3 w-3" />
                                                Pending
                                            </span>
                                            <span className="text-xs text-muted">—</span>
                                        </div>
                                    </div>
                                ))}
                                {recipients.length === 0 && (
                                    <div className="px-4 py-8 text-center text-muted text-sm">
                                        No recipients found.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
}
