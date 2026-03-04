import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Loader2, CheckCircle2, MessageSquareText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';

interface HistoryItem {
    id: string;
    status: string;
    completed_at: string | null;
    responses: { question_id: string; answer: string }[] | null;
    announcement: {
        id: string;
        title: string;
        body: string | null;
        type: string;
        links: { url: string; label: string }[] | null;
        questions: { id: string; type: string; question: string; options?: string[]; required: boolean }[] | null;
        created_at: string;
    };
}

export function AnnouncementHistorySection() {
    const { hub } = useHub();
    const { user } = useAuth();
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (!hub || !user) return;

        const fetchHistory = async () => {
            const { data, error } = await supabase
                .from('announcement_recipients')
                .select('id, status, completed_at, responses, announcements(*)')
                .eq('user_id', user.id)
                .neq('status', 'pending')
                .order('completed_at', { ascending: false });

            if (error) {
                console.error('Error fetching announcement history:', error);
                setLoading(false);
                return;
            }

            const mapped: HistoryItem[] = (data || [])
                .filter(r => {
                    const a = r.announcements as any;
                    return a && a.hub_id === hub.id;
                })
                .map(r => ({
                    id: r.id,
                    status: r.status,
                    completed_at: r.completed_at,
                    responses: r.responses as any,
                    announcement: r.announcements as any,
                }));

            setItems(mapped);
            setLoading(false);
        };

        fetchHistory();
    }, [hub, user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <p className="text-sm text-muted py-4">No past announcements.</p>
        );
    }

    return (
        <div className="space-y-2">
            {items.map(item => {
                const expanded = expandedId === item.id;
                const questions = item.announcement.questions || [];
                const links = item.announcement.links || [];
                const responses = item.responses || [];
                const isQuestionnaire = item.announcement.type === 'questionnaire';

                return (
                    <div key={item.id} className="border border-line rounded-lg overflow-hidden">
                        <button
                            onClick={() => setExpandedId(expanded ? null : item.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-heading truncate">
                                    {item.announcement.title}
                                </p>
                                <p className="text-xs text-muted mt-0.5">
                                    {item.completed_at
                                        ? format(parseISO(item.completed_at), 'MMM d, yyyy')
                                        : format(parseISO(item.announcement.created_at), 'MMM d, yyyy')}
                                </p>
                            </div>
                            {isQuestionnaire ? (
                                <span className="flex items-center gap-1 text-xs font-medium text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                    <MessageSquareText className="h-3 w-3" />
                                    Questionnaire
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs font-medium text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Acknowledged
                                </span>
                            )}
                            <ChevronDown className={`h-4 w-4 text-faint flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                        </button>

                        {expanded && (
                            <div className="px-4 pb-4 border-t border-line pt-3 space-y-3">
                                {item.announcement.body && (
                                    <p className="text-sm text-body whitespace-pre-wrap">{item.announcement.body}</p>
                                )}

                                {links.length > 0 && (
                                    <div className="space-y-1.5">
                                        {links.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                                                {link.label || link.url}
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {isQuestionnaire && questions.length > 0 && (
                                    <div className="space-y-3 pt-1">
                                        <p className="text-xs font-semibold text-muted uppercase tracking-wide">Your Responses</p>
                                        {questions.map((q, idx) => {
                                            const response = responses.find(r => r.question_id === q.id);
                                            return (
                                                <div key={q.id} className="space-y-1">
                                                    <p className="text-sm font-medium text-heading">
                                                        {idx + 1}. {q.question}
                                                    </p>
                                                    <p className="text-sm text-body pl-4">
                                                        {response?.answer || <span className="text-muted italic">No response</span>}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
