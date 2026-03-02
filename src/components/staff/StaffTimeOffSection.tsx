import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Loader2, Clock, Check, X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format, parseISO, isPast } from 'date-fns';

interface TimeOffRequest {
    id: string;
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick' | 'personal' | 'other';
    notes: string | null;
    status: 'pending' | 'approved' | 'denied';
    decided_by: string | null;
    decided_at: string | null;
    created_at: string;
}

interface StaffTimeOffSectionProps {
    staffUserId: string;
    isOwner: boolean;
    isSelf: boolean;
}

export function StaffTimeOffSection({ staffUserId, isOwner, isSelf }: StaffTimeOffSectionProps) {
    const { hubId } = useParams();
    const { user } = useAuth();

    const [requests, setRequests] = useState<TimeOffRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [filter, setFilter] = useState<'upcoming' | 'past' | 'pending'>('upcoming');

    // Form state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [type, setType] = useState<TimeOffRequest['type']>('vacation');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        fetchRequests();
    }, [staffUserId, hubId]);

    const fetchRequests = async () => {
        if (!hubId) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('staff_time_off')
            .select('*')
            .eq('hub_id', hubId)
            .eq('staff_user_id', staffUserId)
            .order('start_date', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching time off:', error);
        } else {
            setRequests(data || []);
        }
        setLoading(false);
    };

    const handleSubmitRequest = async () => {
        if (!hubId || !startDate || !endDate) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_time_off')
            .insert({
                hub_id: hubId,
                staff_user_id: staffUserId,
                start_date: startDate,
                end_date: endDate,
                type,
                notes: notes.trim() || null,
            });

        if (error) {
            console.error('Error submitting request:', error);
        } else {
            await fetchRequests();
            setShowAddForm(false);
            setStartDate('');
            setEndDate('');
            setType('vacation');
            setNotes('');
        }
        setSaving(false);
    };

    const handleDecision = async (requestId: string, decision: 'approved' | 'denied') => {
        const { error } = await supabase
            .from('staff_time_off')
            .update({
                status: decision,
                decided_by: user?.id,
                decided_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', requestId);

        if (error) {
            console.error('Error updating request:', error);
        } else {
            setRequests(requests.map(r =>
                r.id === requestId
                    ? { ...r, status: decision, decided_by: user?.id || null, decided_at: new Date().toISOString() }
                    : r
            ));
        }
    };

    const handleDeleteRequest = async (requestId: string) => {
        const { error } = await supabase
            .from('staff_time_off')
            .delete()
            .eq('id', requestId);

        if (error) {
            console.error('Error deleting request:', error);
        } else {
            setRequests(requests.filter(r => r.id !== requestId));
        }
    };

    const getTypeColor = (type: TimeOffRequest['type']) => {
        switch (type) {
            case 'vacation': return 'bg-blue-500/10 text-blue-600';
            case 'sick': return 'bg-red-500/10 text-red-600';
            case 'personal': return 'bg-purple-500/10 text-purple-600';
            case 'other': return 'bg-surface-hover text-body';
        }
    };

    const getStatusColor = (status: TimeOffRequest['status']) => {
        switch (status) {
            case 'pending': return 'bg-amber-500/10 text-amber-600';
            case 'approved': return 'bg-green-500/10 text-green-600';
            case 'denied': return 'bg-red-500/10 text-red-600';
        }
    };

    const filteredRequests = requests.filter(r => {
        const endDate = parseISO(r.end_date);
        const isUpcoming = !isPast(endDate);

        if (filter === 'pending') return r.status === 'pending';
        if (filter === 'upcoming') return isUpcoming && r.status !== 'denied';
        if (filter === 'past') return isPast(endDate) || r.status === 'denied';
        return true;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 text-accent-600 animate-spin" />
            </div>
        );
    }

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-heading">Time Off</h3>
                    {pendingCount > 0 && (
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 text-xs font-medium rounded-full">
                            {pendingCount} pending
                        </span>
                    )}
                </div>
                {isSelf && !showAddForm && (
                    <button
                        onClick={() => setShowAddForm(true)}
                        className="flex items-center gap-1.5 text-sm text-accent-600 hover:text-accent-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Request Time Off
                    </button>
                )}
            </div>

            {/* Filter Tabs */}
            <div className="flex bg-surface-hover rounded-lg p-0.5 w-fit">
                {(['pending', 'upcoming', 'past'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setFilter(tab)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                            filter === tab
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-muted hover:text-body'
                        }`}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <div className="p-4 bg-surface-alt rounded-lg border border-line space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">Start Date *</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">End Date *</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-body mb-1">Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value as TimeOffRequest['type'])}
                                className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                            >
                                <option value="vacation">Vacation</option>
                                <option value="sick">Sick</option>
                                <option value="personal">Personal</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-body mb-1">Notes (optional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Any additional details..."
                            className="w-full px-3 py-2 border border-line-strong rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2 text-subtle hover:bg-surface-active rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmitRequest}
                            disabled={saving || !startDate || !endDate}
                            className="flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Submit Request
                        </button>
                    </div>
                </div>
            )}

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
                <div className="text-center py-8">
                    <Clock className="w-10 h-10 text-faint mx-auto mb-3" />
                    <p className="text-sm text-muted">
                        {filter === 'pending'
                            ? 'No pending requests.'
                            : filter === 'upcoming'
                            ? 'No upcoming time off.'
                            : 'No past time off records.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map((request) => (
                        <div
                            key={request.id}
                            className={`p-4 rounded-lg border ${
                                request.status === 'pending'
                                    ? 'bg-amber-500/10 border-amber-500/20'
                                    : request.status === 'denied'
                                    ? 'bg-surface-alt border-line'
                                    : 'bg-surface border-line'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 bg-surface-hover rounded-lg">
                                        <Calendar className="w-5 h-5 text-subtle" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-heading">
                                                {format(parseISO(request.start_date), 'MMM d')}
                                                {request.start_date !== request.end_date && (
                                                    <> - {format(parseISO(request.end_date), 'MMM d, yyyy')}</>
                                                )}
                                                {request.start_date === request.end_date && (
                                                    <>, {format(parseISO(request.start_date), 'yyyy')}</>
                                                )}
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(request.type)}`}>
                                                {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                                            </span>
                                        </div>
                                        {request.notes && (
                                            <p className="text-sm text-muted mt-1">{request.notes}</p>
                                        )}
                                        <p className="text-xs text-faint mt-2">
                                            Requested {format(parseISO(request.created_at), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {request.status === 'pending' && isOwner ? (
                                        <>
                                            <button
                                                onClick={() => handleDecision(request.id, 'approved')}
                                                className="p-2 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/15 transition-colors"
                                                title="Approve"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDecision(request.id, 'denied')}
                                                className="p-2 bg-red-500/10 text-red-600 rounded-lg hover:bg-red-500/15 transition-colors"
                                                title="Deny"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </>
                                    ) : (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(request.status)}`}>
                                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                        </span>
                                    )}
                                    {isSelf && request.status === 'pending' && (
                                        <button
                                            onClick={() => handleDeleteRequest(request.id)}
                                            className="p-2 text-faint hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Cancel Request"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
