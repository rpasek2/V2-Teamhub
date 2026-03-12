import { format } from 'date-fns';
import { Calendar, UserCheck, Target, Trophy, ClipboardList, MessageSquare } from 'lucide-react';
import { SKILL_STATUS_CONFIG } from '../../types';
import type { SkillStatus } from '../../types';
import { useHub } from '../../context/HubContext';

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

function AttendanceRing({ percentage }: { percentage: number }) {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;
    const color = percentage >= 90 ? '#10b981' : percentage >= 75 ? '#f59e0b' : '#ef4444';

    return (
        <div className="relative inline-flex items-center justify-center">
            <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
                <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-line" />
                <circle
                    cx="48" cy="48" r={radius} fill="none"
                    stroke={color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-heading">{percentage}%</span>
            </div>
        </div>
    );
}

function SkillBar({ event, counts, comment }: { event: string; counts: Record<SkillStatus, number> & { total: number }; comment?: string | null }) {
    const total = counts.total || 1;
    const statuses: SkillStatus[] = ['mastered', 'achieved', 'learning', 'none', 'injured'];
    const barColors: Record<SkillStatus, string> = {
        mastered: 'bg-yellow-400',
        achieved: 'bg-green-400',
        learning: 'bg-amber-400',
        none: 'bg-surface-active',
        injured: 'bg-red-400',
    };

    return (
        <div className="rounded-xl bg-surface border border-line p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-heading capitalize text-sm">{event}</h4>
                <span className="text-xs text-muted">{total} skills</span>
            </div>

            {/* Stacked horizontal bar */}
            <div className="flex h-3 rounded-full overflow-hidden bg-surface-hover">
                {statuses.map(status => {
                    const count = counts[status] || 0;
                    if (count === 0) return null;
                    const widthPercent = (count / total) * 100;
                    return (
                        <div
                            key={status}
                            className={`${barColors[status]} transition-all duration-500`}
                            style={{ width: `${widthPercent}%` }}
                            title={`${SKILL_STATUS_CONFIG[status].label}: ${count}`}
                        />
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                {statuses.map(status => {
                    const count = counts[status] || 0;
                    if (count === 0 && status === 'injured') return null;
                    const config = SKILL_STATUS_CONFIG[status];
                    return (
                        <div key={status} className="flex items-center gap-1.5">
                            <div className={`h-2.5 w-2.5 rounded-full ${barColors[status]}`} />
                            <span className="text-xs text-muted">{config.label}</span>
                            <span className="text-xs font-semibold text-body">{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Coach comment for this event */}
            {comment && (
                <div className="mt-3 pt-3 border-t border-line">
                    <p className="text-sm text-subtle italic leading-relaxed">"{comment}"</p>
                </div>
            )}
        </div>
    );
}

export function ReportPreview({ title, dateRangeStart, dateRangeEnd, coachNotes, reportData, createdAt }: ReportPreviewProps) {
    const { gymnast, included_sections } = reportData;
    const { hub } = useHub();

    const startFormatted = format(new Date(dateRangeStart + 'T00:00:00'), 'MMMM d, yyyy');
    const endFormatted = format(new Date(dateRangeEnd + 'T00:00:00'), 'MMMM d, yyyy');

    // Count totals across all events for the summary
    const skillTotals = reportData.skills
        ? Object.values(reportData.skills).reduce(
            (acc, counts) => ({
                mastered: acc.mastered + (counts.mastered || 0),
                achieved: acc.achieved + (counts.achieved || 0),
                learning: acc.learning + (counts.learning || 0),
                total: acc.total + counts.total,
            }),
            { mastered: 0, achieved: 0, learning: 0, total: 0 }
        )
        : null;

    return (
        <div className="bg-surface rounded-2xl border border-line overflow-hidden shadow-sm">

            {/* ── Header ─────────────────────────────────── */}
            <div className="relative overflow-hidden">
                {/* Gradient background */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent-500 via-accent-600 to-accent-700" />
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.07]" style={{
                    backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                    backgroundSize: '20px 20px'
                }} />

                <div className="relative px-8 pt-8 pb-6">
                    {/* Hub name */}
                    {hub && (
                        <p className="text-accent-200 text-xs font-medium uppercase tracking-wider mb-4">
                            {hub.name}
                        </p>
                    )}

                    {/* Gymnast name — large and prominent */}
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        {gymnast.first_name} {gymnast.last_name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                        {gymnast.level && (
                            <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white">
                                {gymnast.level}
                            </span>
                        )}
                        {gymnast.gender && (
                            <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-sm font-medium text-white capitalize">
                                {gymnast.gender}
                            </span>
                        )}
                    </div>

                    {/* Report title and date */}
                    <div className="mt-5 pt-5 border-t border-white/15">
                        <h2 className="text-lg font-semibold text-white">{title}</h2>
                        <div className="flex items-center gap-2 mt-1.5">
                            <Calendar className="h-3.5 w-3.5 text-accent-200" />
                            <p className="text-sm text-accent-200">
                                {startFormatted} — {endFormatted}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Quick Summary Stripe ────────────────────── */}
            {(skillTotals || reportData.attendance) && (
                <div className={`grid divide-x divide-line border-b border-line bg-surface-alt ${
                    skillTotals && reportData.attendance ? 'grid-cols-3 sm:grid-cols-6' : skillTotals ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'
                }`}>
                    {skillTotals && (
                        <>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-heading">{skillTotals.total}</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Total Skills</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-yellow-500">{skillTotals.mastered}</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Mastered</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-green-500">{skillTotals.achieved}</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Achieved</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-amber-500">{skillTotals.learning}</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Learning</p>
                            </div>
                        </>
                    )}
                    {reportData.attendance && (
                        <>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-emerald-500">{reportData.attendance.percentage}%</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Attendance</p>
                            </div>
                            <div className="px-4 py-3 text-center">
                                <p className="text-lg font-bold text-heading">{reportData.attendance.total_days}</p>
                                <p className="text-[11px] text-muted uppercase tracking-wide">Total Days</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="p-6 sm:p-8 space-y-10">

                {/* ── Skills Progress ────────────────────────── */}
                {included_sections.includes('skills') && reportData.skills && (
                    <section>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent-500/10">
                                <Target className="h-4.5 w-4.5 text-accent-600" />
                            </div>
                            <h3 className="text-lg font-bold text-heading">Skills Progress</h3>
                        </div>
                        <div className="grid gap-3">
                            {Object.entries(reportData.skills).map(([event, counts]) => (
                                <SkillBar
                                    key={event}
                                    event={event}
                                    counts={counts}
                                    comment={reportData.skill_comments?.[event]}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Attendance ──────────────────────────────── */}
                {included_sections.includes('attendance') && reportData.attendance && (
                    <section>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-emerald-500/10">
                                <UserCheck className="h-4.5 w-4.5 text-emerald-600" />
                            </div>
                            <h3 className="text-lg font-bold text-heading">Attendance</h3>
                        </div>
                        <div className="bg-surface rounded-xl border border-line p-5">
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                {/* Ring chart */}
                                <AttendanceRing percentage={reportData.attendance.percentage} />

                                {/* Breakdown */}
                                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                                    <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/15 p-3">
                                        <p className="text-2xl font-bold text-emerald-600">{reportData.attendance.present}</p>
                                        <p className="text-xs text-muted mt-0.5">Present</p>
                                    </div>
                                    <div className="rounded-lg bg-red-500/8 border border-red-500/15 p-3">
                                        <p className="text-2xl font-bold text-red-500">{reportData.attendance.absent}</p>
                                        <p className="text-xs text-muted mt-0.5">Absent</p>
                                    </div>
                                    <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 p-3">
                                        <p className="text-2xl font-bold text-amber-500">{reportData.attendance.late}</p>
                                        <p className="text-xs text-muted mt-0.5">Late</p>
                                    </div>
                                    <div className="rounded-lg bg-blue-500/8 border border-blue-500/15 p-3">
                                        <p className="text-2xl font-bold text-blue-500">{reportData.attendance.left_early}</p>
                                        <p className="text-xs text-muted mt-0.5">Left Early</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Assignments ─────────────────────────────── */}
                {included_sections.includes('assignments') && reportData.assignments && (
                    <section>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-indigo-500/10">
                                <ClipboardList className="h-4.5 w-4.5 text-indigo-600" />
                            </div>
                            <h3 className="text-lg font-bold text-heading">Assignments</h3>
                        </div>
                        <div className="bg-surface rounded-xl border border-line p-5">
                            <div className="flex items-center gap-6">
                                <div className="flex-1">
                                    <div className="flex items-end gap-2 mb-2">
                                        <span className="text-3xl font-bold text-heading">{reportData.assignments.completion_rate}%</span>
                                        <span className="text-sm text-muted mb-1">completion rate</span>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2.5 rounded-full bg-surface-hover overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                                            style={{ width: `${reportData.assignments.completion_rate}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted mt-2">
                                        {reportData.assignments.total_assignments} total assignments during this period
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Competition Scores ──────────────────────── */}
                {included_sections.includes('scores') && reportData.scores && reportData.scores.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-500/10">
                                <Trophy className="h-4.5 w-4.5 text-amber-600" />
                            </div>
                            <h3 className="text-lg font-bold text-heading">Competition Scores</h3>
                        </div>
                        <div className="bg-surface rounded-xl border border-line overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-surface-alt">
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Competition</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wide">Date</th>
                                            {Object.keys(reportData.scores[0].events).map(event => (
                                                <th key={event} className="px-3 py-3 text-center text-xs font-semibold text-muted uppercase tracking-wide capitalize">
                                                    {event.length <= 2 ? event.toUpperCase() : event}
                                                </th>
                                            ))}
                                            <th className="px-3 py-3 text-center text-xs font-semibold text-accent-600 uppercase tracking-wide">AA</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-line">
                                        {reportData.scores.map((comp, i) => (
                                            <tr key={i} className="hover:bg-surface-hover/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-heading">{comp.competition_name}</td>
                                                <td className="px-4 py-3 text-muted whitespace-nowrap">
                                                    {format(new Date(comp.date + 'T00:00:00'), 'MMM d, yyyy')}
                                                </td>
                                                {Object.values(comp.events).map((score, j) => (
                                                    <td key={j} className="px-3 py-3 text-center text-body tabular-nums">
                                                        {score > 0 ? score.toFixed(2) : <span className="text-faint">—</span>}
                                                    </td>
                                                ))}
                                                <td className="px-3 py-3 text-center font-bold text-heading tabular-nums">
                                                    {comp.all_around ? comp.all_around.toFixed(2) : <span className="text-faint">—</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Coach Notes ─────────────────────────────── */}
                {coachNotes && (
                    <section>
                        <div className="flex items-center gap-2.5 mb-5">
                            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent-500/10">
                                <MessageSquare className="h-4.5 w-4.5 text-accent-600" />
                            </div>
                            <h3 className="text-lg font-bold text-heading">Coach's Notes</h3>
                        </div>
                        <div className="bg-surface rounded-xl border border-line p-5">
                            <div className="border-l-3 border-accent-400 pl-4">
                                <p className="text-body leading-relaxed whitespace-pre-wrap">{coachNotes}</p>
                            </div>
                        </div>
                    </section>
                )}
            </div>

            {/* ── Footer ─────────────────────────────────── */}
            {createdAt && (
                <div className="border-t border-line px-8 py-4 bg-surface-alt">
                    <p className="text-xs text-faint text-center">
                        Report generated {format(new Date(createdAt), 'MMMM d, yyyy')}
                        {hub && <> · {hub.name}</>}
                    </p>
                </div>
            )}
        </div>
    );
}
