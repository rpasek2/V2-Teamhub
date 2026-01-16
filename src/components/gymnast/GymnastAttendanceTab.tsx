import { useState, useEffect, useMemo } from 'react';
import { UserCheck, Loader2, Calendar, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, eachDayOfInterval } from 'date-fns';
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
    present: { label: 'Present', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', dotColor: 'bg-emerald-500' },
    late: { label: 'Late', bgColor: 'bg-amber-100', textColor: 'text-amber-700', dotColor: 'bg-amber-500' },
    absent: { label: 'Absent', bgColor: 'bg-red-100', textColor: 'text-red-700', dotColor: 'bg-red-500' },
    left_early: { label: 'Left Early', bgColor: 'bg-blue-100', textColor: 'text-blue-700', dotColor: 'bg-blue-500' },
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
                .select('*')
                .eq('hub_id', hub.id),
            supabase
                .from('attendance_records')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('gymnast_profile_id', gymnastId)
                .gte('attendance_date', fetchStartDate)
                .lte('attendance_date', fetchEndDate)
                .order('attendance_date', { ascending: false })
        ]);

        if (schedulesResult.data) {
            setPracticeSchedules(schedulesResult.data);
        }

        if (attendanceResult.data) {
            setAttendanceRecords(attendanceResult.data);
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
                const recordDate = parseISO(r.attendance_date);
                return recordDate >= monthStart && recordDate <= monthEnd;
            });

            const present = monthRecords.filter(r => r.status === 'present').length;
            const late = monthRecords.filter(r => r.status === 'late').length;
            const absent = monthRecords.filter(r => r.status === 'absent').length;
            const leftEarly = monthRecords.filter(r => r.status === 'left_early').length;

            const totalScheduled = scheduledDays.length;
            const attended = present + late + leftEarly;
            const percentage = totalScheduled > 0 ? Math.round((attended / totalScheduled) * 100) : 0;

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

    // Overall stats
    const overallStats = useMemo(() => {
        const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
        const totalLate = attendanceRecords.filter(r => r.status === 'late').length;
        const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
        const totalLeftEarly = attendanceRecords.filter(r => r.status === 'left_early').length;

        const total = totalPresent + totalLate + totalAbsent + totalLeftEarly;
        const attended = totalPresent + totalLate + totalLeftEarly;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;

        // Calculate consecutive absences from most recent
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
            percentage,
            consecutiveAbsences,
        };
    }, [attendanceRecords]);

    // Get records for the selected month
    const selectedMonthRecords = useMemo(() => {
        const monthDate = subMonths(new Date(), selectedMonthOffset);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = selectedMonthOffset === 0 ? new Date() : endOfMonth(monthDate);

        return attendanceRecords
            .filter(r => {
                const recordDate = parseISO(r.attendance_date);
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
        if (percentage >= 90) return 'bg-emerald-100';
        if (percentage >= 75) return 'bg-amber-100';
        return 'bg-red-100';
    };

    if (!gymnastLevel) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-slate-100 p-4">
                    <UserCheck className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No level assigned</h3>
                <p className="mt-2 text-sm text-slate-500">
                    Assign a level to this gymnast to track their attendance.
                </p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            </div>
        );
    }

    if (attendanceRecords.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-slate-100 p-4">
                    <UserCheck className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No Attendance Records</h3>
                <p className="mt-2 text-sm text-slate-500">
                    No attendance has been recorded for this gymnast yet.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Overall Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getPercentageBgColor(overallStats.percentage)}`}>
                            <TrendingUp className={`w-5 h-5 ${getPercentageColor(overallStats.percentage)}`} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Attendance</p>
                            <p className={`text-xl font-bold ${getPercentageColor(overallStats.percentage)}`}>
                                {overallStats.percentage}%
                            </p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                            <UserCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Present</p>
                            <p className="text-xl font-bold text-emerald-600">{overallStats.totalPresent}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 rounded-lg">
                            <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Late</p>
                            <p className="text-xl font-bold text-amber-600">{overallStats.totalLate}</p>
                        </div>
                    </div>
                </div>
                <div className="card p-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${overallStats.totalAbsent > 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
                            <AlertTriangle className={`w-5 h-5 ${overallStats.totalAbsent > 0 ? 'text-red-600' : 'text-slate-400'}`} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Absent</p>
                            <p className={`text-xl font-bold ${overallStats.totalAbsent > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                                {overallStats.totalAbsent}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Consecutive Absences Warning */}
            {overallStats.consecutiveAbsences >= 3 && (
                <div className="card border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <div>
                            <p className="font-medium text-red-900">Attendance Warning</p>
                            <p className="text-sm text-red-700">
                                {overallStats.consecutiveAbsences} consecutive absences
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Trend */}
            <div className="card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <Calendar className="h-4 w-4 text-slate-500" />
                    <h3 className="text-sm font-semibold text-slate-900">Monthly Trend</h3>
                </div>
                <div className="p-4">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                        {monthlyStats.map((stat, index) => (
                            <button
                                key={`${stat.month}-${stat.year}`}
                                onClick={() => setSelectedMonthOffset(index)}
                                className={`text-center p-3 rounded-lg transition-colors ${
                                    selectedMonthOffset === index
                                        ? 'bg-brand-100 ring-2 ring-brand-500'
                                        : 'bg-slate-50 hover:bg-slate-100'
                                }`}
                            >
                                <p className="text-xs text-slate-500">{stat.month.slice(0, 3)}</p>
                                <p className={`text-lg font-bold ${getPercentageColor(stat.percentage)}`}>
                                    {stat.percentage}%
                                </p>
                                <p className="text-xs text-slate-400">
                                    {stat.present + stat.late + stat.leftEarly}/{stat.totalScheduled}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Selected Month Details */}
            <div className="card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">
                            {monthlyStats[selectedMonthOffset]?.month} {monthlyStats[selectedMonthOffset]?.year} Records
                        </h3>
                    </div>
                    <span className="text-sm text-slate-500">
                        {selectedMonthRecords.length} record{selectedMonthRecords.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="divide-y divide-slate-100">
                    {selectedMonthRecords.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500">
                            No attendance records for this month
                        </div>
                    ) : (
                        selectedMonthRecords.map((record) => {
                            const config = STATUS_CONFIG[record.status];
                            return (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {format(parseISO(record.attendance_date), 'EEEE, MMMM d')}
                                            </p>
                                            {record.notes && (
                                                <p className="text-xs text-slate-500 mt-0.5">{record.notes}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {record.check_in_time && (
                                            <span className="text-xs text-slate-400">
                                                In: {record.check_in_time}
                                            </span>
                                        )}
                                        {record.check_out_time && (
                                            <span className="text-xs text-slate-400">
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
            <p className="text-xs text-slate-500 text-center">
                Showing attendance from the last 6 months
            </p>
        </div>
    );
}
