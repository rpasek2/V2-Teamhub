import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import { X, Loader2, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StaffMember {
    user_id: string;
    role: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
    staff_profile?: {
        id: string;
        title: string | null;
        bio: string | null;
        phone: string | null;
        email: string | null;
        hire_date: string | null;
        status: string;
    } | null;
    pending_time_off: number;
    pending_tasks: number;
}

interface CreateStaffProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingStaff: StaffMember[];
    onCreated: () => void;
}

export function CreateStaffProfileModal({ isOpen, onClose, existingStaff, onCreated }: CreateStaffProfileModalProps) {
    const { hubId } = useParams();

    const [selectedUserId, setSelectedUserId] = useState('');
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [hireDate, setHireDate] = useState('');
    const [saving, setSaving] = useState(false);

    // Staff members who don't have a profile yet
    const availableStaff = existingStaff.filter(s => !s.staff_profile);

    const handleSubmit = async () => {
        if (!hubId || !selectedUserId) return;
        setSaving(true);

        const { error } = await supabase
            .from('staff_profiles')
            .insert({
                hub_id: hubId,
                user_id: selectedUserId,
                title: title.trim() || null,
                bio: bio.trim() || null,
                phone: phone.trim() || null,
                email: email.trim() || null,
                hire_date: hireDate || null,
            });

        if (error) {
            console.error('Error creating staff profile:', error);
        } else {
            onCreated();
            onClose();
        }
        setSaving(false);
    };

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'owner': return 'bg-amber-100 text-amber-700';
            case 'director': return 'bg-purple-100 text-purple-700';
            case 'admin': return 'bg-blue-100 text-blue-700';
            case 'coach': return 'bg-green-100 text-green-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 rounded-lg">
                            <UserPlus className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-slate-800">Create Staff Profile</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {availableStaff.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-500">
                                All staff members already have profiles.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Select Staff Member */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Select Staff Member *
                                </label>
                                <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                                    {availableStaff.map((member) => (
                                        <label
                                            key={member.user_id}
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                                selectedUserId === member.user_id
                                                    ? 'bg-teal-50 border border-teal-300'
                                                    : 'hover:bg-slate-50 border border-transparent'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="staff_member"
                                                value={member.user_id}
                                                checked={selectedUserId === member.user_id}
                                                onChange={(e) => setSelectedUserId(e.target.value)}
                                                className="text-teal-600 focus:ring-teal-500"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800">
                                                        {member.profile?.full_name || 'Unknown'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-slate-500">{member.profile?.email}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Profile Details */}
                            {selectedUserId && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Head Coach, Program Director"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={3}
                                            placeholder="A brief description..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Work Phone</label>
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="(555) 123-4567"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="work@example.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                                        <input
                                            type="date"
                                            value={hireDate}
                                            onChange={(e) => setHireDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </div>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {availableStaff.length > 0 && (
                    <div className="flex justify-end gap-3 p-4 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={saving || !selectedUserId}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Profile
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
}
