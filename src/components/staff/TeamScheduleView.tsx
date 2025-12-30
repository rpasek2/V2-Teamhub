import { useState } from 'react';
import { Copy, Filter } from 'lucide-react';
import type { StaffWithData } from '../../hooks/useStaffBulk';
import { CopyScheduleModal } from './CopyScheduleModal';

interface TeamScheduleViewProps {
    hubId: string;
    staffData: StaffWithData[];
    onDataChanged: () => void;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_COLORS = [
    'bg-slate-100', // Sun
    'bg-blue-50',   // Mon
    'bg-green-50',  // Tue
    'bg-amber-50',  // Wed
    'bg-purple-50', // Thu
    'bg-pink-50',   // Fri
    'bg-slate-100', // Sat
];

type RoleFilter = 'all' | 'owner' | 'director' | 'admin' | 'coach';

export function TeamScheduleView({ hubId, staffData, onDataChanged }: TeamScheduleViewProps) {
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [showCopyModal, setShowCopyModal] = useState(false);

    const filteredStaff = staffData.filter(staff =>
        roleFilter === 'all' || staff.role === roleFilter
    );

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getStaffSchedulesForDay = (staff: StaffWithData, dayIndex: number) => {
        return staff.schedules.filter(s => s.day_of_week === dayIndex);
    };

    // Get role badge color
    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    return (
        <div className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Role Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                        className="input py-1.5 text-sm"
                    >
                        <option value="all">All Roles</option>
                        <option value="owner">Owners</option>
                        <option value="director">Directors</option>
                        <option value="admin">Admins</option>
                        <option value="coach">Coaches</option>
                    </select>
                </div>

                {/* Copy Schedule Button */}
                <button
                    onClick={() => setShowCopyModal(true)}
                    className="btn-secondary text-sm"
                >
                    <Copy className="w-4 h-4" />
                    Copy Schedule
                </button>
            </div>

            {/* Schedule Grid */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left p-4 font-semibold text-slate-700 bg-slate-50 w-48">
                                    Staff
                                </th>
                                {DAYS.map((day, index) => (
                                    <th
                                        key={day}
                                        className={`text-center p-4 font-semibold text-slate-700 ${DAY_COLORS[index]}`}
                                    >
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStaff.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        No staff members found for the selected filter.
                                    </td>
                                </tr>
                            ) : (
                                filteredStaff.map(staff => (
                                    <tr key={staff.user_id} className="hover:bg-slate-50/50">
                                        {/* Staff Info */}
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {staff.profile?.avatar_url ? (
                                                    <img
                                                        src={staff.profile.avatar_url}
                                                        alt=""
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <span className="text-slate-500 text-sm font-medium">
                                                            {staff.profile?.full_name?.charAt(0) || '?'}
                                                        </span>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">
                                                        {staff.profile?.full_name || 'Unknown'}
                                                    </p>
                                                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(staff.role)}`}>
                                                        {staff.role}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Day Columns */}
                                        {DAYS.map((day, dayIndex) => {
                                            const daySchedules = getStaffSchedulesForDay(staff, dayIndex);
                                            return (
                                                <td
                                                    key={day}
                                                    className={`p-2 text-center align-top ${DAY_COLORS[dayIndex]}`}
                                                >
                                                    {daySchedules.length === 0 ? (
                                                        <span className="text-xs text-slate-400">-</span>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            {daySchedules.map(schedule => (
                                                                <div
                                                                    key={schedule.id}
                                                                    className="bg-white rounded px-2 py-1 text-xs border border-slate-200 shadow-sm"
                                                                >
                                                                    <p className="font-medium text-slate-700">
                                                                        {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                                    </p>
                                                                    <p className="text-slate-500 truncate" title={schedule.role_label}>
                                                                        {schedule.role_label}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Total staff: {filteredStaff.length}</span>
                <span className="text-slate-300">|</span>
                <span>Click "Copy Schedule" to apply one staff member's schedule to others</span>
            </div>

            {/* Copy Schedule Modal */}
            {showCopyModal && (
                <CopyScheduleModal
                    isOpen={showCopyModal}
                    onClose={() => setShowCopyModal(false)}
                    hubId={hubId}
                    staffData={staffData}
                    onScheduleCopied={() => {
                        setShowCopyModal(false);
                        onDataChanged();
                    }}
                />
            )}
        </div>
    );
}
