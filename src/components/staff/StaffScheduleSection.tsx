import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Trash2, Loader2, Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ScheduleBlock {
    id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    role_label: string;
}

interface StaffScheduleSectionProps {
    staffUserId: string;
    canEdit: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StaffScheduleSection({ staffUserId, canEdit }: StaffScheduleSectionProps) {
    const { hubId } = useParams();

    const [schedules, setSchedules] = useState<ScheduleBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form state
    const [selectedDay, setSelectedDay] = useState(1); // Monday
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [roleLabel, setRoleLabel] = useState('');

    useEffect(() => {
        fetchSchedules();
    }, [staffUserId, hubId]);

    const fetchSchedules = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_schedules')
            .select('*')
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('day_of_week')
            .order('start_time');

        if (error) {
            console.error('Error fetching schedules:', error);
        } else {
            setSchedules(data || []);
        }
        setLoading(false);
    };

    const handleAddSchedule = async () => {
        if (!hubId || !roleLabel.trim()) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_schedules')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                day_of_week: selectedDay,
                start_time: startTime,
                end_time: endTime,
                role_label: roleLabel.trim(),
            });

        if (error) {
            console.error('Error adding schedule:', error);
        } else {
            await fetchSchedules();
            setShowAddForm(false);
            setRoleLabel('');
            setStartTime('09:00');
            setEndTime('17:00');
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
            setSchedules(schedules.filter(s => s.id !== id));
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hour12 = h % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    // Group schedules by day
    const schedulesByDay = DAYS.map((day, index) => ({
        day,
        dayIndex: index,
        blocks: schedules.filter(s => s.day_of_week === index),
    }));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-brand-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-slate-800">Weekly Schedule</h3>
                {canEdit && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Time Block
                    </button>
                )}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                            <select
                                value={selectedDay}
                                onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            >
                                {DAYS.map((day, index) => (
                                    <option key={day} value={index}>{day}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Role/Activity</label>
                            <input
                                type="text"
                                value={roleLabel}
                                onChange={(e) => setRoleLabel(e.target.value)}
                                placeholder="e.g., Admin, Coaching Level 5-7"
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddSchedule}
                            disabled={saving || !roleLabel.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Add
                        </button>
                    </div>
                </div>
            )}

            {/* Schedule Grid */}
            <div className="space-y-2">
                {schedulesByDay.map(({ day, dayIndex, blocks }) => (
                    <div
                        key={day}
                        className={`flex items-start gap-4 p-3 rounded-lg ${
                            blocks.length > 0 ? 'bg-teal-50' : 'bg-slate-50'
                        }`}
                    >
                        <div className="w-20 flex-shrink-0">
                            <span className={`text-sm font-medium ${
                                blocks.length > 0 ? 'text-teal-700' : 'text-slate-500'
                            }`}>
                                {DAY_ABBREV[dayIndex]}
                            </span>
                        </div>
                        <div className="flex-1">
                            {blocks.length === 0 ? (
                                <span className="text-sm text-slate-400">Off</span>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {blocks.map((block) => (
                                        <div
                                            key={block.id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-teal-200 shadow-sm"
                                        >
                                            <Clock className="w-3.5 h-3.5 text-teal-500" />
                                            <span className="text-sm text-slate-700">
                                                {formatTime(block.start_time)} - {formatTime(block.end_time)}
                                            </span>
                                            <span className="text-sm font-medium text-teal-700">
                                                ({block.role_label})
                                            </span>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDeleteSchedule(block.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {schedules.length === 0 && !showAddForm && (
                <p className="text-sm text-slate-500 text-center py-4">
                    No schedule set yet. {canEdit && 'Click "Add Time Block" to get started.'}
                </p>
            )}
        </div>
    );
}
