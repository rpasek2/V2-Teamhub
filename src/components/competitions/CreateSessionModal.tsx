import { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface Session {
    id: string;
    name: string;
    date: string;
    warmup_time: string | null;
}

interface CreateSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSessionCreated: () => void;
    competitionId: string;
    defaultDate?: string;
    editSession?: Session | null;
}

interface Coach {
    user_id: string;
    profiles: {
        full_name: string;
    };
}

export function CreateSessionModal({ isOpen, onClose, onSessionCreated, competitionId, defaultDate, editSession }: CreateSessionModalProps) {
    const { hub } = useHub();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [selectedCoaches, setSelectedCoaches] = useState<string[]>([]);

    const isEditing = !!editSession;

    const [formData, setFormData] = useState({
        name: '',
        date: defaultDate || '',
        checkInTime: ''
    });

    useEffect(() => {
        if (isOpen && hub) {
            fetchCoaches();
            // Pre-fill form if editing
            if (editSession) {
                setFormData({
                    name: editSession.name,
                    date: editSession.date,
                    checkInTime: editSession.warmup_time || ''
                });
            } else {
                setFormData({
                    name: '',
                    date: defaultDate || '',
                    checkInTime: ''
                });
            }
        }
    }, [isOpen, hub, editSession]);

    const fetchCoaches = async () => {
        if (!hub) return;
        const { data, error } = await supabase
            .from('hub_members')
            .select('user_id, profiles(full_name)')
            .eq('hub_id', hub.id)
            .in('role', ['owner', 'admin', 'director', 'coach']);

        if (error) {
            console.error('Error fetching coaches:', error);
        } else if (data) {
            const mapped = data.map((d: { user_id: string; profiles: { full_name: string } | { full_name: string }[] }) => ({
                user_id: d.user_id,
                profiles: Array.isArray(d.profiles) ? d.profiles[0] : d.profiles
            }));
            setCoaches(mapped as Coach[]);
        }
    };

    const toggleCoach = (userId: string) => {
        setSelectedCoaches(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEditing && editSession) {
                // Update existing session
                const { error: updateError } = await supabase
                    .from('competition_sessions')
                    .update({
                        name: formData.name,
                        date: formData.date,
                        warmup_time: formData.checkInTime || null
                    })
                    .eq('id', editSession.id);

                if (updateError) throw updateError;
            } else {
                // Create new session
                const { data: sessionData, error: insertError } = await supabase
                    .from('competition_sessions')
                    .insert({
                        competition_id: competitionId,
                        name: formData.name,
                        date: formData.date,
                        warmup_time: formData.checkInTime || null
                    })
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Assign selected coaches to the session
                if (selectedCoaches.length > 0 && sessionData) {
                    const { error: coachError } = await supabase
                        .from('session_coaches')
                        .insert(selectedCoaches.map(userId => ({
                            session_id: sessionData.id,
                            user_id: userId
                        })));
                    if (coachError) throw coachError;
                }
            }

            onSessionCreated();
            onClose();
            setFormData({
                name: '',
                date: defaultDate || '',
                checkInTime: ''
            });
            setSelectedCoaches([]);
        } catch (err: any) {
            console.error('Error saving session:', err);
            setError(err.message || 'Failed to save session');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/50"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-[10000] w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                {/* Close Button */}
                <div className="absolute top-4 right-4">
                    <button
                        type="button"
                        className="rounded-md text-slate-400 hover:text-slate-500"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-slate-900 pr-8" id="modal-title">
                    {isEditing ? 'Edit Session' : 'Add Session'}
                </h3>

                {/* Content */}
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3">
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-800">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Session Name */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                            Session Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                            placeholder="e.g., Session 1, Morning Session"
                        />
                    </div>

                    {/* Date and Check-In Time */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium text-slate-700">
                                Date
                            </label>
                            <input
                                type="date"
                                name="date"
                                id="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                            />
                        </div>
                        <div>
                            <label htmlFor="checkInTime" className="block text-sm font-medium text-slate-700">
                                Check-In Time
                            </label>
                            <input
                                type="time"
                                name="checkInTime"
                                id="checkInTime"
                                value={formData.checkInTime}
                                onChange={(e) => setFormData({ ...formData, checkInTime: e.target.value })}
                                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Coach Assignment - only show when creating */}
                    {!isEditing && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Assign Coaches <span className="text-slate-400 font-normal">(optional)</span>
                            </label>
                            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-md border border-slate-300">
                                {coaches.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {coaches.map((coach) => (
                                            <div
                                                key={coach.user_id}
                                                className={`flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-slate-50 ${
                                                    selectedCoaches.includes(coach.user_id) ? 'bg-brand-50' : ''
                                                }`}
                                                onClick={() => toggleCoach(coach.user_id)}
                                            >
                                                <span className="text-sm text-slate-900">{coach.profiles.full_name}</span>
                                                {selectedCoaches.includes(coach.user_id) && (
                                                    <Check className="h-4 w-4 text-brand-600" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="px-3 py-2 text-sm text-slate-500">No coaches available</p>
                                )}
                            </div>
                            {selectedCoaches.length > 0 && (
                                <p className="mt-1 text-xs text-slate-500">
                                    {selectedCoaches.length} coach{selectedCoaches.length !== 1 ? 'es' : ''} selected
                                </p>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {isEditing ? 'Saving...' : 'Adding...'}
                                </>
                            ) : (
                                isEditing ? 'Save Changes' : 'Add Session'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
