import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Calendar, ChevronRight } from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { isTabEnabled } from '../../lib/permissions';
import { DEFAULT_WAG_SKILL_EVENTS, DEFAULT_MAG_SKILL_EVENTS } from '../../types';
import { getSeasonYearForDate, calculateSeasonDates, DEFAULT_SEASON_CONFIG } from '../../lib/seasons';
import { ReportPreview } from './ReportPreview';

interface CreateReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
    preselectedGymnastId?: string;
}

type DatePreset = 'last_30' | 'last_90' | 'last_month' | 'this_season' | 'custom';
type Step = 'select' | 'preview';

interface GymnastOption {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
    gender: string | null;
}

export function CreateReportModal({ isOpen, onClose, onCreated, preselectedGymnastId }: CreateReportModalProps) {
    const { hub } = useHub();
    const { user } = useAuth();

    const [step, setStep] = useState<Step>('select');
    const [gymnasts, setGymnasts] = useState<GymnastOption[]>([]);
    const [selectedGymnastId, setSelectedGymnastId] = useState(preselectedGymnastId || '');
    const [datePreset, setDatePreset] = useState<DatePreset>('last_30');
    const [customStart, setCustomStart] = useState('');
    const [customEnd, setCustomEnd] = useState('');
    const [title, setTitle] = useState('');
    const [coachNotes, setCoachNotes] = useState('');
    const [reportData, setReportData] = useState<any>(null);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLevel, setSelectedLevel] = useState('');

    const enabledTabs = hub?.settings?.enabledTabs;
    const levels = hub?.settings?.levels || [];

    // Date range calculation
    const { startDate, endDate } = useMemo(() => {
        const today = new Date();
        switch (datePreset) {
            case 'last_30':
                return { startDate: format(subDays(today, 30), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
            case 'last_90':
                return { startDate: format(subDays(today, 90), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
            case 'last_month': {
                const lastMonth = subMonths(today, 1);
                return { startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
            }
            case 'this_season': {
                const config = hub?.settings?.seasonConfig || DEFAULT_SEASON_CONFIG;
                const seasonYear = getSeasonYearForDate(today, config);
                const { startDate: sStart } = calculateSeasonDates(seasonYear, config);
                return { startDate: format(sStart, 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
            }
            case 'custom':
                return { startDate: customStart, endDate: customEnd };
            default:
                return { startDate: '', endDate: '' };
        }
    }, [datePreset, customStart, customEnd, hub?.settings?.seasonConfig]);

    // Fetch gymnasts
    useEffect(() => {
        if (isOpen && hub) fetchGymnasts();
    }, [isOpen, hub]);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setStep('select');
            setSelectedGymnastId(preselectedGymnastId || '');
            setDatePreset('last_30');
            setTitle('');
            setCoachNotes('');
            setReportData(null);
            setError(null);
            setSearchQuery('');
            setSelectedLevel('');
        }
    }, [isOpen, preselectedGymnastId]);

    const fetchGymnasts = async () => {
        if (!hub) return;
        const { data } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level, gender')
            .eq('hub_id', hub.id)
            .order('last_name');
        setGymnasts(data || []);
    };

    const filteredGymnasts = useMemo(() => {
        let result = gymnasts;
        if (selectedLevel) result = result.filter(g => g.level === selectedLevel);
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(g =>
                g.first_name.toLowerCase().includes(q) ||
                g.last_name.toLowerCase().includes(q)
            );
        }
        return result;
    }, [gymnasts, selectedLevel, searchQuery]);

    const selectedGymnast = gymnasts.find(g => g.id === selectedGymnastId);

    // Auto-generate title
    useEffect(() => {
        if (selectedGymnast && startDate && endDate) {
            const start = format(new Date(startDate + 'T00:00:00'), 'MMM d');
            const end = format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy');
            setTitle(`${selectedGymnast.first_name} ${selectedGymnast.last_name} — ${start} to ${end}`);
        }
    }, [selectedGymnast, startDate, endDate]);

    const generateReport = async () => {
        if (!hub || !selectedGymnastId || !startDate || !endDate || !user) return;

        setGenerating(true);
        setError(null);

        try {
            const gymnast = gymnasts.find(g => g.id === selectedGymnastId)!;
            const included_sections: string[] = [];
            const data: any = {
                gymnast: { first_name: gymnast.first_name, last_name: gymnast.last_name, level: gymnast.level, gender: gymnast.gender },
            };

            // Skills
            if (isTabEnabled('skills', enabledTabs)) {
                included_sections.push('skills');

                const gender = (gymnast.gender || 'Female') as 'Female' | 'Male';
                const customEvents = hub.settings?.skillEvents?.[gender];
                const events = customEvents && customEvents.length > 0
                    ? customEvents
                    : (gender === 'Female' ? DEFAULT_WAG_SKILL_EVENTS : DEFAULT_MAG_SKILL_EVENTS);

                // Get all skills for this gymnast's level
                const { data: skillDefs } = await supabase
                    .from('hub_event_skills')
                    .select('id, event, skill_name')
                    .eq('hub_id', hub.id)
                    .eq('level', gymnast.level || '');

                const { data: gymnastSkills } = await supabase
                    .from('gymnast_skills')
                    .select('hub_event_skill_id, status')
                    .eq('gymnast_profile_id', selectedGymnastId)
                    .in('hub_event_skill_id', (skillDefs || []).map(s => s.id));

                // Build skill counts per event
                const skillsByEvent: Record<string, any> = {};
                const statusMap = new Map((gymnastSkills || []).map(gs => [gs.hub_event_skill_id, gs.status]));

                for (const event of events) {
                    const eventSkills = (skillDefs || []).filter(s => s.event === event.id);
                    const counts = { none: 0, learning: 0, achieved: 0, mastered: 0, injured: 0, total: eventSkills.length };
                    for (const skill of eventSkills) {
                        const status = (statusMap.get(skill.id) || 'none') as keyof typeof counts;
                        if (status in counts) counts[status]++;
                    }
                    if (counts.total > 0) {
                        skillsByEvent[event.fullName] = counts;
                    }
                }
                data.skills = skillsByEvent;

                // Skill comments
                const { data: comments } = await supabase
                    .from('gymnast_event_comments')
                    .select('event, comment')
                    .eq('hub_id', hub.id)
                    .eq('gymnast_profile_id', selectedGymnastId);

                const commentMap: Record<string, string | null> = {};
                for (const event of events) {
                    const comment = (comments || []).find(c => c.event === event.id);
                    if (comment?.comment) commentMap[event.fullName] = comment.comment;
                }
                data.skill_comments = commentMap;
            }

            // Attendance
            if (isTabEnabled('attendance', enabledTabs)) {
                included_sections.push('attendance');

                const { data: records } = await supabase
                    .from('attendance_records')
                    .select('status')
                    .eq('hub_id', hub.id)
                    .eq('gymnast_profile_id', selectedGymnastId)
                    .gte('attendance_date', startDate)
                    .lte('attendance_date', endDate);

                const counts = { present: 0, absent: 0, late: 0, left_early: 0 };
                for (const r of (records || [])) {
                    if (r.status in counts) counts[r.status as keyof typeof counts]++;
                }
                const total = (records || []).length;
                data.attendance = {
                    total_days: total,
                    ...counts,
                    percentage: total > 0 ? Math.round(((counts.present + counts.late) / total) * 100) : 0,
                };
            }

            // Assignments
            if (isTabEnabled('assignments', enabledTabs)) {
                included_sections.push('assignments');

                const { data: assignments } = await supabase
                    .from('gymnast_assignments')
                    .select('vault, bars, beam, floor, strength, flexibility, conditioning, completed_items')
                    .eq('gymnast_profile_id', selectedGymnastId)
                    .gte('date', startDate)
                    .lte('date', endDate);

                let totalExercises = 0;
                let totalCompleted = 0;
                const eventKeys = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

                for (const a of (assignments || [])) {
                    for (const event of eventKeys) {
                        const content = (a as any)[event];
                        if (!content) continue;
                        const exerciseCount = content.split('\n').filter((l: string) => l.trim()).length;
                        const completedCount = Math.min(((a.completed_items as any)?.[event] || []).length, exerciseCount);
                        totalExercises += exerciseCount;
                        totalCompleted += completedCount;
                    }
                }

                data.assignments = {
                    total_assignments: (assignments || []).length,
                    completion_rate: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0,
                };
            }

            // Scores
            if (isTabEnabled('scores', enabledTabs)) {
                included_sections.push('scores');

                const { data: scores } = await supabase
                    .from('competition_scores')
                    .select('event, score, competition_id, competitions!inner(name, start_date)')
                    .eq('gymnast_profile_id', selectedGymnastId)
                    .gte('competitions.start_date', startDate)
                    .lte('competitions.start_date', endDate);

                // Group by competition
                const compMap = new Map<string, { name: string; date: string; events: Record<string, number> }>();
                for (const s of (scores || [])) {
                    const comp = (s as any).competitions;
                    if (!compMap.has(s.competition_id)) {
                        compMap.set(s.competition_id, { name: comp.name, date: comp.start_date, events: {} });
                    }
                    const entry = compMap.get(s.competition_id)!;
                    if (s.score) entry.events[s.event] = Number(s.score);
                }

                data.scores = Array.from(compMap.values())
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(comp => ({
                        ...comp,
                        all_around: Object.values(comp.events).length >= 4
                            ? Object.values(comp.events).reduce((sum, v) => sum + v, 0)
                            : null,
                    }));
            }

            data.included_sections = included_sections;
            setReportData(data);
            setStep('preview');
        } catch (err) {
            console.error('Error generating report:', err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const saveReport = async (status: 'draft' | 'published') => {
        if (!hub || !user || !reportData) return;
        setSaving(true);
        setError(null);

        try {
            const { error: insertError } = await supabase
                .from('progress_reports')
                .insert({
                    hub_id: hub.id,
                    gymnast_profile_id: selectedGymnastId,
                    title,
                    date_range_start: startDate,
                    date_range_end: endDate,
                    coach_notes: coachNotes || null,
                    report_data: reportData,
                    status,
                    created_by: user.id,
                    published_at: status === 'published' ? new Date().toISOString() : null,
                });

            if (insertError) throw insertError;
            onCreated();
            onClose();
        } catch (err) {
            console.error('Error saving report:', err);
            setError('Failed to save report.');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-surface shadow-xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-heading">
                        {step === 'select' ? 'Create Progress Report' : 'Preview Report'}
                    </h2>
                    <button onClick={onClose} className="rounded-lg p-2 hover:bg-surface-hover">
                        <X className="h-5 w-5 text-muted" />
                    </button>
                </div>

                {error && (
                    <div className="mx-6 mt-4 rounded-lg bg-error-50 border border-error-200 p-3 text-sm text-error-700">
                        {error}
                    </div>
                )}

                {/* Step 1: Select gymnast and date range */}
                {step === 'select' && (
                    <div className="p-6 space-y-6">
                        {/* Gymnast Selection */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">Gymnast</label>
                            {selectedGymnast ? (
                                <div className="flex items-center justify-between bg-accent-500/10 border border-accent-500/20 rounded-lg px-4 py-3">
                                    <div>
                                        <p className="font-medium text-heading">{selectedGymnast.first_name} {selectedGymnast.last_name}</p>
                                        <p className="text-sm text-muted">{selectedGymnast.level || 'No Level'}</p>
                                    </div>
                                    <button
                                        onClick={() => setSelectedGymnastId('')}
                                        className="text-sm text-accent-600 hover:text-accent-700"
                                    >
                                        Change
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Search gymnasts..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="flex-1 rounded-lg border border-line-strong px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                                        />
                                        {levels.length > 0 && (
                                            <select
                                                value={selectedLevel}
                                                onChange={e => setSelectedLevel(e.target.value)}
                                                className="rounded-lg border border-line-strong px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                                            >
                                                <option value="">All Levels</option>
                                                {levels.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        )}
                                    </div>
                                    <div className="max-h-48 overflow-y-auto rounded-lg border border-line divide-y divide-line">
                                        {filteredGymnasts.map(g => (
                                            <button
                                                key={g.id}
                                                onClick={() => setSelectedGymnastId(g.id)}
                                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover text-left"
                                            >
                                                <span className="text-sm text-heading">{g.last_name}, {g.first_name}</span>
                                                <span className="text-xs text-muted">{g.level}</span>
                                            </button>
                                        ))}
                                        {filteredGymnasts.length === 0 && (
                                            <p className="px-4 py-3 text-sm text-muted text-center">No gymnasts found</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-2">Date Range</label>
                            <div className="flex flex-wrap gap-2 mb-3">
                                {([
                                    { id: 'last_30', label: 'Last 30 Days' },
                                    { id: 'last_90', label: 'Last 90 Days' },
                                    { id: 'last_month', label: 'Last Month' },
                                    { id: 'this_season', label: 'This Season' },
                                    { id: 'custom', label: 'Custom' },
                                ] as { id: DatePreset; label: string }[]).map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setDatePreset(p.id)}
                                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                                            datePreset === p.id
                                                ? 'bg-accent-500 text-white'
                                                : 'bg-surface-hover text-subtle hover:bg-surface-active'
                                        }`}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                            {datePreset === 'custom' && (
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="block text-xs text-muted mb-1">Start</label>
                                        <input
                                            type="date"
                                            value={customStart}
                                            onChange={e => setCustomStart(e.target.value)}
                                            className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-muted mb-1">End</label>
                                        <input
                                            type="date"
                                            value={customEnd}
                                            onChange={e => setCustomEnd(e.target.value)}
                                            className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                            {startDate && endDate && datePreset !== 'custom' && (
                                <div className="flex items-center gap-2 mt-2 text-xs text-muted">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {format(new Date(startDate + 'T00:00:00'), 'MMM d, yyyy')} — {format(new Date(endDate + 'T00:00:00'), 'MMM d, yyyy')}
                                </div>
                            )}
                        </div>

                        {/* Included sections info */}
                        <div className="bg-surface-alt rounded-lg p-4">
                            <p className="text-sm font-medium text-body mb-2">Sections included</p>
                            <div className="flex flex-wrap gap-2">
                                {isTabEnabled('skills', enabledTabs) && (
                                    <span className="inline-flex items-center rounded-full bg-surface border border-line px-3 py-1 text-xs font-medium text-body">Skills</span>
                                )}
                                {isTabEnabled('attendance', enabledTabs) && (
                                    <span className="inline-flex items-center rounded-full bg-surface border border-line px-3 py-1 text-xs font-medium text-body">Attendance</span>
                                )}
                                {isTabEnabled('assignments', enabledTabs) && (
                                    <span className="inline-flex items-center rounded-full bg-surface border border-line px-3 py-1 text-xs font-medium text-body">Assignments</span>
                                )}
                                {isTabEnabled('scores', enabledTabs) && (
                                    <span className="inline-flex items-center rounded-full bg-surface border border-line px-3 py-1 text-xs font-medium text-body">Scores</span>
                                )}
                            </div>
                            <p className="text-xs text-muted mt-2">Based on your hub's enabled tabs</p>
                        </div>

                        {/* Generate button */}
                        <div className="flex justify-end">
                            <button
                                onClick={generateReport}
                                disabled={!selectedGymnastId || !startDate || !endDate || generating}
                                className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                                {generating ? 'Generating...' : 'Generate Preview'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Preview and save */}
                {step === 'preview' && reportData && (
                    <div className="p-6 space-y-6">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">Report Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
                            />
                        </div>

                        {/* Coach Notes */}
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">Coach Notes (optional)</label>
                            <textarea
                                value={coachNotes}
                                onChange={e => setCoachNotes(e.target.value)}
                                rows={3}
                                placeholder="Add personalized notes for the parent..."
                                className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm focus:border-accent-500 focus:ring-1 focus:ring-accent-500 resize-none"
                            />
                        </div>

                        {/* Preview */}
                        <ReportPreview
                            title={title}
                            dateRangeStart={startDate}
                            dateRangeEnd={endDate}
                            coachNotes={coachNotes || null}
                            reportData={reportData}
                        />

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            <button
                                onClick={() => setStep('select')}
                                className="text-sm text-subtle hover:text-heading"
                            >
                                ← Back
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => saveReport('draft')}
                                    disabled={saving}
                                    className="rounded-lg border border-line-strong px-4 py-2 text-sm font-medium text-body hover:bg-surface-hover disabled:opacity-50"
                                >
                                    Save as Draft
                                </button>
                                <button
                                    onClick={() => saveReport('published')}
                                    disabled={saving}
                                    className="flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Publish
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
