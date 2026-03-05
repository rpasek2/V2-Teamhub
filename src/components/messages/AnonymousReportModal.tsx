import { useState } from 'react';
import { X, ShieldAlert, Loader2, Check, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';

interface AnonymousReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    ownerName: string;
}

export function AnonymousReportModal({ isOpen, onClose, hubId, ownerName }: AnonymousReportModalProps) {
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSubmitting(true);
        setError(null);

        const { error: submitError } = await supabase
            .from('anonymous_reports')
            .insert({
                hub_id: hubId,
                message: message.trim()
            });

        setSubmitting(false);

        if (submitError) {
            console.error('Error submitting anonymous report:', submitError);
            setError('Failed to submit report. Please try again.');
            return;
        }

        setSubmitted(true);
    };

    const handleClose = () => {
        setMessage('');
        setSubmitted(false);
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                onClick={handleClose}
            />
            <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-line">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-line px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15">
                            <ShieldAlert className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-heading">Anonymous Report</h3>
                    </div>
                    <button
                        onClick={handleClose}
                        className="rounded-full p-1 text-faint hover:bg-surface-hover hover:text-heading"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {submitted ? (
                        <div className="text-center py-4">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/15 mb-4">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <h4 className="text-lg font-medium text-heading mb-2">Report Submitted</h4>
                            <p className="text-sm text-subtle mb-6">
                                Your anonymous report has been sent to {ownerName}.
                                Since this is anonymous, you won't receive a direct response.
                            </p>
                            <button
                                onClick={handleClose}
                                className="btn-primary w-full"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Info Box */}
                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4 mb-4">
                                <div className="flex gap-3">
                                    <ShieldAlert className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-purple-600">
                                        <p className="font-medium mb-1">Your identity will not be recorded</p>
                                        <p className="opacity-80">
                                            This message will be sent anonymously to <strong>{ownerName}</strong>,
                                            the hub owner. They will not be able to see who sent it.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Warning */}
                            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                                <div className="flex gap-2">
                                    <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-600">
                                        Because this is anonymous, you won't receive a direct reply.
                                        If you need a response, consider sending a direct message instead.
                                    </p>
                                </div>
                            </div>

                            {/* Message Input */}
                            <div className="mb-4">
                                <label htmlFor="report-message" className="block text-sm font-medium text-body mb-2">
                                    Your Message
                                </label>
                                <textarea
                                    id="report-message"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your concern or feedback..."
                                    rows={5}
                                    className="input w-full resize-none"
                                    required
                                />
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !message.trim()}
                                    className="btn-primary flex-1"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Report'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
