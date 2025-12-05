import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';
import {
    X, User, Calendar, ClipboardList, CheckSquare, Award,
    Clock, FileText, Mail, Phone, Loader2, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { StaffScheduleSection } from './StaffScheduleSection';
import { StaffResponsibilitiesSection } from './StaffResponsibilitiesSection';
import { StaffTasksSection } from './StaffTasksSection';
import { StaffCertificationsSection } from './StaffCertificationsSection';
import { StaffTimeOffSection } from './StaffTimeOffSection';
import { StaffNotesSection } from './StaffNotesSection';

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

interface StaffProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffMember: StaffMember;
    onUpdate: () => void;
}

type TabType = 'profile' | 'schedule' | 'responsibilities' | 'tasks' | 'certifications' | 'timeoff' | 'notes';

export function StaffProfileModal({ isOpen, onClose, staffMember, onUpdate }: StaffProfileModalProps) {
    const { hubId } = useParams();
    const { currentRole } = useHub();
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Profile form state
    const [title, setTitle] = useState(staffMember.staff_profile?.title || '');
    const [bio, setBio] = useState(staffMember.staff_profile?.bio || '');
    const [phone, setPhone] = useState(staffMember.staff_profile?.phone || '');
    const [email, setEmail] = useState(staffMember.staff_profile?.email || '');
    const [hireDate, setHireDate] = useState(staffMember.staff_profile?.hire_date || '');

    const isOwner = currentRole === 'owner';
    const isSelf = user?.id === staffMember.user_id;
    const canEdit = isOwner || isSelf;

    useEffect(() => {
        // Reset form when staff member changes
        setTitle(staffMember.staff_profile?.title || '');
        setBio(staffMember.staff_profile?.bio || '');
        setPhone(staffMember.staff_profile?.phone || '');
        setEmail(staffMember.staff_profile?.email || '');
        setHireDate(staffMember.staff_profile?.hire_date || '');
        setIsEditing(false);
    }, [staffMember]);

    const handleSaveProfile = async () => {
        if (!hubId) return;
        setSaving(true);

        try {
            if (staffMember.staff_profile?.id) {
                // Update existing profile
                const { error } = await supabase
                    .from('staff_profiles')
                    .update({
                        title: title || null,
                        bio: bio || null,
                        phone: phone || null,
                        email: email || null,
                        hire_date: hireDate || null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', staffMember.staff_profile.id);

                if (error) throw error;
            } else {
                // Create new profile
                const { error } = await supabase
                    .from('staff_profiles')
                    .insert({
                        hub_id: hubId,
                        user_id: staffMember.user_id,
                        title: title || null,
                        bio: bio || null,
                        phone: phone || null,
                        email: email || null,
                        hire_date: hireDate || null,
                    });

                if (error) throw error;
            }

            setIsEditing(false);
            onUpdate();
        } catch (error) {
            console.error('Error saving profile:', error);
        } finally {
            setSaving(false);
        }
    };

    const tabs: { id: TabType; label: string; icon: React.ReactNode; ownerOnly?: boolean }[] = [
        { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
        { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
        { id: 'responsibilities', label: 'Responsibilities', icon: <ClipboardList className="w-4 h-4" /> },
        { id: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-4 h-4" /> },
        { id: 'certifications', label: 'Certifications', icon: <Award className="w-4 h-4" /> },
        { id: 'timeoff', label: 'Time Off', icon: <Clock className="w-4 h-4" /> },
        { id: 'notes', label: 'Notes', icon: <FileText className="w-4 h-4" />, ownerOnly: true },
    ];

    const visibleTabs = tabs.filter(tab => !tab.ownerOnly || isOwner);

    const initials = staffMember.profile?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';

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
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex items-center gap-4">
                        {staffMember.profile?.avatar_url ? (
                            <img
                                src={staffMember.profile.avatar_url}
                                alt={staffMember.profile.full_name}
                                className="w-12 h-12 rounded-full object-cover"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                                <span className="text-teal-700 font-semibold">{initials}</span>
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">
                                {staffMember.profile?.full_name}
                            </h2>
                            <div className="flex items-center gap-2">
                                {staffMember.staff_profile?.title && (
                                    <span className="text-sm text-slate-500">{staffMember.staff_profile.title}</span>
                                )}
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(staffMember.role)}`}>
                                    {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-slate-200 bg-white">
                    {visibleTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-teal-500 text-teal-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            {/* Edit toggle */}
                            {canEdit && !isEditing && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                                    >
                                        Edit Profile
                                    </button>
                                </div>
                            )}

                            {isEditing ? (
                                <div className="space-y-4">
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
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => {
                                                setIsEditing(false);
                                                setTitle(staffMember.staff_profile?.title || '');
                                                setBio(staffMember.staff_profile?.bio || '');
                                                setPhone(staffMember.staff_profile?.phone || '');
                                                setEmail(staffMember.staff_profile?.email || '');
                                                setHireDate(staffMember.staff_profile?.hire_date || '');
                                            }}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-50"
                                        >
                                            {saving ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4" />
                                            )}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Contact Info */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <Mail className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="text-xs text-slate-500">Email</p>
                                                <p className="text-sm text-slate-700">
                                                    {staffMember.staff_profile?.email || staffMember.profile?.email || 'Not set'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                            <Phone className="w-5 h-5 text-slate-400" />
                                            <div>
                                                <p className="text-xs text-slate-500">Phone</p>
                                                <p className="text-sm text-slate-700">
                                                    {staffMember.staff_profile?.phone || 'Not set'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-2">Bio</h3>
                                        <p className="text-sm text-slate-600">
                                            {staffMember.staff_profile?.bio || 'No bio added yet.'}
                                        </p>
                                    </div>

                                    {/* Hire Date */}
                                    {staffMember.staff_profile?.hire_date && (
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-700 mb-2">Hire Date</h3>
                                            <p className="text-sm text-slate-600">
                                                {new Date(staffMember.staff_profile.hire_date).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'schedule' && (
                        <StaffScheduleSection
                            staffUserId={staffMember.user_id}
                            canEdit={canEdit}
                        />
                    )}

                    {activeTab === 'responsibilities' && (
                        <StaffResponsibilitiesSection
                            staffUserId={staffMember.user_id}
                            canEdit={canEdit}
                        />
                    )}

                    {activeTab === 'tasks' && (
                        <StaffTasksSection
                            staffUserId={staffMember.user_id}
                            isOwner={isOwner}
                            isSelf={isSelf}
                        />
                    )}

                    {activeTab === 'certifications' && (
                        <StaffCertificationsSection
                            staffUserId={staffMember.user_id}
                            canEdit={canEdit}
                        />
                    )}

                    {activeTab === 'timeoff' && (
                        <StaffTimeOffSection
                            staffUserId={staffMember.user_id}
                            isOwner={isOwner}
                            isSelf={isSelf}
                        />
                    )}

                    {activeTab === 'notes' && isOwner && (
                        <StaffNotesSection
                            staffUserId={staffMember.user_id}
                        />
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
