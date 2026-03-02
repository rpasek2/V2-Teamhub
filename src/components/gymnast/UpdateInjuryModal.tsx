import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardEdit, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { InjuryReport, MedicalInfo } from '../../types';

interface StaffMember {
    user_id: string;
    full_name: string;
    role: string;
}

interface UpdateInjuryModalProps {
    isOpen: boolean;
    onClose: () => void;
    injury: InjuryReport;
    gymnastProfileId: string;
    gymnastName: string;
    currentMedicalInfo: MedicalInfo | null;
    onUpdated: () => void;
}

export function UpdateInjuryModal({
    isOpen,
    onClose,
    injury,
    gymnastProfileId,
    gymnastName,
    currentMedicalInfo,
    onUpdated
}: UpdateInjuryModalProps) {
    const { user } = useAuth();
    const { hub } = useHub();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    const [note, setNote] = useState('');
    const [status, setStatus] = useState(injury.status);
    const [updatedBy, setUpdatedBy] = useState(user?.id || '');

    useEffect(() => {
        if (isOpen && hub) {
            fetchStaffMembers();
            setUpdatedBy(user?.id || '');
            setStatus(injury.status);
            setNote('');
            setError(null);
        }
    }, [isOpen, hub, user, injury.status]);

    const fetchStaffMembers = async () => {
        if (!hub) return;
        setLoadingStaff(true);

        try {
            const { data, error: fetchError } = await supabase
                .from('hub_members')
                .select(`
                    user_id,
                    role,
                    profiles:user_id (full_name)
                `)
                .eq('hub_id', hub.id)
                .in('role', ['owner', 'director', 'admin', 'coach']);

            if (fetchError) throw fetchError;

            const staff: StaffMember[] = (data || []).map((member: any) => ({
                user_id: member.user_id,
                full_name: member.profiles?.full_name || 'Unknown',
                role: member.role
            }));

            const roleOrder = { owner: 0, director: 1, admin: 2, coach: 3 };
            staff.sort((a, b) => {
                const roleCompare = (roleOrder[a.role as keyof typeof roleOrder] || 99) -
                                   (roleOrder[b.role as keyof typeof roleOrder] || 99);
                if (roleCompare !== 0) return roleCompare;
                return a.full_name.localeCompare(b.full_name);
            });

            setStaffMembers(staff);
        } catch (err) {
            console.error('Error fetching staff members:', err);
        } finally {
            setLoadingStaff(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!note.trim() || !updatedBy) return;

        setSaving(true);
        setError(null);

        try {
            const statusChanged = status !== injury.status;
            const update = {
                id: crypto.randomUUID(),
                note: note.trim(),
                updated_by: updatedBy,
                updated_at: new Date().toISOString(),
                ...(statusChanged ? { status_change: { from: injury.status, to: status } } : {})
            };

            const existingReports = currentMedicalInfo?.injury_reports || [];
            const updatedReports = existingReports.map(r => {
                if (r.id !== injury.id) return r;
                return {
                    ...r,
                    status,
                    updates: [...(r.updates || []), update]
                };
            });

            const updatedMedicalInfo: MedicalInfo = {
                allergies: currentMedicalInfo?.allergies || '',
                medications: currentMedicalInfo?.medications || '',
                conditions: currentMedicalInfo?.conditions || '',
                notes: currentMedicalInfo?.notes || '',
                injury_reports: updatedReports
            };

            const { error: updateError } = await supabase
                .from('gymnast_profiles')
                .update({
                    medical_info: updatedMedicalInfo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', gymnastProfileId);

            if (updateError) throw updateError;

            onUpdated();
            onClose();
        } catch (err: any) {
            console.error('Error updating injury report:', err);
            setError(err.message || 'Failed to update injury report');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                <div className="relative w-full max-w-lg transform rounded-xl bg-surface shadow-xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                                <ClipboardEdit className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-heading">Update Injury Report</h2>
                                <p className="text-sm text-muted">{gymnastName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-faint hover:bg-surface-hover hover:text-subtle"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Injury summary */}
                        <div className="rounded-lg bg-surface-alt p-3 text-sm text-subtle">
                            <div className="font-medium text-body">{injury.body_part || 'Injury'} — {injury.date}</div>
                            <p className="mt-1 line-clamp-2">{injury.description}</p>
                        </div>

                        {/* Updated By */}
                        <div>
                            <label className="block text-sm font-medium text-body">
                                Updated By *
                            </label>
                            {loadingStaff ? (
                                <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading staff...
                                </div>
                            ) : (
                                <select
                                    value={updatedBy}
                                    onChange={(e) => setUpdatedBy(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-line-strong px-3 py-2 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                                >
                                    <option value="">Select staff member...</option>
                                    {staffMembers.map((staff) => (
                                        <option key={staff.user_id} value={staff.user_id}>
                                            {staff.full_name} ({staff.role})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-body">
                                Status
                            </label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as 'active' | 'recovering' | 'resolved')}
                                className="mt-1 block w-full rounded-md border border-line-strong px-3 py-2 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                            >
                                <option value="active">Active</option>
                                <option value="recovering">Recovering</option>
                                <option value="resolved">Resolved</option>
                            </select>
                            {status !== injury.status && (
                                <p className="mt-1 text-xs text-amber-600">
                                    Status will change from "{injury.status}" to "{status}"
                                </p>
                            )}
                        </div>

                        {/* Note */}
                        <div>
                            <label className="block text-sm font-medium text-body">
                                Update Note *
                            </label>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                required
                                rows={3}
                                placeholder="e.g., Doctor cleared for light activity, continue physical therapy twice a week..."
                                className="mt-1 block w-full rounded-md border border-line-strong px-3 py-2 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-md bg-red-50 p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-line">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-body hover:bg-surface-hover"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving || !note.trim()}
                                className="inline-flex items-center rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Update
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
