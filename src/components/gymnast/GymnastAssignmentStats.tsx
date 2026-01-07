import { useState, useEffect, useMemo } from 'react';
import { format, subDays, parseISO, isAfter } from 'date-fns';
import { BarChart3, Calendar, TrendingUp, CheckCircle2, Target, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { AssignmentEventType, CompletedItems } from '../../types';
import { ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

const ASSIGNMENT_EVENTS: AssignmentEventType[] = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

const EVENT_BAR_COLORS: Record<AssignmentEventType, string> = {
    vault: 'bg-emerald-500',
    bars: 'bg-sky-500',
    beam: 'bg-pink-500',
    floor: 'bg-amber-500',
    strength: 'bg-red-500',
    flexibility: 'bg-violet-500',
    conditioning: 'bg-cyan-500'
};

interface Assignment {
    id: string;
    date: string;
    vault?: string;
    bars?: string;
    beam?: string;
    floor?: string;
    strength?: string;
    flexibility?: string;
    conditioning?: string;
    completed_items?: CompletedItems;
}

interface GymnastAssignmentStatsProps {
    gymnastProfileId: string;
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function GymnastAssignmentStats({ gymnastProfileId }: GymnastAssignmentStatsProps) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState<TimeRange>('30d');
    const [expandedEvents, setExpandedEvents] = useState<Set<AssignmentEventType>>(new Set());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        const fetchAssignments = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('gymnast_assignments')
                    .select('id, date, vault, bars, beam, floor, strength, flexibility, conditioning, completed_items')
                    .eq('gymnast_profile_id', gymnastProfileId)
                    .order('date', { ascending: false });

                if (error) throw error;
                setAssignments(data || []);
            } catch (err) {
                console.error('Error fetching gymnast assignments:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, [gymnastProfileId]);

    const toggleEventExpand = (event: AssignmentEventType) => {
        setExpandedEvents(prev => {
            const next = new Set(prev);
            if (next.has(event)) {
                next.delete(event);
            } else {
                next.add(event);
            }
            return next;
        });
    };

    // Filter assignments by time range
    const filteredAssignments = useMemo(() => {
        if (timeRange === 'all') return assignments;

        const now = new Date();
        const daysMap: Record<TimeRange, number> = { '7d': 7, '30d': 30, '90d': 90, 'all': 0 };
        const cutoff = subDays(now, daysMap[timeRange]);

        return assignments.filter(a => {
            const assignmentDate = parseISO(a.date);
            return isAfter(assignmentDate, cutoff) || format(assignmentDate, 'yyyy-MM-dd') === format(cutoff, 'yyyy-MM-dd');
        });
    }, [assignments, timeRange]);

    // Calculate overall stats
    const stats = useMemo(() => {
        let totalExercises = 0;
        let totalCompleted = 0;
        const uniqueDates = new Set(filteredAssignments.map(a => a.date));

        // Per-event stats
        const eventStats = new Map<AssignmentEventType, { completed: number; total: number }>();
        ASSIGNMENT_EVENTS.forEach(event => eventStats.set(event, { completed: 0, total: 0 }));

        // Per-day stats for timeline
        const dailyStats = new Map<string, { completed: number; total: number }>();

        filteredAssignments.forEach(assignment => {
            let dayCompleted = 0;
            let dayTotal = 0;

            ASSIGNMENT_EVENTS.forEach(event => {
                const content = assignment[event];
                if (!content) return;

                const exerciseCount = content.split('\n').filter(line => line.trim()).length;
                const completedCount = Math.min((assignment.completed_items?.[event] || []).length, exerciseCount);

                totalExercises += exerciseCount;
                totalCompleted += completedCount;
                dayTotal += exerciseCount;
                dayCompleted += completedCount;

                const eventStat = eventStats.get(event)!;
                eventStat.completed += completedCount;
                eventStat.total += exerciseCount;
            });

            if (dayTotal > 0) {
                dailyStats.set(assignment.date, { completed: dayCompleted, total: dayTotal });
            }
        });

        // Convert event stats to array with percentages
        const eventStatsArray = ASSIGNMENT_EVENTS
            .map(event => {
                const stat = eventStats.get(event)!;
                return {
                    event,
                    completed: stat.completed,
                    total: stat.total,
                    percentage: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
                };
            })
            .filter(e => e.total > 0)
            .sort((a, b) => b.percentage - a.percentage);

        // Convert daily stats to sorted array
        const dailyStatsArray = Array.from(dailyStats.entries())
            .map(([date, stat]) => ({
                date,
                completed: stat.completed,
                total: stat.total,
                percentage: stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0
            }))
            .sort((a, b) => b.date.localeCompare(a.date));

        return {
            totalExercises,
            totalCompleted,
            completionRate: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0,
            totalDays: uniqueDates.size,
            eventStats: eventStatsArray,
            dailyStats: dailyStatsArray
        };
    }, [filteredAssignments]);

    // Get selected day details
    const selectedDayDetails = useMemo(() => {
        if (!selectedDate) return null;

        const assignment = filteredAssignments.find(a => a.date === selectedDate);
        if (!assignment) return null;

        const events: Array<{
            event: AssignmentEventType;
            exercises: string[];
            completedIndices: number[];
        }> = [];

        ASSIGNMENT_EVENTS.forEach(event => {
            const content = assignment[event];
            if (!content) return;

            const exercises = content.split('\n').filter(line => line.trim());
            const completedIndices = assignment.completed_items?.[event] || [];

            events.push({ event, exercises, completedIndices });
        });

        return {
            date: selectedDate,
            events
        };
    }, [selectedDate, filteredAssignments]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
            </div>
        );
    }

    if (assignments.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <Target className="w-6 h-6 text-slate-400" />
                </div>
                <h3 className="text-sm font-medium text-slate-900 mb-1">No Assignments Yet</h3>
                <p className="text-sm text-slate-500">
                    Assignment history will appear here once exercises are assigned.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Time Range Selector */}
            <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <div className="flex bg-slate-100 rounded-lg p-1">
                    {(['7d', '30d', '90d', 'all'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                timeRange === range
                                    ? 'bg-white text-slate-900 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {range === 'all' ? 'All Time' : range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Stats */}
            <div className="card p-5 bg-gradient-to-br from-brand-50 to-indigo-50 border-brand-200">
                <div className="flex items-center gap-3 mb-5">
                    <div className="p-2 bg-brand-100 rounded-lg">
                        <BarChart3 className="w-5 h-5 text-brand-600" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900">Assignment Statistics</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {stats.totalDays} training day{stats.totalDays !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white rounded-lg p-3">
                        <p className="text-xl font-bold text-slate-900">{stats.totalExercises.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Total Assigned</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                        <p className="text-xl font-bold text-brand-600">{stats.totalCompleted.toLocaleString()}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                    </div>
                    <div className="bg-white rounded-lg p-3">
                        <div className="flex items-center gap-1">
                            <p className="text-xl font-bold text-indigo-600">{stats.completionRate}%</p>
                            {stats.completionRate >= 80 && <CheckCircle2 className="w-4 h-4 text-success-500" />}
                        </div>
                        <p className="text-xs text-slate-500">Completion Rate</p>
                    </div>
                </div>

                {/* Overall Progress Bar */}
                {stats.totalExercises > 0 && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-slate-500">Overall Progress</span>
                            <span className="text-sm font-medium text-brand-600">
                                {stats.totalCompleted}/{stats.totalExercises}
                            </span>
                        </div>
                        <div className="h-3 bg-white rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-500"
                                style={{ width: `${stats.completionRate}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Event Breakdown */}
            {stats.eventStats.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <TrendingUp className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">Performance by Event</h3>
                    </div>
                    <div className="p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {stats.eventStats.map(({ event, completed, total, percentage }) => {
                                const colors = ASSIGNMENT_EVENT_COLORS[event];
                                const isExpanded = expandedEvents.has(event);

                                return (
                                    <button
                                        key={event}
                                        onClick={() => toggleEventExpand(event)}
                                        className="bg-slate-50 rounded-lg p-3 text-left hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-medium ${colors.text}`}>
                                                    {ASSIGNMENT_EVENT_LABELS[event]}
                                                </span>
                                                {isExpanded
                                                    ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                                    : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                                }
                                            </div>
                                            <span className={`text-sm font-bold ${percentage >= 80 ? 'text-success-600' : percentage >= 60 ? 'text-amber-600' : 'text-slate-900'}`}>
                                                {percentage}%
                                            </span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${EVENT_BAR_COLORS[event]}`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1.5">
                                            {completed.toLocaleString()} / {total.toLocaleString()} exercises
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Daily History */}
            {stats.dailyStats.length > 0 && (
                <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">Daily History</h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {stats.dailyStats.slice(0, 10).map(({ date, completed, total, percentage }) => (
                            <button
                                key={date}
                                onClick={() => setSelectedDate(selectedDate === date ? null : date)}
                                className={`w-full p-4 text-left hover:bg-slate-50 transition-colors ${
                                    selectedDate === date ? 'bg-brand-50' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-slate-900">
                                            {format(parseISO(date), 'EEEE, MMM d')}
                                        </span>
                                        {selectedDate === date
                                            ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                                            : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                        }
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-sm font-bold ${percentage === 100 ? 'text-success-600' : percentage >= 80 ? 'text-brand-600' : 'text-slate-700'}`}>
                                            {percentage}%
                                        </span>
                                        {percentage === 100 && <CheckCircle2 className="w-4 h-4 text-success-500" />}
                                    </div>
                                </div>
                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                            percentage === 100 ? 'bg-success-500' : percentage >= 80 ? 'bg-brand-500' : 'bg-slate-400'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {completed} / {total} exercises
                                </p>

                                {/* Day Details */}
                                {selectedDate === date && selectedDayDetails && (
                                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                                        {selectedDayDetails.events.map(({ event, exercises, completedIndices }) => {
                                            const colors = ASSIGNMENT_EVENT_COLORS[event];
                                            return (
                                                <div key={event} className={`${colors.bg} rounded-lg p-3 border ${colors.border}`}>
                                                    <p className={`text-xs font-semibold ${colors.text} mb-2`}>
                                                        {ASSIGNMENT_EVENT_LABELS[event]}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {exercises.map((exercise, idx) => {
                                                            const isCompleted = completedIndices.includes(idx);
                                                            return (
                                                                <div
                                                                    key={idx}
                                                                    className={`flex items-start gap-2 text-xs ${
                                                                        isCompleted ? 'text-slate-400 line-through' : 'text-slate-700'
                                                                    }`}
                                                                >
                                                                    <span className={`flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center ${
                                                                        isCompleted
                                                                            ? 'bg-success-500 border-success-500 text-white'
                                                                            : 'border-slate-300'
                                                                    }`}>
                                                                        {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                                                    </span>
                                                                    {exercise}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                    {stats.dailyStats.length > 10 && (
                        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-center">
                            <p className="text-xs text-slate-500">
                                Showing 10 of {stats.dailyStats.length} training days
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
