import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useRoleChecks } from '../../hooks/useRoleChecks';
import { ReportPreview } from '../progress-reports/ReportPreview';

interface ProgressReport {
    id: string;
    title: string;
    date_range_start: string;
    date_range_end: string;
    coach_notes: string | null;
    report_data: unknown;
    status: 'draft' | 'published';
    published_at: string | null;
    created_at: string;
}

interface GymnastProgressReportsTabProps {
    gymnastProfileId: string;
}

export function GymnastProgressReportsTab({ gymnastProfileId }: GymnastProgressReportsTabProps) {
    const { hub } = useHub();
    const { isParent } = useRoleChecks();
    const [reports, setReports] = useState<ProgressReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState<ProgressReport | null>(null);

    useEffect(() => {
        fetchReports();
    }, [gymnastProfileId, hub]);

    const fetchReports = async () => {
        if (!hub) return;
        setLoading(true);

        let query = supabase
            .from('progress_reports')
            .select('id, title, date_range_start, date_range_end, coach_notes, report_data, status, published_at, created_at')
            .eq('hub_id', hub.id)
            .eq('gymnast_profile_id', gymnastProfileId)
            .order('created_at', { ascending: false });

        // Parents only see published
        if (isParent) {
            query = query.eq('status', 'published');
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching progress reports:', error);
        } else {
            setReports((data || []) as ProgressReport[]);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent" />
            </div>
        );
    }

    if (selectedReport) {
        return (
            <div>
                <button
                    onClick={() => setSelectedReport(null)}
                    className="text-sm text-subtle hover:text-heading mb-4"
                >
                    ← Back to Reports
                </button>
                <ReportPreview
                    title={selectedReport.title}
                    dateRangeStart={selectedReport.date_range_start}
                    dateRangeEnd={selectedReport.date_range_end}
                    coachNotes={selectedReport.coach_notes}
                    reportData={selectedReport.report_data as Parameters<typeof ReportPreview>[0]['reportData']}
                    createdAt={selectedReport.created_at}
                />
            </div>
        );
    }

    if (reports.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-surface-hover p-4">
                    <FileText className="h-8 w-8 text-faint" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-heading">No progress reports</h3>
                <p className="mt-2 text-sm text-muted max-w-sm">
                    {isParent
                        ? 'No progress reports have been shared yet.'
                        : 'No progress reports have been created for this gymnast yet.'}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reports.map(report => (
                <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className="w-full text-left bg-surface rounded-lg border border-line p-4 hover:border-accent-500/50 transition-colors group"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-500/10 flex-shrink-0">
                            <FileText className="h-5 w-5 text-accent-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-medium text-heading group-hover:text-accent-600 transition-colors truncate">
                                    {report.title}
                                </h3>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                                    report.status === 'published'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-amber-500/10 text-amber-600'
                                }`}>
                                    {report.status === 'published' ? 'Published' : 'Draft'}
                                </span>
                            </div>
                            <p className="text-sm text-muted mt-0.5">
                                {format(new Date(report.date_range_start + 'T00:00:00'), 'MMM d')} — {format(new Date(report.date_range_end + 'T00:00:00'), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
