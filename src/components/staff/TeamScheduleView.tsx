import { useState } from 'react';
import { Copy, Filter, Plus, Trash2, Loader2, Check, X } from 'lucide-react';
import type { StaffWithData } from '../../hooks/useStaffBulk';
import { CopyScheduleModal } from './CopyScheduleModal';
import { supabase } from '../../lib/supabase';

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

interface EditingCell {
    staffUserId: string;
    dayIndex: number;
}

export function TeamScheduleView({ hubId, staffData, onDataChanged }: TeamScheduleViewProps) {
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
    const [addStartTime, setAddStartTime] = useState('09:00');
    const [addEndTime, setAddEndTime] = useState('17:00');
    const [addRoleLabel, setAddRoleLabel] = useState('');
    const [saving, setSaving] = useState(false);

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

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const handleStartEditing = (staffUserId: string, dayIndex: number) => {
        setEditingCell({ staffUserId, dayIndex });
        setAddStartTime('09:00');
        setAddEndTime('17:00');
        setAddRoleLabel('');
    };

    const handleCancelEditing = () => {
        setEditingCell(null);
        setAddRoleLabel('');
    };

    const handleAddSchedule = async () => {
        if (!editingCell || !addRoleLabel.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_schedules')
            .insert({
                hub_id: hubId,
                staff_user_id: editingCell.staffUserId,
                day_of_week: editingCell.dayIndex,
                start_time: addStartTime,
                end_time: addEndTime,
                role_label: addRoleLabel.trim(),
            });

        if (error) {
            console.error('Error adding schedule:', error);
        } else {
            setEditingCell(null);
            setAddRoleLabel('');
            onDataChanged();
        }
        setSaving(false);
    };

    const handleDeleteSchedule = async (id: string) => {
        const { error } = await supabase
            .from('staff_schedules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting schedule:', error);
        } else {
            onDataChanged();
        }
    };

    const isEditing = (staffUserId: string, dayIndex: number) =>
        editingCell?.staffUserId === staffUserId && editingCell?.dayIndex === dayIndex;

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
                                            const cellEditing = isEditing(staff.user_id, dayIndex);

                                            return (
                                                <td
                                                    key={day}
                                                    className={`p-2 align-top ${DAY_COLORS[dayIndex]}`}
                                                >
                                                    <div className="space-y-1">
                                                        {daySchedules.map(schedule => (
                                                            <div
                                                                key={schedule.id}
                                                                className="group bg-white rounded px-2 py-1 text-xs border border-slate-200 shadow-sm relative"
                                                            >
                                                                <p className="font-medium text-slate-700">
                                                                    {formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}
                                                                </p>
                                                                <p className="text-slate-500 truncate pr-5" title={schedule.role_label}>
                                                                    {schedule.role_label}
                                                                </p>
                                                                <button
                                                                    onClick={() => handleDeleteSchedule(schedule.id)}
                                                                    className="absolute top-1 right-1 p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </button>
                                                            </div>
                                                        ))}

                                                        {/* Inline Add Form */}
                                                        {cellEditing ? (
                                                            <div className="bg-white rounded p-2 border border-brand-300 shadow-sm space-y-1.5">
                                                                <div className="flex gap-1">
                                                                    <input
                                                                        type="time"
                                                                        value={addStartTime}
                                                                        onChange={(e) => setAddStartTime(e.target.value)}
                                                                        className="w-full px-1 py-0.5 text-xs border border-slate-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                    <input
                                                                        type="time"
                                                                        value={addEndTime}
                                                                        onChange={(e) => setAddEndTime(e.target.value)}
                                                                        className="w-full px-1 py-0.5 text-xs border border-slate-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                                    />
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={addRoleLabel}
                                                                    onChange={(e) => setAddRoleLabel(e.target.value)}
                                                                    placeholder="Role/Activity"
                                                                    className="w-full px-1.5 py-0.5 text-xs border border-slate-300 rounded focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                                    autoFocus
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && addRoleLabel.trim()) handleAddSchedule();
                                                                        if (e.key === 'Escape') handleCancelEditing();
                                                                    }}
                                                                />
                                                                <div className="flex justify-end gap-1">
                                                                    <button
                                                                        onClick={handleCancelEditing}
                                                                        className="p-1 text-slate-400 hover:text-slate-600"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleAddSchedule}
                                                                        disabled={saving || !addRoleLabel.trim()}
                                                                        className="p-1 text-brand-500 hover:text-brand-700 disabled:opacity-50"
                                                                    >
                                                                        {saving ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                        ) : (
                                                                            <Check className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleStartEditing(staff.user_id, dayIndex)}
                                                                className="w-full flex items-center justify-center gap-1 py-1 text-xs text-slate-400 hover:text-brand-600 hover:bg-white/60 rounded transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
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
                <span>Click + to add a time block, hover to delete</span>
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
