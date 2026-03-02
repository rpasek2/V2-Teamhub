import { format } from 'date-fns';
import { FileText, UserCheck, Target, Trophy, ClipboardList, MessageSquare } from 'lucide-react';
import { SKILL_STATUS_CONFIG } from '../../types';
import type { SkillStatus } from '../../types';

interface ReportData {
    gymnast: { first_name: string; last_name: string; level: string | null; gender: string | null };
    included_sections: string[];
    skills?: Record<string, Record<SkillStatus, number> & { total: number }>;
    skill_comments?: Record<string, string | null>;
    attendance?: {
        total_days: number;
        present: number;
        absent: number;
        late: number;
        left_early: number;
        percentage: number;
    };
    assignments?: {
        total_assignments: number;
        completion_rate: number;
    };
    scores?: Array<{
        competition_name: string;
        date: string;
        events: Record<string, number>;
        all_around: number | null;
    }>;
}

interface ReportPreviewProps {
    title: string;
    dateRangeStart: string;
    dateRangeEnd: string;
    coachNotes?: string | null;
    reportData: ReportData;
    createdAt?: string;
}

export function ReportPreview({ title, dateRangeStart, dateRangeEnd, coachNotes, reportData, createdAt }: ReportPreviewProps) {
    const { gymnast, included_sections } = reportData;

    const formatDateRange = () => {
        const start = format(new Date(dateRangeStart + 'T00:00:00'), 'MMM d, yyyy');
        const end = format(new Date(dateRangeEnd + 'T00:00:00'), 'MMM d, yyyy');
        return `${start} — ${end}`;
    };

    return (
        <div className="bg-surface rounded-xl border border-line overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-accent-500 to-accent-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3 mb-2">
                    <FileText className="h-6 w-6" />
                    <h2 className="text-xl font-bold">{title}</h2>
                </div>
                <p className="text-accent-100 text-sm">
                    {gymnast.first_name} {gymnast.last_name} · {gymnast.level || 'No Level'} · {gymnast.gender || ''}
                </p>
                <p className="text-accent-200 text-xs mt-1">{formatDateRange()}</p>
                {createdAt && (
                    <p className="text-accent-200 text-xs mt-1">
                        Generated {format(new Date(createdAt), 'MMM d, yyyy')}
                    </p>
                )}
            </div>

            <div className="p-6 space-y-8">
                {/* Skills Section */}
                {included_sections.includes('skills') && reportData.skills && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5 text-accent-600" />
                            <h3 className="text-lg font-semibold text-heading">Skills Progress</h3>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(reportData.skills).map(([event, counts]) => (
                                <div key={event} className="bg-surface-alt rounded-lg p-4">
                                    <h4 className="font-medium text-heading mb-2 capitalize">{event}</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {(['mastered', 'achieved', 'learning', 'none', 'injured'] as SkillStatus[]).map(status => {
                                            const config = SKILL_STATUS_CONFIG[status];
                                            const count = counts[status] || 0;
                                            if (count === 0 && status === 'injured') return null;
                                            return (
                                                <span
                                                    key={status}
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${config.bgColor} ${config.color}`}
                                                >
                                                    {config.icon && <span>{config.icon}</span>}
                                                    {config.label}: {count}
                                                </span>
                                            );
                                        })}
                                        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm text-muted bg-surface border border-line">
                                            Total: {counts.total}
                                        </span>
                                    </div>
                                    {/* Event comment */}
                                    {reportData.skill_comments?.[event] && (
                                        <div className="mt-3 flex items-start gap-2 bg-surface rounded-lg p-3 border border-line">
                                            <MessageSquare className="h-4 w-4 text-faint mt-0.5 flex-shrink-0" />
                                            <p className="text-sm text-subtle">{reportData.skill_comments[event]}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Attendance Section */}
                {included_sections.includes('attendance') && reportData.attendance && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <UserCheck className="h-5 w-5 text-emerald-600" />
                            <h3 className="text-lg font-semibold text-heading">Attendance</h3>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-surface-alt rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-heading">{reportData.attendance.percentage}%</p>
                                <p className="text-xs text-muted">Attendance Rate</p>
                            </div>
                            <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-emerald-600">{reportData.attendance.present}</p>
                                <p className="text-xs text-muted">Present</p>
                            </div>
                            <div className="bg-red-500/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-red-600">{reportData.attendance.absent}</p>
                                <p className="text-xs text-muted">Absent</p>
                            </div>
                            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-amber-600">{reportData.attendance.late}</p>
                                <p className="text-xs text-muted">Late</p>
                            </div>
                            <div className="bg-blue-500/10 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-600">{reportData.attendance.left_early}</p>
                                <p className="text-xs text-muted">Left Early</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Assignments Section */}
                {included_sections.includes('assignments') && reportData.assignments && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <ClipboardList className="h-5 w-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-heading">Assignments</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-surface-alt rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold text-heading">{reportData.assignments.total_assignments}</p>
                                <p className="text-xs text-muted">Total Assignments</p>
                            </div>
                            <div className="bg-indigo-500/10 rounded-lg p-4 text-center">
                                <p className="text-2xl font-bold text-indigo-600">{reportData.assignments.completion_rate}%</p>
                                <p className="text-xs text-muted">Completion Rate</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Scores Section */}
                {included_sections.includes('scores') && reportData.scores && reportData.scores.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Trophy className="h-5 w-5 text-amber-600" />
                            <h3 className="text-lg font-semibold text-heading">Competition Scores</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-line text-sm">
                                <thead className="bg-surface">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-semibold text-heading">Competition</th>
                                        <th className="px-4 py-2 text-left font-semibold text-heading">Date</th>
                                        {reportData.scores.length > 0 &&
                                            Object.keys(reportData.scores[0].events).map(event => (
                                                <th key={event} className="px-3 py-2 text-center font-semibold text-heading capitalize">
                                                    {event}
                                                </th>
                                            ))
                                        }
                                        <th className="px-3 py-2 text-center font-semibold text-heading">AA</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {reportData.scores.map((comp, i) => (
                                        <tr key={i} className={i % 2 === 0 ? 'bg-surface' : 'bg-surface-alt/50'}>
                                            <td className="px-4 py-2 font-medium text-heading">{comp.competition_name}</td>
                                            <td className="px-4 py-2 text-muted">
                                                {format(new Date(comp.date + 'T00:00:00'), 'MMM d')}
                                            </td>
                                            {Object.values(comp.events).map((score, j) => (
                                                <td key={j} className="px-3 py-2 text-center text-body">
                                                    {score > 0 ? score.toFixed(2) : '—'}
                                                </td>
                                            ))}
                                            <td className="px-3 py-2 text-center font-semibold text-heading">
                                                {comp.all_around ? comp.all_around.toFixed(2) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {/* Coach Notes */}
                {coachNotes && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare className="h-5 w-5 text-subtle" />
                            <h3 className="text-lg font-semibold text-heading">Coach Notes</h3>
                        </div>
                        <div className="bg-surface-alt rounded-lg p-4">
                            <p className="text-sm text-body whitespace-pre-wrap">{coachNotes}</p>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}
