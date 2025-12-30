import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Users, Filter, BarChart3, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useHub } from '../../context/HubContext';
import { useAssignments, useAllAssignments } from '../../hooks/useAssignments';
import { DateNavigator } from './DateNavigator';
import { ProgressBar } from './ProgressBar';
import { calculateEventProgress } from './EventCard';
import type { AssignmentEventType } from '../../types';
import { ASSIGNMENT_EVENT_LABELS, ASSIGNMENT_EVENT_COLORS } from '../../types';

const ASSIGNMENT_EVENTS: AssignmentEventType[] = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

// Bar colors for progress bars (based on the event text colors)
const EVENT_BAR_COLORS: Record<AssignmentEventType, string> = {
    vault: 'bg-emerald-500',
    bars: 'bg-sky-500',
    beam: 'bg-pink-500',
    floor: 'bg-amber-500',
    strength: 'bg-red-500',
    flexibility: 'bg-violet-500',
    conditioning: 'bg-cyan-500'
};

export function CoachDashboard() {
    const { hub } = useHub();
    const [date, setDate] = useState(new Date());
    const [levelFilter, setLevelFilter] = useState<string>('all');
    const [expandedEvents, setExpandedEvents] = useState<Set<AssignmentEventType>>(new Set());

    const dateString = format(date, 'yyyy-MM-dd');
    const { assignments } = useAssignments({
        hubId: hub?.id,
        date: dateString
    });
    const { assignments: allAssignments, loading: loadingAllAssignments } = useAllAssignments({
        hubId: hub?.id
    });

    const levels = hub?.settings?.levels || [];

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

    // Filter and aggregate data
    const stats = useMemo(() => {
        let filtered = assignments;

        if (levelFilter !== 'all') {
            filtered = assignments.filter(a => {
                const level = (a.gymnast_profiles as any)?.level;
                return level === levelFilter;
            });
        }

        // Calculate total stats
        let totalCompleted = 0;
        let totalExercises = 0;

        filtered.forEach(assignment => {
            const eventContents: Partial<Record<AssignmentEventType, string>> = {
                vault: assignment.vault,
                bars: assignment.bars,
                beam: assignment.beam,
                floor: assignment.floor,
                strength: assignment.strength,
                flexibility: assignment.flexibility,
                conditioning: assignment.conditioning
            };

            const progress = calculateEventProgress(assignment.completed_items || {}, eventContents);
            totalCompleted += progress.completed;
            totalExercises += progress.total;
        });

        return {
            totalGymnasts: filtered.length,
            totalCompleted,
            totalExercises,
            percentage: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0
        };
    }, [assignments, levelFilter]);

    // Calculate all-time stats
    const allTimeStats = useMemo(() => {
        if (!allAssignments.length) {
            return {
                totalExercises: 0,
                totalCompleted: 0,
                completionRate: 0,
                totalDays: 0,
                eventStats: [] as Array<{
                    event: AssignmentEventType;
                    completed: number;
                    total: number;
                    percentage: number;
                    levelStats: Array<{ level: string; completed: number; total: number; percentage: number }>;
                }>
            };
        }

        // Get unique training days
        const uniqueDates = new Set(allAssignments.map(a => a.date));

        // Map: event -> level -> { completed, total }
        const eventLevelMap = new Map<AssignmentEventType, Map<string, { completed: number; total: number }>>();
        ASSIGNMENT_EVENTS.forEach(event => eventLevelMap.set(event, new Map()));

        let totalExercises = 0;
        let totalCompleted = 0;

        allAssignments.forEach(assignment => {
            const level = (assignment.gymnast_profiles as any)?.level || 'Unknown';
            const eventContents: Partial<Record<AssignmentEventType, string>> = {
                vault: assignment.vault,
                bars: assignment.bars,
                beam: assignment.beam,
                floor: assignment.floor,
                strength: assignment.strength,
                flexibility: assignment.flexibility,
                conditioning: assignment.conditioning
            };

            ASSIGNMENT_EVENTS.forEach(event => {
                const content = eventContents[event];
                if (!content) return;

                const exerciseCount = content.split('\n').filter(line => line.trim()).length;
                const completedCount = Math.min((assignment.completed_items?.[event] || []).length, exerciseCount);

                totalExercises += exerciseCount;
                totalCompleted += completedCount;

                const levelMap = eventLevelMap.get(event)!;
                const existing = levelMap.get(level) || { completed: 0, total: 0 };
                levelMap.set(level, {
                    completed: existing.completed + completedCount,
                    total: existing.total + exerciseCount
                });
            });
        });

        // Build event stats with level breakdown
        const eventStats = ASSIGNMENT_EVENTS
            .map(event => {
                const levelMap = eventLevelMap.get(event)!;
                let eventCompleted = 0;
                let eventTotal = 0;
                const levelStats: Array<{ level: string; completed: number; total: number; percentage: number }> = [];

                levelMap.forEach((data, level) => {
                    eventCompleted += data.completed;
                    eventTotal += data.total;
                    levelStats.push({
                        level,
                        completed: data.completed,
                        total: data.total,
                        percentage: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
                    });
                });

                // Sort levels
                const levelOrder = levels.length > 0 ? levels : ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10'];
                levelStats.sort((a, b) => {
                    const aIdx = levelOrder.indexOf(a.level);
                    const bIdx = levelOrder.indexOf(b.level);
                    if (aIdx === -1 && bIdx === -1) return a.level.localeCompare(b.level);
                    if (aIdx === -1) return 1;
                    if (bIdx === -1) return -1;
                    return aIdx - bIdx;
                });

                return {
                    event,
                    completed: eventCompleted,
                    total: eventTotal,
                    percentage: eventTotal > 0 ? Math.round((eventCompleted / eventTotal) * 100) : 0,
                    levelStats
                };
            })
            .filter(e => e.total > 0);

        return {
            totalExercises,
            totalCompleted,
            completionRate: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0,
            totalDays: uniqueDates.size,
            eventStats
        };
    }, [allAssignments, levels]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <DateNavigator date={date} onDateChange={setDate} />

                {/* Level Filter */}
                {levels.length > 0 && (
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-slate-400" />
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            className="input py-1.5 text-sm"
                        >
                            <option value="all">All Levels</option>
                            {levels.map(level => (
                                <option key={level} value={level}>{level}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Users className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stats.totalGymnasts}</p>
                            <p className="text-xs text-slate-500">Gymnasts</p>
                        </div>
                    </div>
                </div>

                <div className="card p-4">
                    <div>
                        <p className="text-2xl font-bold text-mint-600">{stats.percentage}%</p>
                        <p className="text-xs text-slate-500">Overall Progress</p>
                    </div>
                </div>

                <div className="card p-4">
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</p>
                        <p className="text-xs text-slate-500">Completed</p>
                    </div>
                </div>

                <div className="card p-4">
                    <div>
                        <p className="text-2xl font-bold text-slate-900">{stats.totalExercises}</p>
                        <p className="text-xs text-slate-500">Total Exercises</p>
                    </div>
                </div>
            </div>

            {/* Overall Progress Bar */}
            {stats.totalExercises > 0 && (
                <div className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500">Team Progress</span>
                        <span className="text-sm font-medium text-mint-600">
                            {stats.totalCompleted}/{stats.totalExercises}
                        </span>
                    </div>
                    <ProgressBar
                        completed={stats.totalCompleted}
                        total={stats.totalExercises}
                        showLabel={false}
                        size="lg"
                    />
                </div>
            )}

            {/* All-Time Stats Section */}
            {!loadingAllAssignments && allTimeStats.totalExercises > 0 && (
                <div className="card p-5 bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-200">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-indigo-200 rounded-lg">
                            <BarChart3 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">All-Time Statistics</h3>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {allTimeStats.totalDays} training day{allTimeStats.totalDays !== 1 ? 's' : ''}
                            </p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="bg-white rounded-lg p-3">
                            <p className="text-xl font-bold text-slate-900">{allTimeStats.totalExercises.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Total Assigned</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                            <p className="text-xl font-bold text-mint-600">{allTimeStats.totalCompleted.toLocaleString()}</p>
                            <p className="text-xs text-slate-500">Completed</p>
                        </div>
                        <div className="bg-white rounded-lg p-3">
                            <p className="text-xl font-bold text-indigo-600">{allTimeStats.completionRate}%</p>
                            <p className="text-xs text-slate-500">Completion Rate</p>
                        </div>
                    </div>

                    {/* Event Breakdown */}
                    {allTimeStats.eventStats.length > 0 && (
                        <>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                                Completion by Event
                            </h4>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {allTimeStats.eventStats.map(({ event, completed, total, percentage, levelStats }) => {
                                    const colors = ASSIGNMENT_EVENT_COLORS[event];
                                    const isExpanded = expandedEvents.has(event);
                                    return (
                                        <div key={event} className="bg-white rounded-lg p-3">
                                            <button
                                                onClick={() => toggleEventExpand(event)}
                                                className="w-full text-left"
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-sm font-medium ${colors.text}`}>
                                                            {ASSIGNMENT_EVENT_LABELS[event]}
                                                        </span>
                                                        {levelStats.length > 0 && (
                                                            isExpanded
                                                                ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                                                                : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-bold ${percentage >= 75 ? 'text-mint-600' : 'text-slate-900'}`}>
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

                                            {/* Level Breakdown */}
                                            {isExpanded && levelStats.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                                    {levelStats.map(({ level, completed: lvlCompleted, total: lvlTotal, percentage: lvlPct }) => (
                                                        <div key={level}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs text-slate-500">{level}</span>
                                                                <span className={`text-xs font-medium ${lvlPct >= 75 ? 'text-mint-600' : 'text-slate-700'}`}>
                                                                    {lvlPct}%
                                                                </span>
                                                            </div>
                                                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${lvlPct >= 75 ? 'bg-mint-500' : 'bg-slate-400'}`}
                                                                    style={{ width: `${lvlPct}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 mt-0.5">
                                                                {lvlCompleted} / {lvlTotal}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
