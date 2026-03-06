import { useState, useEffect, useMemo } from 'react';
import { UserCheck, Loader2, Calendar, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { AttendanceRecord, PracticeSchedule, AttendanceStatus } from '../../types';

interface GymnastAttendanceTabProps {
    gymnastId: string;
    gymnastLevel: string | null;
    scheduleGroup?: string;
}

interface MonthStats {
    month: string;
    year: number;
    totalScheduled: number;
    present: number;
    late: number;
    absent: number;
    leftEarly: number;
    percentage: number;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bgColor: string; textColor: string; dotColor: string }> = {
    present: { label: 'Present', bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-600', dotColor: 'bg-emerald-500' },
    late: { label: 'Late', bgColor: 'bg-amber-500/10', textColor: 'text-amber-600', dotColor: 'bg-amber-500' },
    absent: { label: 'Absent', bgColor: 'bg-red-500/10', textColor: 'text-red-600', dotColor: 'bg-red-500' },
    left_early: { label: 'Left Early', bgColor: 'bg-blue-500/10', textColor: 'text-blue-600', dotColor: 'bg-blue-500' },
};

export function GymnastAttendanceTab({ gymnastId, gymnastLevel, scheduleGroup = 'A' }: GymnastAttendanceTabProps) {
    const { hub } = useHub();
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [practiceSchedules, setPracticeSchedules] = useState<PracticeSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = current month, -1 = last month, etc.

    // Calculate date range for fetching (last 6 months of data)
    const fetchStartDate = format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd');
    const fetchEndDate = format(endOfMonth(new Date()), 'yyyy-MM-dd');

    useEffect(() => {
        if (hub && gymnastId) {
            fetchData();
        }
    }, [hub, gymnastId]);

    const fetchData = async () => {
        if (!hub) return;
        setLoading(true);

        const [schedulesResult, attendanceResult] = await Promise.all([
            supabase
                .from('practice_schedules')
                .select('id, level, schedule_group, day_of_week, start_time, end_time')
                .eq('hub_id', hub.id),
            supabase
                .from('attendance_records')
                .select('id, gymnast_profile_id, attendance_date, status, notes, check_in_time, check_out_time')
                .eq('hub_id', hub.id)
                .eq('gymnast_profile_id', gymnastId)
                .gte('attendance_date', fetchStartDate)
                .lte('attendance_date', fetchEndDate)
                .order('attendance_date', { ascending: false })
        ]);

        if (schedulesResult.data) {
            setPracticeSchedules(schedulesResult.data as PracticeSchedule[]);
        }

        if (attendanceResult.data) {
            setAttendanceRecords(attendanceResult.data as AttendanceRecord[]);
        }

        setLoading(false);
    };

    // Get scheduled practice days for a date range
    const getScheduledDays = (startDate: Date, endDate: Date): string[] => {
        if (!gymnastLevel) return [];

        const relevantSchedules = practiceSchedules.filter(
            s => s.level === gymnastLevel && s.schedule_group === scheduleGroup
        );

        if (relevantSchedules.length === 0) return [];

        const allDays = eachDayOfInterval({ start: startDate, end: endDate });
        const practiceDays: string[] = [];

        for (const day of allDays) {
            const dayOfWeek = day.getDay();
            if (relevantSchedules.some(s => s.day_of_week === dayOfWeek)) {
                practiceDays.push(format(day, 'yyyy-MM-dd'));
            }
        }

        return practiceDays;
    };

    // Calculate monthly stats for the last 6 months
    const monthlyStats = useMemo((): MonthStats[] => {
        const stats: MonthStats[] = [];
        const today = new Date();

        for (let i = 0; i < 6; i++) {
            const monthDate = subMonths(today, i);
            const monthStart = startOfMonth(monthDate);
            const monthEnd = i === 0 ? today : endOfMonth(monthDate);

            const scheduledDays = getScheduledDays(monthStart, monthEnd);
            const monthRecords = attendanceRecords.filter(r => {
                const recordDate = parseLocalDate(r.attendance_date);
                return recordDate >= monthStart && recordDate <= monthEnd;
            });

            const present = monthRecords.filter(r => r.status === 'present').length;
            const late = monthRecords.filter(r => r.status === 'late').length;
            const absent = monthRecords.filter(r => r.status === 'absent').length;
            const leftEarly = monthRecords.filter(r => r.status === 'left_early').length;

            const totalScheduled = scheduledDays.length;
            const totalRecorded = monthRecords.length;
            const attended = present + late + leftEarly;
            const percentage = totalRecorded > 0 ? Math.round((attended / totalRecorded) * 100) : 0;

            stats.push({
                month: format(monthDate, 'MMMM'),
                year: monthDate.getFullYear(),
                totalScheduled,
                present,
                late,
                absent,
                leftEarly,
                percentage,
            });
        }

        return stats;
    }, [attendanceRecords, practiceSchedules, gymnastLevel, scheduleGroup]);

    // Overall stats (using scheduled days as denominator for consistency with monthly stats)
    const overallStats = useMemo(() => {
        const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
        const totalLate = attendanceRecords.filter(r => r.status === 'late').length;
        const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
        const totalLeftEarly = attendanceRecords.filter(r => r.status === 'left_early').length;

        // Only count days where attendance was actually recorded
        const totalRecorded = attendanceRecords.length;
        const totalScheduled = monthlyStats.reduce((sum, month) => sum + month.totalScheduled, 0);
        const attended = totalPresent + totalLate + totalLeftEarly;
        const percentage = totalRecorded > 0 ? Math.round((attended / totalRecorded) * 100) : 0;

        // Calculate consecutive absences from most recent scheduled days
        let consecutiveAbsences = 0;
        const sortedRecords = [...attendanceRecords].sort((a, b) =>
            b.attendance_date.localeCompare(a.attendance_date)
        );
        for (const record of sortedRecords) {
            if (record.status === 'absent') {
                consecutiveAbsences++;
            } else if (record.status === 'present' || record.status === 'late') {
                break;
            }
        }

        return {
            totalPresent,
            totalLate,
            totalAbsent,
            totalLeftEarly,
            totalScheduled,
            percentage,
            consecutiveAbsences,
        };
    }, [attendanceRecords, monthlyStats]);

    // Get records for the selected month
    const selectedMonthRecords = useMemo(() => {
        const monthDate = subMonths(new Date(), selectedMonthOffset);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = selectedMonthOffset === 0 ? new Date() : endOfMonth(monthDate);

        return attendanceRecords
            .filter(r => {
                const recordDate = parseLocalDate(r.attendance_date);
                return recordDate >= monthStart && recordDate <= monthEnd;
            })
            .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
    }, [attendanceRecords, selectedMonthOffset]);

    const getPercentageColor = (percentage: number) => {
        if (percentage >= 90) return 'text-emerald-600';
        if (percentage >= 75) return 'text-amber-600';
        return 'text-red-600';
    };

    const getPercentageBgColor = (percentage: number) => {
        if (percentage >= 90) return 'bg-emerald-500/15';
        if (percentage >= 75) return 'bg-amber-500/15';
        return 'bg-red-500/15';
    };

    if (!gymnastLevel) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-surface-hover p-4">
                    <UserCheck className="h-8 w-8 text-faint" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-heading">No level assigned</h3>
                <p className="mt-2 text-sm text-muted">
                    Assign a level to this gymnast to track their attendance.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-accent-500" />
            </div>
        );
    }

    if (attendanceRecords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-surface-hover p-4">
                    <UserCheck className="h-8 w-8 text-faint" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-heading">No Attendance Records</h3>
                <p className="mt-2 text-sm text-muted">
                    No attendance has been recorded for this gymnast yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overall Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getPercentageBgColor(overallStats.percentage)}`}>
                            <TrendingUp className={`w-5 h-5 ${getPercentageColor(overallStats.percentage)}`} />
                        </div>
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide">Attendance</p>
                            <p className={`text-xl font-bold ${getPercentageColor(overallStats.percentage)}`}>
                                {overallStats.percentage}%
                            </p>
                            <p className="text-xs text-faint">
                                {overallStats.totalPresent + overallStats.totalLate + overallStats.totalLeftEarly}/{overallStats.totalScheduled}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/15 rounded-lg">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide">Present</p>
                            <p className="text-xl font-bold text-emerald-600">{overallStats.totalPresent}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/15 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide">Late</p>
                            <p className="text-xl font-bold text-amber-600">{overallStats.totalLate}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/15 rounded-lg">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide">Left Early</p>
                            <p className="text-xl font-bold text-blue-600">{overallStats.totalLeftEarly}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${overallStats.totalAbsent > 0 ? 'bg-red-500/15' : 'bg-surface-hover'}`}>
                            <AlertTriangle className={`w-5 h-5 ${overallStats.totalAbsent > 0 ? 'text-red-600' : 'text-faint'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-muted uppercase tracking-wide">Absent</p>
                            <p className={`text-xl font-bold ${overallStats.totalAbsent > 0 ? 'text-red-600' : 'text-heading'}`}>
                                {overallStats.totalAbsent}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consecutive Absences Warning */}
            {overallStats.consecutiveAbsences >= 3 && (
                <div className="card border-red-500/20 bg-red-500/10 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        <div>
                            <p className="font-medium text-red-600">Attendance Warning</p>
                            <p className="text-sm text-red-500">
                                {overallStats.consecutiveAbsences} consecutive absences
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Trend */}
            <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-surface border-b border-line">
                    <Calendar className="h-4 w-4 text-muted" />
                    <h3 className="text-sm font-semibold text-heading">Monthly Trend</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {monthlyStats.map((stat, index) => (
                            <button
                                key={`${stat.month}-${stat.year}`}
                                onClick={() => setSelectedMonthOffset(index)}
                                className={`text-center p-3 rounded-lg transition-colors ${
                                    selectedMonthOffset === index
                                        ? 'bg-accent-500/10 ring-2 ring-accent-500'
                                        : 'bg-surface-alt hover:bg-surface-hover'
                                }`}
                            >
                                <p className="text-xs text-muted">{stat.month.slice(0, 3)}</p>
                                <p className={`text-lg font-bold ${getPercentageColor(stat.percentage)}`}>
                                    {stat.percentage}%
                                </p>
                                <p className="text-xs text-faint">
                                    {stat.present + stat.late + stat.leftEarly}/{stat.totalScheduled}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Selected Month Details */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-line">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-muted" />
                        <h3 className="text-sm font-semibold text-heading">
                            {monthlyStats[selectedMonthOffset]?.month} {monthlyStats[selectedMonthOffset]?.year} Records
                        </h3>
                    </div>
                    <span className="text-sm text-muted">
                        {selectedMonthRecords.length} record{selectedMonthRecords.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="divide-y divide-line">
                    {selectedMonthRecords.length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted">
                            No attendance records for this month
                        </div>
                    ) : (
                        selectedMonthRecords.map((record) => {
                            const config = STATUS_CONFIG[record.status];
                            return (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-surface-hover"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
                                        <div>
                                            <p className="text-sm font-medium text-heading">
                                                {format(parseLocalDate(record.attendance_date), 'EEEE, MMMM d')}
                                            </p>
                                            {record.notes && (
                                                <p className="text-xs text-muted mt-0.5">{record.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {record.check_in_time && (
                                            <span className="text-xs text-faint">
                                                In: {record.check_in_time}
                                            </span>
                                        )}
                                        {record.check_out_time && (
                                            <span className="text-xs text-faint">
                                                Out: {record.check_out_time}
                                            </span>
                                        )}
                                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-muted text-center">
                Showing attendance from the last 6 months
            </p>
        </div>
    );
}
