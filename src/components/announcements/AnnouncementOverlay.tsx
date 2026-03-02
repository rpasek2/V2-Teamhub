import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Megaphone, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import type { PendingAnnouncement, AnnouncementQuestion, QuestionResponse } from '../../types';

export function AnnouncementOverlay() {
    const { hub } = useHub();
    const { user } = useAuth();
    const [pending, setPending] = useState<PendingAnnouncement[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [responses, setResponses] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        if (!hub || !user) return;

        const { data, error } = await supabase
            .from('announcement_recipients')
            .select('id, announcement_id, announcements(*)')
            .eq('user_id', user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('Error fetching pending announcements:', error);
            return;
        }

        const items: PendingAnnouncement[] = (data || [])
            .filter(r => {
                const a = r.announcements as unknown as PendingAnnouncement;
                if (!a || !a.is_active) return false;
                if (a.hub_id !== hub.id) return false;
                if (a.expires_at && new Date(a.expires_at) < new Date()) return false;
                return true;
            })
            .map(r => ({
                ...(r.announcements as unknown as PendingAnnouncement),
                recipient_id: r.id,
            }));

        setPending(items);
        setCurrentIndex(0);
        setResponses({});
    }, [hub, user]);

    useEffect(() => {
        fetchPending();
    }, [fetchPending]);

    const current = pending[currentIndex];
    if (!current) return null;

    const questions: AnnouncementQuestion[] = (current.questions as AnnouncementQuestion[]) || [];

    const handleAcknowledge = async () => {
        setSubmitting(true);
        setError(null);

        // Validate required questions
        if (current.type === 'questionnaire') {
            const missing = questions.filter(q => q.required && !responses[q.id]?.trim());
            if (missing.length > 0) {
                setError('Please answer all required questions.');
                setSubmitting(false);
                return;
            }
        }

        const questionResponses: QuestionResponse[] | null = current.type === 'questionnaire'
            ? questions.map(q => ({ question_id: q.id, answer: responses[q.id] || '' }))
            : null;

        const { error: updateError } = await supabase
            .from('announcement_recipients')
            .update({
                status: current.type === 'questionnaire' ? 'completed' : 'acknowledged',
                responses: questionResponses,
                completed_at: new Date().toISOString(),
            })
            .eq('id', current.recipient_id);

        if (updateError) {
            console.error('Error acknowledging announcement:', updateError);
            setError('Failed to submit. Please try again.');
        } else {
            // Move to next or clear
            setResponses({});
            setError(null);
            if (currentIndex + 1 < pending.length) {
                setCurrentIndex(prev => prev + 1);
            } else {
                setPending([]);
            }
        }
        setSubmitting(false);
    };

    const setResponse = (questionId: string, answer: string) => {
        setResponses(prev => ({ ...prev, [questionId]: answer }));
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop - no click to dismiss */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" aria-hidden="true" />

            {/* Card */}
            <div className="relative w-full max-w-lg transform rounded-xl bg-surface shadow-2xl border border-line max-h-[90vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-line flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                        <Megaphone className="w-5 h-5 text-accent-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-semibold text-heading truncate">{current.title}</h3>
                        {pending.length > 1 && (
                            <p className="text-xs text-muted">
                                {currentIndex + 1} of {pending.length}
                            </p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Message body */}
                    {current.body && (
                        <p className="text-sm text-body whitespace-pre-wrap">{current.body}</p>
                    )}

                    {/* Links */}
                    {current.links && (current.links as { url: string; label: string }[]).length > 0 && (
                        <div className="space-y-2">
                            {(current.links as { url: string; label: string }[]).map((link, idx) => (
                                <a
                                    key={idx}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                                >
                                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                                    {link.label || link.url}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Questions */}
                    {current.type === 'questionnaire' && questions.length > 0 && (
                        <div className="space-y-4">
                            {questions.map((q, idx) => (
                                <div key={q.id} className="space-y-2">
                                    <p className="text-sm font-medium text-heading">
                                        {idx + 1}. {q.question}
                                        {q.required && <span className="text-error-500 ml-1">*</span>}
                                    </p>

                                    {q.type === 'multiple_choice' ? (
                                        <div className="space-y-1.5 pl-4">
                                            {(q.options || []).map((opt, oIdx) => (
                                                <label key={oIdx} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name={`q-${q.id}`}
                                                        checked={responses[q.id] === opt}
                                                        onChange={() => setResponse(q.id, opt)}
                                                        className="text-accent-600 focus:ring-accent-500"
                                                    />
                                                    <span className="text-sm text-body">{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <textarea
                                            value={responses[q.id] || ''}
                                            onChange={e => setResponse(q.id, e.target.value)}
                                            className="input w-full text-sm min-h-[60px] resize-y"
                                            placeholder="Your answer..."
                                            rows={2}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-line flex-shrink-0">
                    <button
                        onClick={handleAcknowledge}
                        disabled={submitting}
                        className="btn-primary w-full justify-center"
                    >
                        {submitting ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                        ) : current.type === 'questionnaire' ? (
                            'Submit Responses'
                        ) : (
                            'I Acknowledge'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
