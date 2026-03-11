import { useState, useEffect } from 'react';
import { ChevronDown, ExternalLink, Loader2, CheckCircle2, MessageSquareText, Megaphone, XCircle, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { AnnouncementResponsesModal } from './AnnouncementResponsesModal';

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

interface CreatedAnnouncement {
    id: string;
    title: string;
    body: string | null;
    type: string;
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
    links: { url: string; label: string }[] | null;
    questions: { id: string; type: string; question: string; options?: string[]; required: boolean }[] | null;
    recipient_count: number;
    acknowledged_count: number;
}

interface AnnouncementRow {
    id: string;
    title: string;
    body: string | null;
    type: string;
    is_active: boolean;
    created_at: string;
    expires_at: string | null;
    links: unknown;
    questions: unknown;
    announcement_recipients: { id: string; status: string }[];
}

export function AnnouncementHistorySection() {
    const { hub, currentRole } = useHub();
    const { user } = useAuth();
    const isOwnerOrDirector = currentRole === 'owner' || currentRole === 'director';

    const [items, setItems] = useState<HistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [createdAnnouncements, setCreatedAnnouncements] = useState<CreatedAnnouncement[]>([]);
    const [loadingCreated, setLoadingCreated] = useState(false);
    const [expandedCreatedId, setExpandedCreatedId] = useState<string | null>(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<CreatedAnnouncement | null>(null);
    const [endingId, setEndingId] = useState<string | null>(null);

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

            interface RecipientRow {
                id: string;
                status: string;
                completed_at: string | null;
                responses: unknown;
                announcements: {
                    id: string;
                    title: string;
                    body: string | null;
                    type: string;
                    hub_id: string;
                    links: unknown;
                    questions: unknown;
                    created_at: string;
                } | null;
            }

            const mapped: HistoryItem[] = ((data || []) as unknown as RecipientRow[])
                .filter(r => {
                    const a = r.announcements;
                    return a && a.hub_id === hub.id;
                })
                .map(r => ({
                    id: r.id,
                    status: r.status,
                    completed_at: r.completed_at,
                    responses: r.responses as HistoryItem['responses'],
                    announcement: r.announcements as unknown as HistoryItem['announcement'],
                }));

            setItems(mapped);
            setLoading(false);
        };

        const fetchCreated = async () => {
            if (!isOwnerOrDirector) return;
            setLoadingCreated(true);

            const { data: created } = await supabase
                .from('announcements')
                .select('id, title, body, type, is_active, created_at, expires_at, links, questions, announcement_recipients(id, status)')
                .eq('hub_id', hub.id)
                .eq('created_by', user.id)
                .order('created_at', { ascending: false });

            if (created) {
                setCreatedAnnouncements((created as AnnouncementRow[]).map(a => ({
                    id: a.id,
                    title: a.title,
                    body: a.body,
                    type: a.type,
                    is_active: a.is_active,
                    created_at: a.created_at,
                    expires_at: a.expires_at,
                    links: a.links as CreatedAnnouncement['links'],
                    questions: a.questions as CreatedAnnouncement['questions'],
                    recipient_count: a.announcement_recipients?.length || 0,
                    acknowledged_count: a.announcement_recipients?.filter(r => r.status !== 'pending').length || 0,
                })));
            }
            setLoadingCreated(false);
        };

        fetchHistory();
        fetchCreated();
    }, [hub, user, isOwnerOrDirector]);

    const handleEndAnnouncement = async (id: string) => {
        if (!confirm('Are you sure you want to end this announcement? Recipients who haven\'t responded will no longer see it.')) return;
        setEndingId(id);
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: false })
            .eq('id', id);
        if (!error) {
            setCreatedAnnouncements(prev => prev.map(a => a.id === id ? { ...a, is_active: false } : a));
        }
        setEndingId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Your Announcements — owner/director only */}
            {isOwnerOrDirector && (
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-3">
                        <Megaphone className="h-4 w-4 text-accent-600" />
                        <h3 className="text-sm font-semibold text-heading">Your Announcements</h3>
                    </div>

                    {loadingCreated ? (
                        <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted" />
                        </div>
                    ) : createdAnnouncements.length === 0 ? (
                        <p className="text-sm text-muted py-4">You haven&apos;t created any announcements yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {createdAnnouncements.map(ann => {
                                const expanded = expandedCreatedId === ann.id;
                                const isQuestionnaire = ann.type === 'questionnaire';
                                const links = ann.links || [];

                                return (
                                    <div key={ann.id} className="border border-line rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpandedCreatedId(expanded ? null : ann.id)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-heading truncate">
                                                    {ann.title}
                                                </p>
                                                <p className="text-xs text-muted mt-0.5">
                                                    {format(parseISO(ann.created_at), 'MMM d, yyyy')}
                                                </p>
                                            </div>

                                            {/* Type badge */}
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

                                            {/* Status badge */}
                                            {ann.is_active ? (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 flex-shrink-0">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1.5 text-xs font-medium text-muted flex-shrink-0">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                                                    Expired
                                                </span>
                                            )}

                                            {/* Completion fraction */}
                                            <span className="text-xs font-medium text-muted flex-shrink-0">
                                                {ann.acknowledged_count}/{ann.recipient_count}
                                            </span>

                                            <ChevronDown className={`h-4 w-4 text-faint flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                                        </button>

                                        {expanded && (
                                            <div className="px-4 pb-4 border-t border-line pt-3 space-y-3">
                                                {ann.body && (
                                                    <p className="text-sm text-body whitespace-pre-wrap">{ann.body}</p>
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

                                                <div className="flex items-center gap-2 pt-1">
                                                    <button
                                                        onClick={() => setSelectedAnnouncement(ann)}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-accent-600 hover:bg-accent-700 rounded-lg transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                        View Responses
                                                    </button>

                                                    {ann.is_active && (
                                                        <button
                                                            onClick={() => handleEndAnnouncement(ann.id)}
                                                            disabled={endingId === ann.id}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                                                        >
                                                            {endingId === ann.id ? (
                                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                            ) : (
                                                                <XCircle className="h-3.5 w-3.5" />
                                                            )}
                                                            End Announcement
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Divider + subheader when owner/director */}
            {isOwnerOrDirector && (
                <div>
                    <div className="border-t border-line" />
                    <h3 className="text-sm font-semibold text-heading mt-4 mb-2">Received Announcements</h3>
                </div>
            )}

            {/* Existing received announcements */}
            {items.length === 0 ? (
                <p className="text-sm text-muted py-4">No past announcements.</p>
            ) : (
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
            )}

            {/* Announcement Responses Modal */}
            {selectedAnnouncement && (
                <AnnouncementResponsesModal
                    isOpen={!!selectedAnnouncement}
                    onClose={() => setSelectedAnnouncement(null)}
                    announcement={selectedAnnouncement}
                />
            )}
        </div>
    );
}
