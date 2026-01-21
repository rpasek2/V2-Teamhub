import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, TrendingUp, Users, AlertTriangle, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
import { format, subDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { GymnastProfile, PracticeSchedule, AttendanceRecord } from '../../types';

interface GymnastAttendanceStats {
    gymnast: GymnastProfile;
    totalScheduled: number;
    present: number;
    late: number;
    absent: number;
    leftEarly: number;
    percentage: number;
    consecutiveAbsences: number;
    lastAbsenceDate: string | null;
}

interface LevelStats {
    level: string;
    totalGymnasts: number;
    averagePercentage: number;
    gymnastsWithWarnings: number;
}

export function AttendanceMetricsTab() {
    const { hubId } = useParams();
    const { hub } = useHub();

    const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('month');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [practiceSchedules, setPracticeSchedules] = useState<PracticeSchedule[]>([]);
    const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
    const [showWarningsOnly, setShowWarningsOnly] = useState(false);

    useEffect(() => {
        // Set date range based on selection
        const today = new Date();
        if (dateRange === 'week') {
            setStartDate(format(subDays(today, 7), 'yyyy-MM-dd'));
            setEndDate(format(today, 'yyyy-MM-dd'));
        } else if (dateRange === 'month') {
            setStartDate(format(startOfMonth(today), 'yyyy-MM-dd'));
            // Use today's date, not end of month, so we only count scheduled days up to now
            setEndDate(format(today, 'yyyy-MM-dd'));
        }
    }, [dateRange]);

    useEffect(() => {
        if (hubId) {
            fetchData();
        }
    }, [hubId, startDate, endDate]);

    const fetchData = async () => {
        if (!hubId) return;
        setLoading(true);

        const [schedulesResult, gymnastsResult, attendanceResult] = await Promise.all([
            supabase
                .from('practice_schedules')
                .select('*')
                .eq('hub_id', hubId),
            supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hubId)
                .order('last_name'),
            supabase
                .from('attendance_records')
                .select('*')
                .eq('hub_id', hubId)
                .gte('attendance_date', startDate)
                .lte('attendance_date', endDate)
        ]);

        if (schedulesResult.data) {
            setPracticeSchedules(schedulesResult.data);
        }

        if (gymnastsResult.data) {
            setGymnasts(gymnastsResult.data);
        }

        if (attendanceResult.data) {
            setAttendanceRecords(attendanceResult.data);
        }

        setLoading(false);
    };

    // Calculate how many practice days each gymnast was scheduled for in the date range
    const getScheduledDays = (gymnast: GymnastProfile): string[] => {
        if (!gymnast.level) return [];

        const group = gymnast.schedule_group || 'A';
        const relevantSchedules = practiceSchedules.filter(
            s => s.level === gymnast.level && s.schedule_group === group
        );

        if (relevantSchedules.length === 0) return [];

        // Get all days in range
        const start = parseISO(startDate);
        const end = parseISO(endDate);
        const allDays = eachDayOfInterval({ start, end });

        // Filter to days that match practice schedules
        const practiceDays: string[] = [];
        for (const day of allDays) {
            const dayOfWeek = day.getDay();
            if (relevantSchedules.some(s => s.day_of_week === dayOfWeek)) {
                practiceDays.push(format(day, 'yyyy-MM-dd'));
            }
        }

        return practiceDays;
    };

    // Calculate consecutive absences (looking back from most recent)
    const getConsecutiveAbsences = (gymnastId: string, scheduledDays: string[]): { count: number; lastDate: string | null } => {
        const gymnastRecords = attendanceRecords
            .filter(r => r.gymnast_profile_id === gymnastId)
            .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));

        // Sort scheduled days descending
        const sortedDays = [...scheduledDays].sort((a, b) => b.localeCompare(a));

        let consecutiveCount = 0;
        let lastAbsenceDate: string | null = null;

        for (const day of sortedDays) {
            const record = gymnastRecords.find(r => r.attendance_date === day);
            if (record?.status === 'absent') {
                consecutiveCount++;
                if (!lastAbsenceDate) lastAbsenceDate = day;
            } else if (record?.status === 'present' || record?.status === 'late') {
                // Break the streak on present/late
                break;
            }
            // Continue counting if no record or left_early
        }

        return { count: consecutiveCount, lastDate: lastAbsenceDate };
    };

    // Calculate stats for each gymnast
    const gymnastStats = useMemo((): GymnastAttendanceStats[] => {
        return gymnasts.map(gymnast => {
            const scheduledDays = getScheduledDays(gymnast);
            const gymnastRecords = attendanceRecords.filter(r => r.gymnast_profile_id === gymnast.id);

            const present = gymnastRecords.filter(r => r.status === 'present').length;
            const late = gymnastRecords.filter(r => r.status === 'late').length;
            const absent = gymnastRecords.filter(r => r.status === 'absent').length;
            const leftEarly = gymnastRecords.filter(r => r.status === 'left_early').length;

            // Calculate percentage (present + late + left_early counts as attended)
            const totalScheduled = scheduledDays.length;
            const attended = present + late + leftEarly;
            const percentage = totalScheduled > 0 ? Math.round((attended / totalScheduled) * 100) : 0;

            const { count: consecutiveAbsences, lastDate } = getConsecutiveAbsences(gymnast.id, scheduledDays);

            return {
                gymnast,
                totalScheduled,
                present,
                late,
                absent,
                leftEarly,
                percentage,
                consecutiveAbsences,
                lastAbsenceDate: lastDate
            };
        }).filter(s => s.totalScheduled > 0); // Only show gymnasts with scheduled practices
    }, [gymnasts, attendanceRecords, practiceSchedules, startDate, endDate]);

    // Calculate level stats
    const levelStats = useMemo((): LevelStats[] => {
        const levels = hub?.settings?.levels || [];
        const grouped: Record<string, GymnastAttendanceStats[]> = {};

        for (const stat of gymnastStats) {
            const level = stat.gymnast.level || 'Unknown';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(stat);
        }

        return Object.entries(grouped)
            .map(([level, stats]) => ({
                level,
                totalGymnasts: stats.length,
                averagePercentage: Math.round(
                    stats.reduce((sum, s) => sum + s.percentage, 0) / stats.length
                ),
                gymnastsWithWarnings: stats.filter(s => s.consecutiveAbsences >= 3).length
            }))
            .sort((a, b) => {
                const aIndex = levels.indexOf(a.level);
                const bIndex = levels.indexOf(b.level);
                if (aIndex === -1 && bIndex === -1) return a.level.localeCompare(b.level);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
    }, [gymnastStats, hub?.settings?.levels]);

    // Overall stats
    const overallStats = useMemo(() => {
        const totalGymnasts = gymnastStats.length;
        const avgPercentage = totalGymnasts > 0
            ? Math.round(gymnastStats.reduce((sum, s) => sum + s.percentage, 0) / totalGymnasts)
            : 0;
        const totalWarnings = gymnastStats.filter(s => s.consecutiveAbsences >= 3).length;

        return { totalGymnasts, avgPercentage, totalWarnings };
    }, [gymnastStats]);

    const toggleLevel = (level: string) => {
        setExpandedLevels(prev => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 90) return 'text-emerald-600';
        if (percentage >= 75) return 'text-amber-600';
        return 'text-red-600';
    };

    const getPercentageBgColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-emerald-100';
        if (percentage >= 75) return 'bg-amber-100';
        return 'bg-red-100';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    // Gymnasts with warnings (3+ consecutive absences)
    const gymnastsWithWarnings = gymnastStats.filter(s => s.consecutiveAbsences >= 3);

    return (
        <div className="space-y-6">
            {/* Date Range Selector */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">Date Range:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(['week', 'month', 'custom'] as const).map(range => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-3 py-1.5 text-sm rounded-lg ${
                                    dateRange === range
                                        ? 'bg-brand-100 text-brand-700'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'This Month' : 'Custom'}
                            </button>
                        ))}
                    </div>
                    {dateRange === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input text-sm"
                            />
                            <span className="text-slate-400">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input text-sm"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Total Gymnasts</p>
                            <p className="text-2xl font-bold text-slate-900">{overallStats.totalGymnasts}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getPercentageBgColor(overallStats.avgPercentage)}`}>
                            <TrendingUp className={`w-5 h-5 ${getPercentageColor(overallStats.avgPercentage)}`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Average Attendance</p>
                            <p className={`text-2xl font-bold ${getPercentageColor(overallStats.avgPercentage)}`}>
                                {overallStats.avgPercentage}%
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${overallStats.totalWarnings > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                            <AlertTriangle className={`w-5 h-5 ${overallStats.totalWarnings > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Attendance Warnings</p>
                            <p className={`text-2xl font-bold ${overallStats.totalWarnings > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {overallStats.totalWarnings}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Warnings Section */}
            {gymnastsWithWarnings.length > 0 && (
                <div className="card border-red-200">
                    <div className="p-4 bg-red-50 border-b border-red-200">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <h3 className="font-semibold text-red-900">
                                Attendance Warnings ({gymnastsWithWarnings.length})
                            </h3>
                        </div>
                        <p className="text-sm text-red-700 mt-1">
                            Gymnasts with 3 or more consecutive absences
                        </p>
                    </div>
                    <div className="divide-y divide-red-100">
                        {gymnastsWithWarnings.map(stat => (
                            <div key={stat.gymnast.id} className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-slate-900">
                                        {stat.gymnast.first_name} {stat.gymnast.last_name}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {stat.gymnast.level}
                                        {stat.lastAbsenceDate && (
                                            <span className="ml-2">
                                                • Last absence: {format(parseISO(stat.lastAbsenceDate), 'MMM d')}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-red-600">
                                        {stat.consecutiveAbsences} absences
                                    </p>
                                    <p className="text-sm text-slate-500">in a row</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Level Breakdown */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Attendance by Level</h3>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={showWarningsOnly}
                            onChange={(e) => setShowWarningsOnly(e.target.checked)}
                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-slate-600">Show warnings only</span>
                    </label>
                </div>

                {levelStats.map(level => {
                    const isExpanded = expandedLevels.has(level.level);
                    const levelGymnasts = gymnastStats
                        .filter(s => s.gymnast.level === level.level)
                        .filter(s => !showWarningsOnly || s.consecutiveAbsences >= 3)
                        .sort((a, b) => a.percentage - b.percentage);

                    if (showWarningsOnly && levelGymnasts.length === 0) return null;

                    return (
                        <div key={level.level} className="card overflow-hidden">
                            <div
                                className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                                onClick={() => toggleLevel(level.level)}
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                    <span className="font-semibold text-slate-900">{level.level}</span>
                                    <span className="text-sm text-slate-500">
                                        ({level.totalGymnasts} gymnasts)
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className={`px-3 py-1 rounded-full ${getPercentageBgColor(level.averagePercentage)}`}>
                                        <span className={`text-sm font-medium ${getPercentageColor(level.averagePercentage)}`}>
                                            {level.averagePercentage}% avg
                                        </span>
                                    </div>
                                    {level.gymnastsWithWarnings > 0 && (
                                        <div className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {level.gymnastsWithWarnings}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isExpanded && (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                                                <th className="text-left px-4 py-2 font-medium">Gymnast</th>
                                                <th className="text-center px-2 py-2 font-medium">Scheduled</th>
                                                <th className="text-center px-2 py-2 font-medium">Present</th>
                                                <th className="text-center px-2 py-2 font-medium">Late</th>
                                                <th className="text-center px-2 py-2 font-medium">Absent</th>
                                                <th className="text-center px-2 py-2 font-medium">Left Early</th>
                                                <th className="text-center px-2 py-2 font-medium">Attendance</th>
                                                <th className="text-center px-2 py-2 font-medium">Streak</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {levelGymnasts.map(stat => (
                                                <tr key={stat.gymnast.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3">
                                                        <span className="font-medium text-slate-900">
                                                            {stat.gymnast.first_name} {stat.gymnast.last_name}
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-2 py-3 text-slate-600">
                                                        {stat.totalScheduled}
                                                    </td>
                                                    <td className="text-center px-2 py-3 text-emerald-600">
                                                        {stat.present}
                                                    </td>
                                                    <td className="text-center px-2 py-3 text-amber-600">
                                                        {stat.late}
                                                    </td>
                                                    <td className="text-center px-2 py-3 text-red-600">
                                                        {stat.absent}
                                                    </td>
                                                    <td className="text-center px-2 py-3 text-blue-600">
                                                        {stat.leftEarly}
                                                    </td>
                                                    <td className="text-center px-2 py-3">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${getPercentageBgColor(stat.percentage)} ${getPercentageColor(stat.percentage)}`}>
                                                            {stat.percentage}%
                                                        </span>
                                                    </td>
                                                    <td className="text-center px-2 py-3">
                                                        {stat.consecutiveAbsences >= 3 ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-sm font-medium">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                {stat.consecutiveAbsences}
                                                            </span>
                                                        ) : stat.consecutiveAbsences > 0 ? (
                                                            <span className="text-slate-500">{stat.consecutiveAbsences}</span>
                                                        ) : (
                                                            <span className="text-slate-300">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
