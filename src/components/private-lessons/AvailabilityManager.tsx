import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Clock, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { LessonAvailability, LessonSlot } from '../../types';
import { DAYS_OF_WEEK } from '../../types';

interface AvailabilityManagerProps {
    onAvailabilityUpdated?: () => void;
}

export function AvailabilityManager({ onAvailabilityUpdated }: AvailabilityManagerProps) {
    const { user } = useAuth();
    const { hub } = useHub();

    const [recurring, setRecurring] = useState<LessonAvailability[]>([]);
    const [oneOffSlots, setOneOffSlots] = useState<LessonSlot[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // New recurring slot form
    const [showAddRecurring, setShowAddRecurring] = useState(false);
    const [newDayOfWeek, setNewDayOfWeek] = useState(1);
    const [newStartTime, setNewStartTime] = useState('16:00');
    const [newEndTime, setNewEndTime] = useState('17:00');

    // New one-off slot form
    const [showAddOneOff, setShowAddOneOff] = useState(false);
    const [newSlotDate, setNewSlotDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
    const [newSlotStartTime, setNewSlotStartTime] = useState('16:00');
    const [newSlotEndTime, setNewSlotEndTime] = useState('17:00');

    // Expand/collapse sections
    const [recurringExpanded, setRecurringExpanded] = useState(true);
    const [oneOffExpanded, setOneOffExpanded] = useState(true);

    useEffect(() => {
        if (hub && user) {
            fetchAvailability();
        }
    }, [hub, user]);

    const fetchAvailability = async () => {
        if (!hub || !user) return;

        setLoading(true);
        try {
            // Fetch recurring availability
            const { data: recurringData, error: recurringError } = await supabase
                .from('lesson_availability')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', user.id)
                .eq('is_active', true)
                .order('day_of_week', { ascending: true })
                .order('start_time', { ascending: true });

            if (recurringError) throw recurringError;
            setRecurring(recurringData || []);

            // Fetch one-off slots (future only)
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data: slotsData, error: slotsError } = await supabase
                .from('lesson_slots')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', user.id)
                .eq('is_one_off', true)
                .gte('slot_date', today)
                .neq('status', 'cancelled')
                .order('slot_date', { ascending: true })
                .order('start_time', { ascending: true });

            if (slotsError) throw slotsError;
            setOneOffSlots(slotsData || []);
        } catch (err) {
            console.error('Error fetching availability:', err);
            setError('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const addRecurringSlot = async () => {
        if (!hub || !user) return;

        if (newStartTime >= newEndTime) {
            setError('End time must be after start time');
            return;
        }

        setError('');
        setSaving(true);

        try {
            const { error: insertError } = await supabase
                .from('lesson_availability')
                .insert({
                    hub_id: hub.id,
                    coach_user_id: user.id,
                    day_of_week: newDayOfWeek,
                    start_time: newStartTime + ':00',
                    end_time: newEndTime + ':00',
                    is_active: true,
                });

            if (insertError) throw insertError;

            setShowAddRecurring(false);
            setNewStartTime('16:00');
            setNewEndTime('17:00');
            fetchAvailability();
            onAvailabilityUpdated?.();
        } catch (err) {
            console.error('Error adding recurring slot:', err);
            setError('Failed to add recurring slot');
        } finally {
            setSaving(false);
        }
    };

    const deleteRecurringSlot = async (id: string) => {
        if (!confirm('Delete this recurring availability?')) return;

        try {
            const { error: deleteError } = await supabase
                .from('lesson_availability')
                .update({ is_active: false })
                .eq('id', id);

            if (deleteError) throw deleteError;

            fetchAvailability();
            onAvailabilityUpdated?.();
        } catch (err) {
            console.error('Error deleting recurring slot:', err);
            setError('Failed to delete slot');
        }
    };

    const addOneOffSlot = async () => {
        if (!hub || !user) return;

        if (newSlotStartTime >= newSlotEndTime) {
            setError('End time must be after start time');
            return;
        }

        setError('');
        setSaving(true);

        try {
            // Get coach's lesson profile for max_gymnasts
            const { data: profile } = await supabase
                .from('coach_lesson_profiles')
                .select('max_gymnasts_per_slot')
                .eq('hub_id', hub.id)
                .eq('coach_user_id', user.id)
                .single();

            const maxGymnasts = profile?.max_gymnasts_per_slot || 1;

            const { error: insertError } = await supabase
                .from('lesson_slots')
                .insert({
                    hub_id: hub.id,
                    coach_user_id: user.id,
                    slot_date: newSlotDate,
                    start_time: newSlotStartTime + ':00',
                    end_time: newSlotEndTime + ':00',
                    max_gymnasts: maxGymnasts,
                    is_one_off: true,
                    status: 'available',
                });

            if (insertError) throw insertError;

            setShowAddOneOff(false);
            setNewSlotDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
            setNewSlotStartTime('16:00');
            setNewSlotEndTime('17:00');
            fetchAvailability();
            onAvailabilityUpdated?.();
        } catch (err) {
            console.error('Error adding one-off slot:', err);
            setError('Failed to add slot');
        } finally {
            setSaving(false);
        }
    };

    const deleteOneOffSlot = async (id: string) => {
        if (!confirm('Delete this one-off slot?')) return;

        try {
            const { error: deleteError } = await supabase
                .from('lesson_slots')
                .update({ status: 'cancelled' })
                .eq('id', id);

            if (deleteError) throw deleteError;

            fetchAvailability();
            onAvailabilityUpdated?.();
        } catch (err) {
            console.error('Error deleting slot:', err);
            setError('Failed to delete slot');
        }
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="card p-8 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Error Message */}
            {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Recurring Availability Section */}
            <div className="card">
                <button
                    onClick={() => setRecurringExpanded(!recurringExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-slate-900">Weekly Recurring</h3>
                            <p className="text-sm text-slate-500">{recurring.length} time slots</p>
                        </div>
                    </div>
                    {recurringExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>

                {recurringExpanded && (
                    <div className="border-t border-slate-200 p-4">
                        {/* Existing slots grouped by day */}
                        {recurring.length > 0 ? (
                            <div className="space-y-3 mb-4">
                                {DAYS_OF_WEEK.map((day, dayIndex) => {
                                    const daySlots = recurring.filter(r => r.day_of_week === dayIndex);
                                    if (daySlots.length === 0) return null;

                                    return (
                                        <div key={dayIndex}>
                                            <p className="text-xs font-semibold text-slate-500 uppercase mb-2">{day}</p>
                                            <div className="space-y-2">
                                                {daySlots.map(slot => (
                                                    <div
                                                        key={slot.id}
                                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                                    >
                                                        <span className="text-sm font-medium text-slate-700">
                                                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                        </span>
                                                        <button
                                                            onClick={() => deleteRecurringSlot(slot.id)}
                                                            className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 mb-4">No recurring availability set</p>
                        )}

                        {/* Add New Recurring Form */}
                        {showAddRecurring ? (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <select
                                        value={newDayOfWeek}
                                        onChange={(e) => setNewDayOfWeek(parseInt(e.target.value))}
                                        className="input"
                                    >
                                        {DAYS_OF_WEEK.map((day, index) => (
                                            <option key={index} value={index}>{day}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="time"
                                        value={newStartTime}
                                        onChange={(e) => setNewStartTime(e.target.value)}
                                        className="input"
                                    />
                                    <input
                                        type="time"
                                        value={newEndTime}
                                        onChange={(e) => setNewEndTime(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowAddRecurring(false)}
                                        className="btn-secondary text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addRecurringSlot}
                                        disabled={saving}
                                        className="btn-primary text-sm"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddRecurring(true)}
                                className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Weekly Time Slot
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* One-Off Slots Section */}
            <div className="card">
                <button
                    onClick={() => setOneOffExpanded(!oneOffExpanded)}
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-slate-900">One-Off Slots</h3>
                            <p className="text-sm text-slate-500">{oneOffSlots.length} upcoming slots</p>
                        </div>
                    </div>
                    {oneOffExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                    )}
                </button>

                {oneOffExpanded && (
                    <div className="border-t border-slate-200 p-4">
                        {/* Existing one-off slots */}
                        {oneOffSlots.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {oneOffSlots.map(slot => (
                                    <div
                                        key={slot.id}
                                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {format(parseISO(slot.slot_date), 'EEE, MMM d, yyyy')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                                                {slot.status !== 'available' && (
                                                    <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                                                        slot.status === 'booked'
                                                            ? 'bg-green-100 text-green-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {slot.status}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {slot.status === 'available' && (
                                            <button
                                                onClick={() => deleteOneOffSlot(slot.id)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-slate-500 mb-4">No one-off slots scheduled</p>
                        )}

                        {/* Add New One-Off Form */}
                        {showAddOneOff ? (
                            <div className="p-4 bg-violet-50 rounded-lg border border-violet-200">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <input
                                        type="date"
                                        value={newSlotDate}
                                        onChange={(e) => setNewSlotDate(e.target.value)}
                                        min={format(new Date(), 'yyyy-MM-dd')}
                                        className="input"
                                    />
                                    <input
                                        type="time"
                                        value={newSlotStartTime}
                                        onChange={(e) => setNewSlotStartTime(e.target.value)}
                                        className="input"
                                    />
                                    <input
                                        type="time"
                                        value={newSlotEndTime}
                                        onChange={(e) => setNewSlotEndTime(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setShowAddOneOff(false)}
                                        className="btn-secondary text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addOneOffSlot}
                                        disabled={saving}
                                        className="btn-primary text-sm"
                                    >
                                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddOneOff(true)}
                                className="w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-violet-400 hover:text-violet-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add One-Off Slot
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
