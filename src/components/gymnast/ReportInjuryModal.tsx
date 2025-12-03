import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';
import type { InjuryReport, MedicalInfo } from '../../types';

interface StaffMember {
    user_id: string;
    full_name: string;
    role: string;
}

interface ReportInjuryModalProps {
    isOpen: boolean;
    onClose: () => void;
    gymnastProfileId: string;
    gymnastName: string;
    currentMedicalInfo: MedicalInfo | null;
    onReportSaved: () => void;
}

export function ReportInjuryModal({
    isOpen,
    onClose,
    gymnastProfileId,
    gymnastName,
    currentMedicalInfo,
    onReportSaved
}: ReportInjuryModalProps) {
    const { user } = useAuth();
    const { hub } = useHub();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Form state
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [location, setLocation] = useState<'competition' | 'practice' | 'other'>('practice');
    const [locationDetails, setLocationDetails] = useState('');
    const [bodyPart, setBodyPart] = useState('');
    const [severity, setSeverity] = useState<'minor' | 'moderate' | 'severe'>('minor');
    const [description, setDescription] = useState('');
    const [response, setResponse] = useState('');
    const [followUp, setFollowUp] = useState('');
    const [reportedBy, setReportedBy] = useState(user?.id || '');

    // Fetch staff members when modal opens
    useEffect(() => {
        if (isOpen && hub) {
            fetchStaffMembers();
            // Reset reportedBy to current user when modal opens
            setReportedBy(user?.id || '');
        }
    }, [isOpen, hub, user]);

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

            // Sort by role importance then by name
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
        if (!reportedBy) return;

        setSaving(true);
        setError(null);

        try {
            // Create the new injury report
            const newReport: InjuryReport = {
                id: crypto.randomUUID(),
                date,
                time,
                location,
                location_details: locationDetails || undefined,
                body_part: bodyPart || undefined,
                severity,
                description,
                response,
                follow_up: followUp || undefined,
                reported_by: reportedBy,
                reported_at: new Date().toISOString(),
                status: 'active'
            };

            // Get existing injury reports or create empty array
            const existingReports = currentMedicalInfo?.injury_reports || [];

            // Build updated medical info
            const updatedMedicalInfo: MedicalInfo = {
                allergies: currentMedicalInfo?.allergies || '',
                medications: currentMedicalInfo?.medications || '',
                conditions: currentMedicalInfo?.conditions || '',
                notes: currentMedicalInfo?.notes || '',
                injury_reports: [...existingReports, newReport]
            };

            // Update the gymnast profile with the new injury report
            const { error: updateError } = await supabase
                .from('gymnast_profiles')
                .update({
                    medical_info: updatedMedicalInfo,
                    updated_at: new Date().toISOString()
                })
                .eq('id', gymnastProfileId);

            if (updateError) throw updateError;

            onReportSaved();
            onClose();
        } catch (err: any) {
            console.error('Error saving injury report:', err);
            setError(err.message || 'Failed to save injury report');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-lg transform rounded-xl bg-white shadow-xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">Report Injury</h2>
                                <p className="text-sm text-slate-500">{gymnastName}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {/* Reported By */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Reported By *
                            </label>
                            {loadingStaff ? (
                                <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Loading staff...
                                </div>
                            ) : (
                                <select
                                    value={reportedBy}
                                    onChange={(e) => setReportedBy(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
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

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Time *
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Location *
                            </label>
                            <select
                                value={location}
                                onChange={(e) => setLocation(e.target.value as 'competition' | 'practice' | 'other')}
                                required
                                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            >
                                <option value="practice">Practice</option>
                                <option value="competition">Competition</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        {/* Location Details (shown for competition or other) */}
                        {(location === 'competition' || location === 'other') && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    {location === 'competition' ? 'Competition Name' : 'Location Details'}
                                </label>
                                <input
                                    type="text"
                                    value={locationDetails}
                                    onChange={(e) => setLocationDetails(e.target.value)}
                                    placeholder={location === 'competition' ? 'e.g., State Championships' : 'e.g., At home, Open gym'}
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                        )}

                        {/* Body Part & Severity */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Body Part Affected
                                </label>
                                <input
                                    type="text"
                                    value={bodyPart}
                                    onChange={(e) => setBodyPart(e.target.value)}
                                    placeholder="e.g., Left ankle, Right wrist"
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">
                                    Severity
                                </label>
                                <select
                                    value={severity}
                                    onChange={(e) => setSeverity(e.target.value as 'minor' | 'moderate' | 'severe')}
                                    className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                                >
                                    <option value="minor">Minor</option>
                                    <option value="moderate">Moderate</option>
                                    <option value="severe">Severe</option>
                                </select>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Injury Description *
                            </label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={3}
                                placeholder="Describe what happened and how the injury occurred..."
                                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Response */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Response / Treatment *
                            </label>
                            <textarea
                                value={response}
                                onChange={(e) => setResponse(e.target.value)}
                                required
                                rows={2}
                                placeholder="What was done in response? (e.g., ice applied, rest, sent to ER, parent called)"
                                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Follow Up */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700">
                                Follow-Up Notes
                            </label>
                            <textarea
                                value={followUp}
                                onChange={(e) => setFollowUp(e.target.value)}
                                rows={2}
                                placeholder="Any follow-up actions needed or additional notes..."
                                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="rounded-md bg-red-50 p-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Report
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>,
        document.body
    );
}
