import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Loader2, Clock, Users, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { DAYS_OF_WEEK_SHORT } from '../../types';
import type { PracticeSchedule } from '../../types';
import { AddPracticeModal } from './AddPracticeModal';
import { ScheduleGroupManager } from './ScheduleGroupManager';

interface WeeklyScheduleTabProps {
    canManage: boolean;
}

interface LevelGroup {
    level: string;
    schedule_group: string;
    group_label: string | null;
    schedules: PracticeSchedule[];
}

export function WeeklyScheduleTab({ canManage }: WeeklyScheduleTabProps) {
    const { hubId } = useParams();
    const { hub } = useHub();

    const [schedules, setSchedules] = useState<PracticeSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<PracticeSchedule | null>(null);
    const [showGroupManager, setShowGroupManager] = useState(false);

    const levels = hub?.settings?.levels || [];

    useEffect(() => {
        if (hubId) {
            fetchSchedules();
        }
    }, [hubId]);

    const fetchSchedules = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('practice_schedules')
            .select('*')
            .eq('hub_id', hubId)
            .order('level')
            .order('schedule_group')
            .order('day_of_week');

        if (error) {
            console.error('Error fetching schedules:', error);
        } else {
            setSchedules(data || []);
        }
        setLoading(false);
    };

    // Group schedules by level and schedule_group
    const levelGroups = useMemo(() => {
        const groups: LevelGroup[] = [];
        const groupMap = new Map<string, LevelGroup>();

        schedules.forEach(schedule => {
            const key = `${schedule.level}-${schedule.schedule_group}`;
            if (!groupMap.has(key)) {
                const group: LevelGroup = {
                    level: schedule.level,
                    schedule_group: schedule.schedule_group,
                    group_label: schedule.group_label,
                    schedules: []
                };
                groupMap.set(key, group);
                groups.push(group);
            }
            groupMap.get(key)!.schedules.push(schedule);
        });

        // Sort: roster levels first (by hub settings order), then external groups alphabetically
        groups.sort((a, b) => {
            const aIsExternal = a.schedules[0]?.is_external_group || false;
            const bIsExternal = b.schedules[0]?.is_external_group || false;

            // External groups go after roster levels
            if (aIsExternal !== bIsExternal) {
                return aIsExternal ? 1 : -1;
            }

            // Within roster levels, sort by hub settings order
            if (!aIsExternal) {
                const aIndex = levels.indexOf(a.level);
                const bIndex = levels.indexOf(b.level);
                const aOrder = aIndex === -1 ? 999 : aIndex;
                const bOrder = bIndex === -1 ? 999 : bIndex;
                if (aOrder !== bOrder) return aOrder - bOrder;
            }

            // Alphabetically within external groups, or same order roster levels
            if (a.level !== b.level) {
                return a.level.localeCompare(b.level);
            }
            return a.schedule_group.localeCompare(b.schedule_group);
        });

        return groups;
    }, [schedules, levels]);

    // Get unique external group names for autocomplete suggestions
    const externalGroups = useMemo(() => {
        const groups = new Set<string>();
        schedules.forEach(s => {
            if (s.is_external_group) {
                groups.add(s.level);
            }
        });
        return Array.from(groups).sort();
    }, [schedules]);

    const handleDeleteSchedule = async (id: string) => {
        const { error } = await supabase
            .from('practice_schedules')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting schedule:', error);
        } else {
            await fetchSchedules();
        }
    };

    const formatTime = (time: string) => {
        // Convert "16:00:00" to "4:00 PM"
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getScheduleForDay = (group: LevelGroup, dayOfWeek: number) => {
        return group.schedules.find(s => s.day_of_week === dayOfWeek);
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
            {/* Actions */}
            {canManage && (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="btn-primary"
                    >
                        <Plus className="w-4 h-4" />
                        Add Practice Time
                    </button>
                    <button
                        onClick={() => setShowGroupManager(true)}
                        className="btn-secondary"
                    >
                        <Users className="w-4 h-4" />
                        Manage Groups
                    </button>
                </div>
            )}

            {/* Schedule Grid */}
            {levelGroups.length === 0 ? (
                <div className="card p-12 text-center">
                    <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 mb-2">No schedules yet</h3>
                    <p className="text-slate-500 mb-4">
                        {canManage
                            ? 'Add practice times for each level to get started.'
                            : 'No practice schedules have been set up yet.'}
                    </p>
                    {canManage && (
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn-primary"
                        >
                            <Plus className="w-4 h-4" />
                            Add Practice Time
                        </button>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700 min-w-[150px]">
                                        Level / Group
                                    </th>
                                    {DAYS_OF_WEEK_SHORT.map((day) => (
                                        <th
                                            key={day}
                                            className="px-3 py-3 text-center text-sm font-semibold text-slate-700 min-w-[100px]"
                                        >
                                            {day}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {levelGroups.map((group) => {
                                    const isExternal = group.schedules[0]?.is_external_group || false;
                                    return (
                                    <tr key={`${group.level}-${group.schedule_group}`} className={`hover:bg-slate-50 ${isExternal ? 'bg-purple-50/30' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="font-medium text-slate-900">
                                                    {group.level}
                                                </span>
                                                {isExternal && (
                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                                                        External
                                                    </span>
                                                )}
                                                {group.schedule_group !== 'A' && (
                                                    <span className="ml-2 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">
                                                        Group {group.schedule_group}
                                                    </span>
                                                )}
                                                {group.group_label && (
                                                    <p className="text-xs text-slate-500 mt-0.5">{group.group_label}</p>
                                                )}
                                            </div>
                                        </td>
                                        {DAYS_OF_WEEK_SHORT.map((_, dayIndex) => {
                                            const schedule = getScheduleForDay(group, dayIndex);
                                            return (
                                                <td key={dayIndex} className="px-3 py-3 text-center">
                                                    {schedule ? (
                                                        <div className="relative group">
                                                            <div className="inline-flex flex-col items-center px-2 py-1 bg-brand-50 rounded-lg text-sm">
                                                                <span className="font-medium text-brand-700">
                                                                    {formatTime(schedule.start_time)}
                                                                </span>
                                                                <span className="text-brand-600 text-xs">
                                                                    {formatTime(schedule.end_time)}
                                                                </span>
                                                            </div>
                                                            {canManage && (
                                                                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-1">
                                                                    <button
                                                                        onClick={() => setEditingSchedule(schedule)}
                                                                        className="p-1 bg-white rounded shadow-sm hover:bg-slate-100"
                                                                        title="Edit"
                                                                    >
                                                                        <Edit2 className="w-3 h-3 text-slate-600" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDeleteSchedule(schedule.id)}
                                                                        className="p-1 bg-white rounded shadow-sm hover:bg-red-50"
                                                                        title="Delete"
                                                                    >
                                                                        <Trash2 className="w-3 h-3 text-red-500" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Legend */}
            {levelGroups.length > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-medium rounded">Group B</span>
                        <span>= Alternate schedule group</span>
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">External</span>
                        <span>= Groups outside this hub's roster</span>
                    </span>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(showAddModal || editingSchedule) && (
                <AddPracticeModal
                    isOpen={true}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingSchedule(null);
                    }}
                    onSaved={fetchSchedules}
                    editingSchedule={editingSchedule}
                    levels={levels}
                    existingSchedules={schedules}
                    externalGroups={externalGroups}
                />
            )}

            {/* Group Manager */}
            {showGroupManager && (
                <ScheduleGroupManager
                    isOpen={true}
                    onClose={() => setShowGroupManager(false)}
                    levels={levels}
                />
            )}
        </div>
    );
}
