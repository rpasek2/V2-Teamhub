import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Calendar, ClipboardList, CheckSquare, Award,
    Clock, FileText, Mail, Phone, Loader2, Pencil, X, Check, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isTabEnabled } from '../lib/permissions';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { StaffScheduleSection } from '../components/staff/StaffScheduleSection';
import { StaffResponsibilitiesSection } from '../components/staff/StaffResponsibilitiesSection';
import { StaffTasksSection } from '../components/staff/StaffTasksSection';
import { StaffCertificationsSection } from '../components/staff/StaffCertificationsSection';
import { StaffTimeOffSection } from '../components/staff/StaffTimeOffSection';
import { StaffNotesSection } from '../components/staff/StaffNotesSection';

interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
}

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
        emergency_contact: EmergencyContact | null;
    } | null;
}

type TabType = 'profile' | 'schedule' | 'responsibilities' | 'tasks' | 'certifications' | 'timeoff' | 'notes';

export function StaffDetails() {
    const { hubId, staffUserId } = useParams<{ hubId: string; staffUserId: string }>();
    const navigate = useNavigate();
    const { hub, currentRole } = useHub();
    const { user } = useAuth();

    const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Profile form state
    const [title, setTitle] = useState('');
    const [bio, setBio] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [hireDate, setHireDate] = useState('');
    const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>({
        name: '',
        relationship: '',
        phone: '',
        email: '',
    });

    const isOwner = currentRole === 'owner';
    const isSelf = user?.id === staffUserId;
    const canEdit = isOwner || isSelf;

    const isStaff = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    useEffect(() => {
        if (hubId && staffUserId && hub) {
            fetchStaffMember();
        }
    }, [hubId, staffUserId, hub]);

    useEffect(() => {
        // Reset form when staff member changes
        if (staffMember) {
            setTitle(staffMember.staff_profile?.title || '');
            setBio(staffMember.staff_profile?.bio || '');
            setPhone(staffMember.staff_profile?.phone || '');
            setEmail(staffMember.staff_profile?.email || '');
            setHireDate(staffMember.staff_profile?.hire_date || '');
            setEmergencyContact({
                name: staffMember.staff_profile?.emergency_contact?.name || '',
                relationship: staffMember.staff_profile?.emergency_contact?.relationship || '',
                phone: staffMember.staff_profile?.emergency_contact?.phone || '',
                email: staffMember.staff_profile?.emergency_contact?.email || '',
            });
            setIsEditing(false);
        }
    }, [staffMember]);

    const fetchStaffMember = async () => {
        setLoading(true);
        try {
            // Fetch hub member with profile
            const { data: memberData, error: memberError } = await supabase
                .from('hub_members')
                .select(`
                    user_id,
                    role,
                    profile:profiles(id, full_name, email, avatar_url)
                `)
                .eq('hub_id', hubId)
                .eq('user_id', staffUserId)
                .in('role', ['owner', 'director', 'admin', 'coach'])
                .single();

            if (memberError) throw memberError;

            // Fetch staff profile (may not exist yet)
            const { data: staffProfile } = await supabase
                .from('staff_profiles')
                .select('id, title, bio, phone, email, hire_date, status, emergency_contact')
                .eq('hub_id', hubId)
                .eq('user_id', staffUserId)
                .maybeSingle();

            const profileData = Array.isArray(memberData.profile) ? memberData.profile[0] : memberData.profile;

            setStaffMember({
                user_id: memberData.user_id,
                role: memberData.role,
                profile: profileData as StaffMember['profile'],
                staff_profile: staffProfile || null,
            });
        } catch (error) {
            console.error('Error fetching staff member:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!hubId || !staffMember) return;
        setSaving(true);

        // Only save emergency contact if at least name and phone are provided
        const emergencyContactData = emergencyContact.name && emergencyContact.phone
            ? emergencyContact
            : null;

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
                        emergency_contact: emergencyContactData,
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
                        emergency_contact: emergencyContactData,
                    });

                if (error) throw error;
            }

            setIsEditing(false);
            fetchStaffMember();
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

    const enabledTabsList = hub?.settings?.enabledTabs;
    const visibleTabs = tabs.filter(tab => {
        if (tab.ownerOnly && !isOwner) return false;
        // Hide schedule tab when schedule feature is disabled
        if (tab.id === 'schedule' && !isTabEnabled('schedule', enabledTabsList)) return false;
        return true;
    });

    if (!isStaff) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">You don't have permission to view this page.</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="animate-fade-in p-8">
                <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Loading staff profile...
                </div>
            </div>
        );
    }

    if (!staffMember) {
        return (
            <div className="animate-fade-in p-8">
                <button
                    onClick={() => navigate(`/hub/${hubId}/staff`)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Staff
                </button>
                <div className="text-slate-500">Staff member not found.</div>
            </div>
        );
    }

    const initials = staffMember.profile?.full_name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '??';

    return (
        <div className="animate-fade-in">
            {/* Back Button */}
            <button
                onClick={() => navigate(`/hub/${hubId}/staff`)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Staff
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 rounded-xl p-6 text-white mb-6">
                <div className="flex items-center gap-4">
                    {staffMember.profile?.avatar_url ? (
                        <img
                            src={staffMember.profile.avatar_url}
                            alt={staffMember.profile.full_name}
                            className="h-16 w-16 rounded-full object-cover ring-4 ring-white/30"
                        />
                    ) : (
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                            <span className="text-2xl font-bold text-white">{initials}</span>
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {staffMember.profile?.full_name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            {staffMember.staff_profile?.title && (
                                <span className="text-teal-200 text-sm">
                                    {staffMember.staff_profile.title}
                                </span>
                            )}
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                                staffMember.role === 'owner' ? 'bg-amber-500/20 text-amber-100' :
                                staffMember.role === 'director' ? 'bg-purple-500/20 text-purple-100' :
                                staffMember.role === 'admin' ? 'bg-blue-500/20 text-blue-100' :
                                'bg-green-500/20 text-green-100'
                            }`}>
                                {staffMember.role.charAt(0).toUpperCase() + staffMember.role.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
                {visibleTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                            activeTab === tab.id
                                ? 'border-teal-500 text-teal-600'
                                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
                        }`}
                    >
                        {tab.icon}
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="space-y-4">
                {activeTab === 'profile' && (
                    <div className="card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <User className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-900">Profile Information</h3>
                            {canEdit && !isEditing && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                    title="Edit profile"
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                </button>
                            )}
                            {isEditing && (
                                <div className="flex items-center gap-1 ml-auto">
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setTitle(staffMember.staff_profile?.title || '');
                                            setBio(staffMember.staff_profile?.bio || '');
                                            setPhone(staffMember.staff_profile?.phone || '');
                                            setEmail(staffMember.staff_profile?.email || '');
                                            setHireDate(staffMember.staff_profile?.hire_date || '');
                                            setEmergencyContact({
                                                name: staffMember.staff_profile?.emergency_contact?.name || '',
                                                relationship: staffMember.staff_profile?.emergency_contact?.relationship || '',
                                                phone: staffMember.staff_profile?.emergency_contact?.phone || '',
                                                email: staffMember.staff_profile?.emergency_contact?.email || '',
                                            });
                                        }}
                                        disabled={saving}
                                        className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Cancel"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={saving}
                                        className="p-1.5 rounded-md text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                                        title="Save"
                                    >
                                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g., Head Coach, Program Director"
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Bio</label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={3}
                                            placeholder="A brief description..."
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Work Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="work@example.com"
                                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                                        <input
                                            type="date"
                                            value={hireDate}
                                            onChange={(e) => setHireDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                        />
                                    </div>

                                    {/* Emergency Contact */}
                                    <div className="pt-4 border-t border-slate-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            <label className="text-sm font-medium text-slate-700">Emergency Contact</label>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Name</label>
                                                <input
                                                    type="text"
                                                    value={emergencyContact.name}
                                                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, name: e.target.value }))}
                                                    placeholder="Contact name"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Relationship</label>
                                                <input
                                                    type="text"
                                                    value={emergencyContact.relationship}
                                                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, relationship: e.target.value }))}
                                                    placeholder="e.g., Spouse, Parent"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Phone</label>
                                                <input
                                                    type="tel"
                                                    value={emergencyContact.phone}
                                                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, phone: e.target.value }))}
                                                    placeholder="(555) 123-4567"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-slate-500 mb-1">Email (optional)</label>
                                                <input
                                                    type="email"
                                                    value={emergencyContact.email || ''}
                                                    onChange={(e) => setEmergencyContact(prev => ({ ...prev, email: e.target.value }))}
                                                    placeholder="contact@example.com"
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                                />
                                            </div>
                                        </div>
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

                                    {/* Emergency Contact */}
                                    <div className="pt-4 border-t border-slate-200">
                                        <div className="flex items-center gap-2 mb-3">
                                            <AlertCircle className="w-4 h-4 text-red-500" />
                                            <h3 className="text-sm font-medium text-slate-700">Emergency Contact</h3>
                                        </div>
                                        {staffMember.staff_profile?.emergency_contact ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="p-3 bg-red-50 rounded-lg">
                                                    <p className="text-xs text-red-600 font-medium">Name</p>
                                                    <p className="text-sm text-slate-700">{staffMember.staff_profile.emergency_contact.name}</p>
                                                </div>
                                                <div className="p-3 bg-red-50 rounded-lg">
                                                    <p className="text-xs text-red-600 font-medium">Relationship</p>
                                                    <p className="text-sm text-slate-700">{staffMember.staff_profile.emergency_contact.relationship || 'Not specified'}</p>
                                                </div>
                                                <div className="p-3 bg-red-50 rounded-lg">
                                                    <p className="text-xs text-red-600 font-medium">Phone</p>
                                                    <p className="text-sm text-slate-700">{staffMember.staff_profile.emergency_contact.phone}</p>
                                                </div>
                                                {staffMember.staff_profile.emergency_contact.email && (
                                                    <div className="p-3 bg-red-50 rounded-lg">
                                                        <p className="text-xs text-red-600 font-medium">Email</p>
                                                        <p className="text-sm text-slate-700">{staffMember.staff_profile.emergency_contact.email}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-500 italic">No emergency contact added yet.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
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
    );
}
