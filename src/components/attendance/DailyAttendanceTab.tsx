import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Check, X, Clock, LogOut, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { DAYS_OF_WEEK } from '../../types';
import type { GymnastProfile, PracticeSchedule, AttendanceRecord, AttendanceStatus } from '../../types';

interface DailyAttendanceTabProps {
    canManage: boolean;
}

interface GymnastWithAttendance extends GymnastProfile {
    attendance?: AttendanceRecord;
    expected_start?: string;
    expected_end?: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
    present: { label: 'Present', color: 'text-emerald-600', bgColor: 'bg-emerald-100', icon: Check },
    late: { label: 'Late', color: 'text-amber-600', bgColor: 'bg-amber-100', icon: Clock },
    left_early: { label: 'Left Early', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: LogOut },
    absent: { label: 'Absent', color: 'text-red-600', bgColor: 'bg-red-100', icon: X },
};

export function DailyAttendanceTab({ canManage }: DailyAttendanceTabProps) {
    const { hubId } = useParams();
    const { hub } = useHub();
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [practiceSchedules, setPracticeSchedules] = useState<PracticeSchedule[]>([]);
    const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

    // Get day of week from selected date (0 = Sunday)
    const selectedDayOfWeek = parseISO(selectedDate).getDay();

    useEffect(() => {
        if (hubId) {
            fetchData();
        }
    }, [hubId]);

    useEffect(() => {
        if (hubId) {
            fetchAttendance();
        }
    }, [hubId, selectedDate]);

    const fetchData = async () => {
        if (!hubId) return;
        setLoading(true);

        const [schedulesResult, gymnastsResult] = await Promise.all([
            supabase
                .from('practice_schedules')
                .select('*')
                .eq('hub_id', hubId),
            supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hubId)
                .order('last_name')
        ]);

        if (schedulesResult.data) {
            setPracticeSchedules(schedulesResult.data);
        }

        if (gymnastsResult.data) {
            setGymnasts(gymnastsResult.data);
            // Expand all levels by default
            const levels = new Set(gymnastsResult.data.map(g => g.level).filter(Boolean));
            setExpandedLevels(levels as Set<string>);
        }

        await fetchAttendance();
        setLoading(false);
    };

    const fetchAttendance = async () => {
        if (!hubId) return;

        const { data } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('hub_id', hubId)
            .eq('attendance_date', selectedDate);

        if (data) {
            setAttendanceRecords(data);
        }
    };

    // Get gymnasts who have practice on the selected day
    const gymnastsWithPractice = useMemo(() => {
        const result: GymnastWithAttendance[] = [];

        // Get schedules for this day
        const todaysSchedules = practiceSchedules.filter(s => s.day_of_week === selectedDayOfWeek);

        for (const gymnast of gymnasts) {
            if (!gymnast.level) continue;

            // Find matching schedule for this gymnast's level and group
            const schedule = todaysSchedules.find(s =>
                s.level === gymnast.level &&
                s.schedule_group === (gymnast.schedule_group || 'A')
            );

            if (schedule) {
                const attendance = attendanceRecords.find(a => a.gymnast_profile_id === gymnast.id);
                result.push({
                    ...gymnast,
                    attendance,
                    expected_start: schedule.start_time,
                    expected_end: schedule.end_time
                });
            }
        }

        return result;
    }, [gymnasts, practiceSchedules, attendanceRecords, selectedDayOfWeek]);

    // Group by level
    const gymnastsByLevel = useMemo(() => {
        const grouped: Record<string, GymnastWithAttendance[]> = {};
        const levels = hub?.settings?.levels || [];

        for (const gymnast of gymnastsWithPractice) {
            const level = gymnast.level || 'Unknown';
            if (!grouped[level]) {
                grouped[level] = [];
            }
            grouped[level].push(gymnast);
        }

        // Sort levels by hub settings order
        const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
            const aIndex = levels.indexOf(a);
            const bIndex = levels.indexOf(b);
            if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });

        return sortedEntries;
    }, [gymnastsWithPractice, hub?.settings?.levels]);

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

    const markAttendance = async (gymnastId: string, status: AttendanceStatus) => {
        if (!hubId || !user) return;

        setSaving(gymnastId);

        // Check if record exists
        const existing = attendanceRecords.find(a => a.gymnast_profile_id === gymnastId);

        if (existing) {
            // Update
            const { error } = await supabase
                .from('attendance_records')
                .update({
                    status,
                    marked_by: user.id,
                    marked_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) {
                console.error('Error updating attendance:', error);
            }
        } else {
            // Insert
            const { error } = await supabase
                .from('attendance_records')
                .insert({
                    hub_id: hubId,
                    gymnast_profile_id: gymnastId,
                    attendance_date: selectedDate,
                    status,
                    marked_by: user.id,
                    marked_at: new Date().toISOString()
                });

            if (error) {
                console.error('Error marking attendance:', error);
            }
        }

        await fetchAttendance();
        setSaving(null);
    };

    const markAllPresent = async (level: string) => {
        if (!hubId || !user) return;

        const levelGymnasts = gymnastsByLevel.find(([l]) => l === level)?.[1] || [];
        const unmarked = levelGymnasts.filter(g => !g.attendance);

        if (unmarked.length === 0) return;

        setSaving(`all-${level}`);

        const records = unmarked.map(g => ({
            hub_id: hubId,
            gymnast_profile_id: g.id,
            attendance_date: selectedDate,
            status: 'present' as AttendanceStatus,
            marked_by: user.id,
            marked_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('attendance_records')
            .insert(records);

        if (error) {
            console.error('Error marking all present:', error);
        }

        await fetchAttendance();
        setSaving(null);
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Calculate stats for a level
    const getLevelStats = (levelGymnasts: GymnastWithAttendance[]) => {
        const total = levelGymnasts.length;
        const present = levelGymnasts.filter(g => g.attendance?.status === 'present').length;
        const late = levelGymnasts.filter(g => g.attendance?.status === 'late').length;
        const absent = levelGymnasts.filter(g => g.attendance?.status === 'absent').length;
        const leftEarly = levelGymnasts.filter(g => g.attendance?.status === 'left_early').length;
        const unmarked = levelGymnasts.filter(g => !g.attendance).length;
        return { total, present, late, absent, leftEarly, unmarked };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Date Selector */}
            <div className="card p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <CalendarDays className="w-5 h-5 text-slate-400" />
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="input"
                        />
                        <span className="text-sm font-medium text-slate-600">
                            {DAYS_OF_WEEK[selectedDayOfWeek]}
                        </span>
                    </div>
                    <div className="text-sm text-slate-500">
                        {gymnastsWithPractice.length} gymnasts expected today
                    </div>
                </div>
            </div>

            {/* No Practice Message */}
            {gymnastsByLevel.length === 0 ? (
                <div className="card p-12 text-center">
                    <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No practice scheduled</h3>
                    <p className="text-slate-500">
                        No gymnasts have practice on {DAYS_OF_WEEK[selectedDayOfWeek]}.
                    </p>
                </div>
            ) : (
                /* Attendance by Level */
                <div className="space-y-4">
                    {gymnastsByLevel.map(([level, levelGymnasts]) => {
                        const isExpanded = expandedLevels.has(level);
                        const stats = getLevelStats(levelGymnasts);

                        return (
                            <div key={level} className="card overflow-hidden">
                                {/* Level Header */}
                                <div
                                    className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100"
                                    onClick={() => toggleLevel(level)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-slate-400" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-slate-400" />
                                        )}
                                        <span className="font-semibold text-slate-900">{level}</span>
                                        <span className="text-sm text-slate-500">
                                            ({levelGymnasts.length} gymnasts)
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {/* Quick Stats */}
                                        <div className="hidden sm:flex items-center gap-3 text-xs">
                                            {stats.present > 0 && (
                                                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                                    {stats.present} present
                                                </span>
                                            )}
                                            {stats.late > 0 && (
                                                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                                    {stats.late} late
                                                </span>
                                            )}
                                            {stats.absent > 0 && (
                                                <span className="px-2 py-1 rounded-full bg-red-100 text-red-700">
                                                    {stats.absent} absent
                                                </span>
                                            )}
                                            {stats.unmarked > 0 && (
                                                <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                                                    {stats.unmarked} unmarked
                                                </span>
                                            )}
                                        </div>
                                        {/* Mark All Present Button */}
                                        {canManage && stats.unmarked > 0 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAllPresent(level);
                                                }}
                                                disabled={saving === `all-${level}`}
                                                className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                                            >
                                                {saving === `all-${level}` ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    'Mark All Present'
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Gymnast List */}
                                {isExpanded && (
                                    <div className="divide-y divide-slate-100">
                                        {levelGymnasts.map(gymnast => {
                                            const currentStatus = gymnast.attendance?.status;
                                            const isSaving = saving === gymnast.id;

                                            return (
                                                <div
                                                    key={gymnast.id}
                                                    className="flex items-center justify-between p-4 hover:bg-slate-50"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                            <span className="text-sm font-medium text-slate-600">
                                                                {gymnast.first_name?.[0]}{gymnast.last_name?.[0]}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-slate-900 truncate">
                                                                {gymnast.first_name} {gymnast.last_name}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {gymnast.expected_start && gymnast.expected_end && (
                                                                    <>
                                                                        {formatTime(gymnast.expected_start)} - {formatTime(gymnast.expected_end)}
                                                                    </>
                                                                )}
                                                                {gymnast.schedule_group && gymnast.schedule_group !== 'A' && (
                                                                    <span className="ml-2 text-indigo-600">
                                                                        Group {gymnast.schedule_group}
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Status Buttons */}
                                                    <div className="flex items-center gap-1">
                                                        {isSaving ? (
                                                            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                                                        ) : (
                                                            <>
                                                                {(['present', 'late', 'left_early', 'absent'] as AttendanceStatus[]).map(status => {
                                                                    const config = STATUS_CONFIG[status];
                                                                    const isActive = currentStatus === status;
                                                                    const Icon = config.icon;

                                                                    return (
                                                                        <button
                                                                            key={status}
                                                                            onClick={() => markAttendance(gymnast.id, status)}
                                                                            disabled={!canManage}
                                                                            title={config.label}
                                                                            className={`p-2 rounded-lg transition-colors ${
                                                                                isActive
                                                                                    ? `${config.bgColor} ${config.color}`
                                                                                    : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                                            } ${!canManage ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                                        >
                                                                            <Icon className="w-5 h-5" />
                                                                        </button>
                                                                    );
                                                                })}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
