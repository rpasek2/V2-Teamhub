import { useState, useEffect } from 'react';
import { Megaphone, ChevronDown, ChevronUp, Users, Check, X, Loader2, Download } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { Announcement, AnnouncementRecipient, AnnouncementQuestion, QuestionResponse, Profile } from '../../types';

interface AnnouncementWithStats extends Announcement {
    total_recipients: number;
    completed_count: number;
    creator?: Profile;
}

export function ActiveAnnouncementsCard() {
    const { hub } = useHub();
    const [announcements, setAnnouncements] = useState<AnnouncementWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [recipients, setRecipients] = useState<(AnnouncementRecipient & { profiles?: Profile })[]>([]);
    const [loadingRecipients, setLoadingRecipients] = useState(false);

    useEffect(() => {
        if (hub) fetchAnnouncements();
    }, [hub]);

    const fetchAnnouncements = async () => {
        if (!hub) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('announcements')
            .select('*, profiles!announcements_created_by_fkey(id, full_name, avatar_url)')
            .eq('hub_id', hub.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching announcements:', error);
            setLoading(false);
            return;
        }

        // Fetch recipient stats for each announcement
        const announcementIds = (data || []).map(a => a.id);
        if (announcementIds.length === 0) {
            setAnnouncements([]);
            setLoading(false);
            return;
        }

        const { data: recipientStats } = await supabase
            .from('announcement_recipients')
            .select('announcement_id, status')
            .in('announcement_id', announcementIds);

        const statsMap: Record<string, { total: number; completed: number }> = {};
        (recipientStats || []).forEach(r => {
            if (!statsMap[r.announcement_id]) {
                statsMap[r.announcement_id] = { total: 0, completed: 0 };
            }
            statsMap[r.announcement_id].total++;
            if (r.status !== 'pending') statsMap[r.announcement_id].completed++;
        });

        const enriched: AnnouncementWithStats[] = (data || []).map(a => ({
            ...(a as unknown as Announcement),
            creator: a.profiles as unknown as Profile,
            total_recipients: statsMap[a.id]?.total || 0,
            completed_count: statsMap[a.id]?.completed || 0,
        }));

        setAnnouncements(enriched);
        setLoading(false);
    };

    const toggleExpand = async (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setRecipients([]);
            return;
        }
        setExpandedId(id);
        setLoadingRecipients(true);

        const { data } = await supabase
            .from('announcement_recipients')
            .select('*, profiles!announcement_recipients_user_id_profiles_fkey(id, full_name, email)')
            .eq('announcement_id', id)
            .order('status', { ascending: true });

        setRecipients((data || []) as unknown as (AnnouncementRecipient & { profiles?: Profile })[]);
        setLoadingRecipients(false);
    };

    const closeAnnouncement = async (id: string) => {
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: false })
            .eq('id', id);

        if (!error) {
            setAnnouncements(prev => prev.filter(a => a.id !== id));
            if (expandedId === id) {
                setExpandedId(null);
                setRecipients([]);
            }
        }
    };

    const exportCsv = (announcement: AnnouncementWithStats) => {
        const questions: AnnouncementQuestion[] = announcement.questions || [];
        const escapeCsv = (val: string) => `"${val.replace(/"/g, '""')}"`;

        const headers = ['Name', 'Email', 'Status', ...questions.map(q => q.question)];
        const rows = recipients.map(r => {
            const responses: QuestionResponse[] = (r.responses as unknown as QuestionResponse[]) || [];
            const responseMap: Record<string, string> = {};
            responses.forEach(resp => { responseMap[resp.question_id] = resp.answer; });

            return [
                r.profiles?.full_name || '',
                r.profiles?.email || '',
                r.status,
                ...questions.map(q => r.status === 'pending' ? '' : (responseMap[q.id] || '')),
            ];
        });

        const csv = [headers.map(escapeCsv).join(','), ...rows.map(row => row.map(escapeCsv).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${announcement.title.replace(/[^a-zA-Z0-9]/g, '_')}_responses.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (loading) return null;
    if (announcements.length === 0) return null;

    return (
        <div className="card overflow-hidden mb-6">
            <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-brand-50 to-indigo-50 border-b border-slate-200">
                <Megaphone className="w-5 h-5 text-brand-600" />
                <h3 className="text-sm font-semibold text-slate-900">Active Announcements</h3>
                <span className="badge-slate text-xs">{announcements.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
                {announcements.map(a => {
                    const pct = a.total_recipients > 0
                        ? Math.round((a.completed_count / a.total_recipients) * 100)
                        : 0;
                    const isExpanded = expandedId === a.id;

                    return (
                        <div key={a.id}>
                            <div className="px-5 py-3">
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-slate-900 truncate">{a.title}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                a.type === 'questionnaire'
                                                    ? 'bg-indigo-100 text-indigo-700'
                                                    : 'bg-brand-100 text-brand-700'
                                            }`}>
                                                {a.type === 'questionnaire' ? 'Questionnaire' : 'Announcement'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {a.creator?.full_name} &middot; {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Completion rate */}
                                        <div className="text-right">
                                            <p className="text-sm font-semibold text-slate-900">{pct}%</p>
                                            <p className="text-xs text-slate-500">{a.completed_count}/{a.total_recipients}</p>
                                        </div>

                                        {/* Expand */}
                                        <button
                                            onClick={() => toggleExpand(a.id)}
                                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                                        >
                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>

                                        {/* Close */}
                                        <button
                                            onClick={() => closeAnnouncement(a.id)}
                                            className="p-1.5 rounded-lg hover:bg-error-50 text-slate-400 hover:text-error-600"
                                            title="Close announcement"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-brand-500 rounded-full transition-all"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Expanded: recipient list / response table */}
                            {isExpanded && (
                                <div className="px-5 pb-3">
                                    {loadingRecipients ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                                        </div>
                                    ) : a.type === 'questionnaire' && (a.questions || []).length > 0 ? (
                                        /* Spreadsheet-style table for questionnaires */
                                        <div className="space-y-2">
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() => exportCsv(a)}
                                                className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                Export CSV
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="bg-slate-50 border-b border-slate-200">
                                                        <th className="text-left font-semibold text-slate-700 px-3 py-2 sticky left-0 bg-slate-50 min-w-[140px]">
                                                            Respondent
                                                        </th>
                                                        <th className="text-center font-semibold text-slate-700 px-3 py-2 min-w-[80px]">
                                                            Status
                                                        </th>
                                                        {(a.questions || []).map(q => (
                                                            <th key={q.id} className="text-left font-semibold text-slate-700 px-3 py-2 min-w-[160px] max-w-[240px]">
                                                                <span className="line-clamp-2">{q.question}</span>
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {recipients.map(r => {
                                                        const responses: QuestionResponse[] = (r.responses as unknown as QuestionResponse[]) || [];
                                                        const responseMap: Record<string, string> = {};
                                                        responses.forEach(resp => { responseMap[resp.question_id] = resp.answer; });

                                                        return (
                                                            <tr key={r.id} className="hover:bg-slate-50/50">
                                                                <td className="px-3 py-2 sticky left-0 bg-white">
                                                                    <p className="font-medium text-slate-900 truncate">{r.profiles?.full_name}</p>
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <span className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-full ${
                                                                        r.status === 'pending'
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-success-100 text-success-700'
                                                                    }`}>
                                                                        {r.status === 'pending' ? 'Pending' : 'Done'}
                                                                    </span>
                                                                </td>
                                                                {(a.questions || []).map(q => (
                                                                    <td key={q.id} className="px-3 py-2 text-slate-700">
                                                                        {r.status === 'pending' ? (
                                                                            <span className="text-slate-300">&mdash;</span>
                                                                        ) : (
                                                                            responseMap[q.id] || <span className="italic text-slate-400">No answer</span>
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                        </div>
                                    ) : (
                                        /* Simple list for announcements */
                                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                            {recipients.map(r => (
                                                <div key={r.id} className="flex items-center justify-between px-3 py-2">
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-slate-900 truncate">{r.profiles?.full_name}</p>
                                                        <p className="text-xs text-slate-500 truncate">{r.profiles?.email}</p>
                                                    </div>
                                                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                                                        r.status === 'pending'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-success-100 text-success-700'
                                                    }`}>
                                                        {r.status === 'pending' ? (
                                                            <><Users className="w-3 h-3" /> Pending</>
                                                        ) : (
                                                            <><Check className="w-3 h-3" /> Done</>
                                                        )}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
