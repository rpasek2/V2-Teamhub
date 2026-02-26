import { useState, useEffect, useMemo } from 'react';
import { FileText, Plus, Eye, Trash2, Send } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { CreateReportModal } from '../components/progress-reports/CreateReportModal';
import { ReportPreview } from '../components/progress-reports/ReportPreview';

interface ProgressReport {
    id: string;
    hub_id: string;
    gymnast_profile_id: string;
    title: string;
    date_range_start: string;
    date_range_end: string;
    coach_notes: string | null;
    report_data: any;
    status: 'draft' | 'published';
    created_by: string;
    published_at: string | null;
    created_at: string;
    gymnast_profiles?: { first_name: string; last_name: string; level: string | null };
}

export function ProgressReports() {
    const { hub, linkedGymnasts } = useHub();
    const { isStaff, isParent } = useRoleChecks();

    const [reports, setReports] = useState<ProgressReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [viewingReport, setViewingReport] = useState<ProgressReport | null>(null);
    const [filter, setFilter] = useState<'all' | 'draft' | 'published'>('all');

    useEffect(() => {
        if (hub) fetchReports();
    }, [hub]);

    const fetchReports = async () => {
        if (!hub) return;
        setLoading(true);

        let query = supabase
            .from('progress_reports')
            .select('*, gymnast_profiles!gymnast_profile_id(first_name, last_name, level)')
            .eq('hub_id', hub.id)
            .order('created_at', { ascending: false });

        // Parents only see published reports for their linked gymnasts
        if (isParent) {
            const linkedIds = linkedGymnasts.map(g => g.id);
            query = query.eq('status', 'published').in('gymnast_profile_id', linkedIds.length > 0 ? linkedIds : ['none']);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            setReports((data || []) as ProgressReport[]);
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this progress report?')) return;
        const { error } = await supabase.from('progress_reports').delete().eq('id', id);
        if (!error) fetchReports();
    };

    const handlePublish = async (report: ProgressReport) => {
        const { error } = await supabase
            .from('progress_reports')
            .update({ status: 'published', published_at: new Date().toISOString() })
            .eq('id', report.id);
        if (!error) fetchReports();
    };

    const filteredReports = useMemo(() => {
        if (filter === 'all') return reports;
        return reports.filter(r => r.status === filter);
    }, [reports, filter]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
        );
    }

    // Viewing a specific report
    if (viewingReport) {
        return (
            <div className="h-full flex flex-col">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                    <button
                        onClick={() => setViewingReport(null)}
                        className="text-sm text-slate-600 hover:text-slate-900"
                    >
                        ← Back to Reports
                    </button>
                    {isStaff && viewingReport.status === 'draft' && (
                        <button
                            onClick={() => { handlePublish(viewingReport); setViewingReport(null); }}
                            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                        >
                            <Send className="h-4 w-4" />
                            Publish
                        </button>
                    )}
                </header>
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-3xl mx-auto">
                        <ReportPreview
                            title={viewingReport.title}
                            dateRangeStart={viewingReport.date_range_start}
                            dateRangeEnd={viewingReport.date_range_end}
                            coachNotes={viewingReport.coach_notes}
                            reportData={viewingReport.report_data}
                            createdAt={viewingReport.created_at}
                        />
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <h1 className="text-2xl font-bold text-slate-900">Progress Reports</h1>
                <div className="flex items-center gap-3">
                    {/* Filter (staff only) */}
                    {isStaff && (
                        <div className="flex rounded-lg bg-slate-100 p-1">
                            {(['all', 'published', 'draft'] as const).map(f => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors capitalize ${
                                        filter === f
                                            ? 'bg-white text-slate-900 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900'
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    )}
                    {isStaff && (
                        <button
                            onClick={() => setIsCreateOpen(true)}
                            className="flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
                        >
                            <Plus className="h-4 w-4" />
                            Create Report
                        </button>
                    )}
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {filteredReports.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-4">
                            <FileText className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">No progress reports</h3>
                        <p className="mt-2 text-sm text-slate-500 max-w-sm">
                            {isStaff
                                ? 'Create a progress report to share gymnast progress with parents.'
                                : 'No progress reports have been shared yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-3">
                        {filteredReports.map(report => {
                            const gymnast = report.gymnast_profiles;
                            return (
                                <div
                                    key={report.id}
                                    className="bg-white rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-slate-900 truncate">{report.title}</h3>
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    report.status === 'published'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {report.status === 'published' ? 'Published' : 'Draft'}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {gymnast ? `${gymnast.first_name} ${gymnast.last_name}` : 'Unknown'} · {gymnast?.level || 'No Level'} · {format(new Date(report.date_range_start + 'T00:00:00'), 'MMM d')} — {format(new Date(report.date_range_end + 'T00:00:00'), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => setViewingReport(report)}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                title="View"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {isStaff && report.status === 'draft' && (
                                                <button
                                                    onClick={() => handlePublish(report)}
                                                    className="rounded-lg p-2 text-brand-500 hover:bg-brand-50"
                                                    title="Publish"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </button>
                                            )}
                                            {isStaff && (
                                                <button
                                                    onClick={() => handleDelete(report.id)}
                                                    className="rounded-lg p-2 text-slate-400 hover:bg-error-50 hover:text-error-600"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            <CreateReportModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={fetchReports}
            />
        </div>
    );
}
