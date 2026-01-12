import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { DAYS_OF_WEEK, DAYS_OF_WEEK_SHORT } from '../../types';
import type { PracticeSchedule } from '../../types';

interface AddPracticeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
    editingSchedule: PracticeSchedule | null;
    levels: string[];
    existingSchedules: PracticeSchedule[];
    externalGroups?: string[];
}

export function AddPracticeModal({
    isOpen,
    onClose,
    onSaved,
    editingSchedule,
    levels,
    existingSchedules,
    externalGroups = []
}: AddPracticeModalProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    // Determine if editing an external group
    const isEditingExternal = editingSchedule?.is_external_group || false;

    const [isExternalGroup, setIsExternalGroup] = useState(isEditingExternal);
    const [level, setLevel] = useState(editingSchedule?.level || levels[0] || '');
    const [customLevel, setCustomLevel] = useState(isEditingExternal ? editingSchedule?.level || '' : '');
    const [scheduleGroup, setScheduleGroup] = useState(editingSchedule?.schedule_group || 'A');
    const [groupLabel, setGroupLabel] = useState(editingSchedule?.group_label || '');
    // For editing, use single day; for adding, allow multiple days
    const [selectedDays, setSelectedDays] = useState<number[]>(
        editingSchedule ? [editingSchedule.day_of_week] : []
    );
    const [startTime, setStartTime] = useState(editingSchedule?.start_time?.slice(0, 5) || '16:00');
    const [endTime, setEndTime] = useState(editingSchedule?.end_time?.slice(0, 5) || '20:00');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const toggleDay = (dayIndex: number) => {
        if (editingSchedule) {
            // In edit mode, only allow single selection
            setSelectedDays([dayIndex]);
        } else {
            // In add mode, allow multiple selection
            setSelectedDays(prev =>
                prev.includes(dayIndex)
                    ? prev.filter(d => d !== dayIndex)
                    : [...prev, dayIndex]
            );
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Determine the actual level to use
        const actualLevel = isExternalGroup ? customLevel.trim() : level;

        if (!hubId || !actualLevel) {
            setError(isExternalGroup ? 'Please enter a group name' : 'Please select a level');
            return;
        }

        setError('');
        setSaving(true);

        // Validate at least one day is selected
        if (selectedDays.length === 0) {
            setError('Please select at least one day');
            setSaving(false);
            return;
        }

        // Validate times
        if (startTime >= endTime) {
            setError('End time must be after start time');
            setSaving(false);
            return;
        }

        // Check for conflicts (same level, group, and any selected day)
        const conflictingDays: string[] = [];
        for (const dayOfWeek of selectedDays) {
            const conflicting = existingSchedules.find(
                s => s.level === actualLevel &&
                    s.schedule_group === scheduleGroup &&
                    s.day_of_week === dayOfWeek &&
                    s.id !== editingSchedule?.id
            );
            if (conflicting) {
                conflictingDays.push(DAYS_OF_WEEK[dayOfWeek]);
            }
        }

        if (conflictingDays.length > 0) {
            setError(`A schedule already exists for ${actualLevel} Group ${scheduleGroup} on ${conflictingDays.join(', ')}`);
            setSaving(false);
            return;
        }

        if (editingSchedule) {
            // Update single schedule
            const scheduleData = {
                hub_id: hubId,
                level: actualLevel,
                schedule_group: scheduleGroup,
                group_label: groupLabel.trim() || null,
                day_of_week: selectedDays[0],
                start_time: startTime + ':00',
                end_time: endTime + ':00',
                is_external_group: isExternalGroup,
                updated_at: new Date().toISOString()
            };

            const { error: updateError } = await supabase
                .from('practice_schedules')
                .update(scheduleData)
                .eq('id', editingSchedule.id);

            if (updateError) {
                console.error('Error updating schedule:', updateError);
                setError('Failed to update schedule');
                setSaving(false);
                return;
            }
        } else {
            // Insert multiple schedules (one per selected day)
            const schedulesToInsert = selectedDays.map(dayOfWeek => ({
                hub_id: hubId,
                level: actualLevel,
                schedule_group: scheduleGroup,
                group_label: groupLabel.trim() || null,
                day_of_week: dayOfWeek,
                start_time: startTime + ':00',
                end_time: endTime + ':00',
                is_external_group: isExternalGroup,
                created_by: user?.id,
            }));

            const { error: insertError } = await supabase
                .from('practice_schedules')
                .insert(schedulesToInsert);

            if (insertError) {
                console.error('Error creating schedules:', insertError);
                setError('Failed to create schedules');
                setSaving(false);
                return;
            }
        }

        await onSaved();
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="card p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                        {editingSchedule ? 'Edit Practice Time' : 'Add Practice Time'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Group Type Toggle */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Group Type
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setIsExternalGroup(false)}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    !isExternalGroup
                                        ? 'bg-brand-100 text-brand-700 border-2 border-brand-300'
                                        : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                }`}
                            >
                                Roster Level
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsExternalGroup(true)}
                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    isExternalGroup
                                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-300'
                                        : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                }`}
                            >
                                External Group
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {isExternalGroup
                                ? 'Add groups not in this hub (e.g., Preteam, Boys, Xcel)'
                                : 'Select a level from your hub roster'}
                        </p>
                    </div>

                    {/* Level Selection or Custom Group Name */}
                    {isExternalGroup ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Group Name *
                            </label>
                            <input
                                type="text"
                                value={customLevel}
                                onChange={(e) => setCustomLevel(e.target.value)}
                                placeholder="e.g., Preteam, Boys Team, Xcel Silver"
                                className="input w-full"
                                list="external-groups-list"
                            />
                            {externalGroups.length > 0 && (
                                <datalist id="external-groups-list">
                                    {externalGroups.map((group) => (
                                        <option key={group} value={group} />
                                    ))}
                                </datalist>
                            )}
                            <p className="text-xs text-slate-500 mt-1">
                                This group will appear on the rotation schedule but not in your roster
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Level *
                            </label>
                            <select
                                value={level}
                                onChange={(e) => setLevel(e.target.value)}
                                className="input w-full"
                            >
                                {levels.length === 0 && (
                                    <option value="">No levels configured</option>
                                )}
                                {levels.map((lvl) => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Schedule Group */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Schedule Group
                        </label>
                        <div className="flex gap-2">
                            {['A', 'B', 'C'].map((group) => (
                                <button
                                    key={group}
                                    type="button"
                                    onClick={() => setScheduleGroup(group)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                        scheduleGroup === group
                                            ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-300'
                                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                    }`}
                                >
                                    Group {group}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            Use groups for levels with different practice schedules (e.g., A = Mon/Wed, B = Tue/Thu)
                        </p>
                    </div>

                    {/* Group Label (optional) */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Group Label (optional)
                        </label>
                        <input
                            type="text"
                            value={groupLabel}
                            onChange={(e) => setGroupLabel(e.target.value)}
                            placeholder="e.g., Level 5A - Mon/Wed/Fri"
                            className="input w-full"
                        />
                    </div>

                    {/* Days of Week */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            {editingSchedule ? 'Day of Week *' : 'Days of Week *'}
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {DAYS_OF_WEEK_SHORT.map((day, index) => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(index)}
                                    className={`w-12 h-10 rounded-lg text-sm font-medium transition-colors ${
                                        selectedDays.includes(index)
                                            ? 'bg-brand-100 text-brand-700 border-2 border-brand-300'
                                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200'
                                    }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>
                        {!editingSchedule && (
                            <p className="text-xs text-slate-500 mt-1">
                                Select multiple days to add the same practice time
                            </p>
                        )}
                    </div>

                    {/* Time Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Start Time *
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                required
                                className="input w-full"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                End Time *
                            </label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                required
                                className="input w-full"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || selectedDays.length === 0 || (isExternalGroup ? !customLevel.trim() : !level)}
                            className="btn-primary"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {editingSchedule
                                ? 'Save Changes'
                                : selectedDays.length > 1
                                    ? `Add ${selectedDays.length} Schedules`
                                    : 'Add Schedule'
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
