import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Mail, Phone, User, AlertCircle, Shirt, Award, CreditCard, Heart, Lock, AlertTriangle, ChevronDown, ChevronRight, Target, ClipboardList, Pencil, X, Check, Loader2, ListChecks } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { ReportInjuryModal } from '../components/gymnast/ReportInjuryModal';
import { GoalsSection } from '../components/gymnast/GoalsSection';
import { AssessmentSection } from '../components/gymnast/AssessmentSection';
import { GymnastAssignmentStats } from '../components/gymnast/GymnastAssignmentStats';
import type { GymnastProfile } from '../types';

type PageTab = 'profile' | 'goals' | 'assessment' | 'assignments';
type EditSection = 'basic' | 'membership' | 'apparel' | 'guardians' | 'emergency' | 'medical' | null;

export function GymnastDetails() {
    const { gymnastId } = useParams<{ gymnastId: string }>();
    const navigate = useNavigate();
    const { hub, linkedGymnasts, currentRole, levels } = useHub();

    const [gymnast, setGymnast] = useState<GymnastProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReportInjuryOpen, setIsReportInjuryOpen] = useState(false);
    const [showInjuryHistory, setShowInjuryHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<PageTab>('profile');

    // Inline edit state
    const [editSection, setEditSection] = useState<EditSection>(null);
    const [saving, setSaving] = useState(false);

    // Edit form state - Basic Info
    const [editFirstName, setEditFirstName] = useState('');
    const [editLastName, setEditLastName] = useState('');
    const [editDob, setEditDob] = useState('');
    const [editGender, setEditGender] = useState<'Male' | 'Female' | ''>('');
    const [editLevel, setEditLevel] = useState('');

    // Edit form state - Membership
    const [editMemberId, setEditMemberId] = useState('');
    const [editMemberIdType, setEditMemberIdType] = useState<'USAG' | 'AAU' | 'Other' | ''>('');

    // Edit form state - Apparel
    const [editTshirtSize, setEditTshirtSize] = useState('');
    const [editLeoSize, setEditLeoSize] = useState('');

    // Edit form state - Guardians
    const [editG1FirstName, setEditG1FirstName] = useState('');
    const [editG1LastName, setEditG1LastName] = useState('');
    const [editG1Email, setEditG1Email] = useState('');
    const [editG1Phone, setEditG1Phone] = useState('');
    const [editG2FirstName, setEditG2FirstName] = useState('');
    const [editG2LastName, setEditG2LastName] = useState('');
    const [editG2Email, setEditG2Email] = useState('');
    const [editG2Phone, setEditG2Phone] = useState('');

    // Edit form state - Emergency Contacts
    const [editEC1Name, setEditEC1Name] = useState('');
    const [editEC1Phone, setEditEC1Phone] = useState('');
    const [editEC1Relationship, setEditEC1Relationship] = useState('');
    const [editEC2Name, setEditEC2Name] = useState('');
    const [editEC2Phone, setEditEC2Phone] = useState('');
    const [editEC2Relationship, setEditEC2Relationship] = useState('');

    // Edit form state - Medical
    const [editAllergies, setEditAllergies] = useState('');
    const [editMedications, setEditMedications] = useState('');
    const [editConditions, setEditConditions] = useState('');
    const [editMedicalNotes, setEditMedicalNotes] = useState('');

    // Fetch gymnast data
    useEffect(() => {
        if (gymnastId && hub) {
            fetchGymnast();
        }
    }, [gymnastId, hub]);

    const fetchGymnast = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('id', gymnastId)
                .eq('hub_id', hub?.id)
                .single();

            if (error) throw error;
            setGymnast(data);
        } catch (error) {
            console.error('Error fetching gymnast:', error);
        } finally {
            setLoading(false);
        }
    };

    // Permission checks
    const isStaff = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const isOwnGymnast = useMemo(() => {
        return linkedGymnasts.some(g => g.id === gymnastId);
    }, [linkedGymnasts, gymnastId]);

    // Check if user can access this gymnast profile at all
    // Staff can view all, parents can only view their linked gymnasts
    const canAccessProfile = useMemo(() => {
        return isStaff || isOwnGymnast;
    }, [isStaff, isOwnGymnast]);

    // Redirect if user doesn't have access
    useEffect(() => {
        if (!loading && !canAccessProfile && hub) {
            navigate(`/hub/${hub.id}/roster`, { replace: true });
        }
    }, [loading, canAccessProfile, hub, navigate]);

    const canViewMedical = useMemo(() => {
        if (!gymnast) return false;
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        if (currentRole && staffRoles.includes(currentRole)) return true;
        if (currentRole === 'parent') {
            return linkedGymnasts.some(g => g.id === gymnast.id);
        }
        return false;
    }, [gymnast, currentRole, linkedGymnasts]);

    const canReportInjury = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const canEditAssessment = canReportInjury;

    const canEditProfile = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const injuryReports = gymnast?.medical_info?.injury_reports || [];

    const calculateAge = (dob: string) => {
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const hasGuardian1 = gymnast?.guardian_1 && (gymnast.guardian_1.first_name || gymnast.guardian_1.last_name || gymnast.guardian_1.email || gymnast.guardian_1.phone);
    const hasGuardian2 = gymnast?.guardian_2 && (gymnast.guardian_2.first_name || gymnast.guardian_2.last_name || gymnast.guardian_2.email || gymnast.guardian_2.phone);
    const hasEmergencyContact1 = gymnast?.emergency_contact_1 && gymnast.emergency_contact_1.name;
    const hasEmergencyContact2 = gymnast?.emergency_contact_2 && gymnast.emergency_contact_2.name;
    const hasMedicalInfo = gymnast?.medical_info && (gymnast.medical_info.allergies || gymnast.medical_info.medications || gymnast.medical_info.conditions || gymnast.medical_info.notes);

    // Start editing a section
    const startEdit = (section: EditSection) => {
        if (!gymnast) return;

        switch (section) {
            case 'basic':
                setEditFirstName(gymnast.first_name || '');
                setEditLastName(gymnast.last_name || '');
                setEditDob(gymnast.date_of_birth || '');
                setEditGender(gymnast.gender as 'Male' | 'Female' | '' || '');
                setEditLevel(gymnast.level || '');
                break;
            case 'membership':
                setEditMemberId(gymnast.member_id || '');
                setEditMemberIdType(gymnast.member_id_type as 'USAG' | 'AAU' | 'Other' | '' || '');
                break;
            case 'apparel':
                setEditTshirtSize(gymnast.tshirt_size || '');
                setEditLeoSize(gymnast.leo_size || '');
                break;
            case 'guardians':
                setEditG1FirstName(gymnast.guardian_1?.first_name || '');
                setEditG1LastName(gymnast.guardian_1?.last_name || '');
                setEditG1Email(gymnast.guardian_1?.email || '');
                setEditG1Phone(gymnast.guardian_1?.phone || '');
                setEditG2FirstName(gymnast.guardian_2?.first_name || '');
                setEditG2LastName(gymnast.guardian_2?.last_name || '');
                setEditG2Email(gymnast.guardian_2?.email || '');
                setEditG2Phone(gymnast.guardian_2?.phone || '');
                break;
            case 'emergency':
                setEditEC1Name(gymnast.emergency_contact_1?.name || '');
                setEditEC1Phone(gymnast.emergency_contact_1?.phone || '');
                setEditEC1Relationship(gymnast.emergency_contact_1?.relationship || '');
                setEditEC2Name(gymnast.emergency_contact_2?.name || '');
                setEditEC2Phone(gymnast.emergency_contact_2?.phone || '');
                setEditEC2Relationship(gymnast.emergency_contact_2?.relationship || '');
                break;
            case 'medical':
                setEditAllergies(gymnast.medical_info?.allergies || '');
                setEditMedications(gymnast.medical_info?.medications || '');
                setEditConditions(gymnast.medical_info?.conditions || '');
                setEditMedicalNotes(gymnast.medical_info?.notes || '');
                break;
        }
        setEditSection(section);
    };

    const cancelEdit = () => {
        setEditSection(null);
    };

    const saveSection = async () => {
        if (!gymnast) return;
        setSaving(true);

        try {
            let updateData: Record<string, unknown> = {};

            switch (editSection) {
                case 'basic':
                    updateData = {
                        first_name: editFirstName,
                        last_name: editLastName,
                        date_of_birth: editDob,
                        gender: editGender || null,
                        level: editLevel || null,
                    };
                    break;
                case 'membership':
                    updateData = {
                        member_id: editMemberId || null,
                        member_id_type: editMemberIdType || null,
                    };
                    break;
                case 'apparel':
                    updateData = {
                        tshirt_size: editTshirtSize || null,
                        leo_size: editLeoSize || null,
                    };
                    break;
                case 'guardians':
                    updateData = {
                        guardian_1: {
                            first_name: editG1FirstName || null,
                            last_name: editG1LastName || null,
                            email: editG1Email || null,
                            phone: editG1Phone || null,
                        },
                        guardian_2: {
                            first_name: editG2FirstName || null,
                            last_name: editG2LastName || null,
                            email: editG2Email || null,
                            phone: editG2Phone || null,
                        },
                    };
                    break;
                case 'emergency':
                    updateData = {
                        emergency_contact_1: editEC1Name ? {
                            name: editEC1Name,
                            phone: editEC1Phone || null,
                            relationship: editEC1Relationship || null,
                        } : null,
                        emergency_contact_2: editEC2Name ? {
                            name: editEC2Name,
                            phone: editEC2Phone || null,
                            relationship: editEC2Relationship || null,
                        } : null,
                    };
                    break;
                case 'medical':
                    updateData = {
                        medical_info: {
                            ...gymnast.medical_info,
                            allergies: editAllergies || null,
                            medications: editMedications || null,
                            conditions: editConditions || null,
                            notes: editMedicalNotes || null,
                        },
                    };
                    break;
            }

            const { error } = await supabase
                .from('gymnast_profiles')
                .update(updateData)
                .eq('id', gymnast.id);

            if (error) throw error;

            await fetchGymnast();
            setEditSection(null);
        } catch (error) {
            console.error('Error saving section:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="animate-fade-in p-8">
                <div className="text-slate-400">Loading gymnast profile...</div>
            </div>
        );
    }

    // If user doesn't have access, show access denied (they will be redirected)
    if (!canAccessProfile) {
        return (
            <div className="animate-fade-in p-8">
                <div className="text-slate-500">You don't have permission to view this profile.</div>
            </div>
        );
    }

    if (!gymnast) {
        return (
            <div className="animate-fade-in p-8">
                <button
                    onClick={() => navigate(`/hub/${hub?.id}/roster`)}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Roster
                </button>
                <div className="text-slate-500">Gymnast not found.</div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Back Button */}
            <button
                onClick={() => navigate(`/hub/${hub?.id}/roster`)}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Roster
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-xl p-6 text-white mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                        <span className="text-2xl font-bold text-white">
                            {gymnast.first_name[0]}{gymnast.last_name[0]}
                        </span>
                    </div>
                    <div>
                        <p className="text-brand-200 text-sm font-medium">ID: {gymnast.gymnast_id}</p>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {gymnast.first_name} {gymnast.last_name}
                        </h1>
                        <div className="flex items-center gap-2 mt-1.5">
                            {gymnast.level && (
                                <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-sm font-medium">
                                    <Award className="h-3.5 w-3.5 mr-1.5" />
                                    {gymnast.level}
                                </span>
                            )}
                            {gymnast.gender && (
                                <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium">
                                    {gymnast.gender}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 mb-6">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'profile'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <User className="h-4 w-4" />
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'goals'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Target className="h-4 w-4" />
                    Goals
                </button>
                <button
                    onClick={() => setActiveTab('assessment')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'assessment'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <ClipboardList className="h-4 w-4" />
                    Assessment
                </button>
                <button
                    onClick={() => setActiveTab('assignments')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'assignments'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <ListChecks className="h-4 w-4" />
                    Assignments
                </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
                {/* Goals Tab */}
                {activeTab === 'goals' && (
                    <GoalsSection
                        gymnastProfileId={gymnast.id}
                        readOnly={!canEditAssessment}
                    />
                )}

                {/* Assessment Tab */}
                {activeTab === 'assessment' && (
                    <AssessmentSection
                        gymnastProfileId={gymnast.id}
                        readOnly={!canEditAssessment}
                    />
                )}

                {/* Assignments Tab */}
                {activeTab === 'assignments' && (
                    <GymnastAssignmentStats gymnastProfileId={gymnast.id} />
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <>
                        {/* Basic Information Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <User className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
                                {canEditProfile && editSection !== 'basic' && (
                                    <button
                                        onClick={() => startEdit('basic')}
                                        className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Edit basic information"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {editSection === 'basic' && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={saveSection}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                            title="Save"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {editSection === 'basic' ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">First Name</label>
                                                <input
                                                    type="text"
                                                    value={editFirstName}
                                                    onChange={(e) => setEditFirstName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={editLastName}
                                                    onChange={(e) => setEditLastName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    value={editDob}
                                                    onChange={(e) => setEditDob(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                                                <select
                                                    value={editGender}
                                                    onChange={(e) => setEditGender(e.target.value as 'Male' | 'Female' | '')}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                >
                                                    <option value="">Select...</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Level</label>
                                                <select
                                                    value={editLevel}
                                                    onChange={(e) => setEditLevel(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                >
                                                    <option value="">Select...</option>
                                                    {levels.map((lvl) => (
                                                        <option key={lvl} value={lvl}>{lvl}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</p>
                                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{gymnast.first_name} {gymnast.last_name}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                                                    <Award className="h-4 w-4 text-brand-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Level</p>
                                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{gymnast.level || 'Not assigned'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="h-4 w-4 text-purple-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date of Birth</p>
                                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(gymnast.date_of_birth)}</p>
                                                    <p className="text-xs text-slate-500">{calculateAge(gymnast.date_of_birth)} years old</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                                                    <User className="h-4 w-4 text-pink-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</p>
                                                    <p className="text-sm font-semibold text-slate-900 mt-0.5">{gymnast.gender || 'Not specified'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Membership Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <CreditCard className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">Membership</h3>
                                {canEditProfile && editSection !== 'membership' && (
                                    <button
                                        onClick={() => startEdit('membership')}
                                        className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Edit membership"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {editSection === 'membership' && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={saveSection}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                            title="Save"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {editSection === 'membership' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">ID Type</label>
                                            <select
                                                value={editMemberIdType}
                                                onChange={(e) => setEditMemberIdType(e.target.value as 'USAG' | 'AAU' | 'Other' | '')}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            >
                                                <option value="">Select...</option>
                                                <option value="USAG">USAG</option>
                                                <option value="AAU">AAU</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Member ID</label>
                                            <input
                                                type="text"
                                                value={editMemberId}
                                                onChange={(e) => setEditMemberId(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm font-mono focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                placeholder="Enter member ID"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <CreditCard className="h-4 w-4 text-emerald-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                {gymnast.member_id_type || 'Member ID'}
                                            </p>
                                            <p className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                                                {gymnast.member_id || 'Not assigned'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Apparel Sizes Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <Shirt className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">Apparel Sizes</h3>
                                {canEditProfile && editSection !== 'apparel' && (
                                    <button
                                        onClick={() => startEdit('apparel')}
                                        className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Edit apparel sizes"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {editSection === 'apparel' && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={saveSection}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                            title="Save"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {editSection === 'apparel' ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">T-Shirt Size</label>
                                            <select
                                                value={editTshirtSize}
                                                onChange={(e) => setEditTshirtSize(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            >
                                                <option value="">Select...</option>
                                                <optgroup label="Youth Sizes">
                                                    <option value="YXS">YXS (Youth XS)</option>
                                                    <option value="YS">YS (Youth S)</option>
                                                    <option value="YM">YM (Youth M)</option>
                                                    <option value="YL">YL (Youth L)</option>
                                                    <option value="YXL">YXL (Youth XL)</option>
                                                </optgroup>
                                                <optgroup label="Adult Sizes">
                                                    <option value="AXS">AXS (Adult XS)</option>
                                                    <option value="AS">AS (Adult S)</option>
                                                    <option value="AM">AM (Adult M)</option>
                                                    <option value="AL">AL (Adult L)</option>
                                                    <option value="AXL">AXL (Adult XL)</option>
                                                    <option value="AXXL">AXXL (Adult XXL)</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Leotard Size</label>
                                            <select
                                                value={editLeoSize}
                                                onChange={(e) => setEditLeoSize(e.target.value)}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                            >
                                                <option value="">Select...</option>
                                                <optgroup label="Child Sizes">
                                                    <option value="CXXS">CXXS</option>
                                                    <option value="CXS">CXS</option>
                                                    <option value="CS">CS</option>
                                                    <option value="CM">CM</option>
                                                    <option value="CL">CL</option>
                                                    <option value="CXL">CXL</option>
                                                </optgroup>
                                                <optgroup label="Adult Sizes">
                                                    <option value="AXS">AXS</option>
                                                    <option value="AS">AS</option>
                                                    <option value="AM">AM</option>
                                                    <option value="AL">AL</option>
                                                    <option value="AXL">AXL</option>
                                                    <option value="AXXL">AXXL</option>
                                                    <option value="A3XL">A3XL</option>
                                                    <option value="A4XL">A4XL</option>
                                                </optgroup>
                                            </select>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <Shirt className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">T-Shirt</p>
                                                {gymnast.tshirt_size ? (
                                                    <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-sm font-semibold">
                                                        {gymnast.tshirt_size}
                                                    </span>
                                                ) : (
                                                    <p className="text-sm text-slate-500 mt-0.5">Not set</p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-pink-50 flex items-center justify-center flex-shrink-0">
                                                <Shirt className="h-4 w-4 text-pink-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Leotard</p>
                                                {gymnast.leo_size ? (
                                                    <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-md bg-pink-100 text-pink-700 text-sm font-semibold">
                                                        {gymnast.leo_size}
                                                    </span>
                                                ) : (
                                                    <p className="text-sm text-slate-500 mt-0.5">Not set</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guardians Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <User className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">Parents / Guardians</h3>
                                {canEditProfile && editSection !== 'guardians' && (
                                    <button
                                        onClick={() => startEdit('guardians')}
                                        className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Edit parents / guardians"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {editSection === 'guardians' && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={saveSection}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                            title="Save"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {editSection === 'guardians' ? (
                                    <div className="space-y-6">
                                        {/* Primary Guardian Edit */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-100 text-brand-700 text-xs font-semibold">
                                                    Primary
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={editG1FirstName}
                                                        onChange={(e) => setEditG1FirstName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={editG1LastName}
                                                        onChange={(e) => setEditG1LastName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={editG1Email}
                                                        onChange={(e) => setEditG1Email(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={editG1Phone}
                                                        onChange={(e) => setEditG1Phone(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Secondary Guardian Edit */}
                                        <div className="pt-4 border-t border-slate-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                    Secondary
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={editG2FirstName}
                                                        onChange={(e) => setEditG2FirstName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={editG2LastName}
                                                        onChange={(e) => setEditG2LastName(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Email</label>
                                                    <input
                                                        type="email"
                                                        value={editG2Email}
                                                        onChange={(e) => setEditG2Email(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={editG2Phone}
                                                        onChange={(e) => setEditG2Phone(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (hasGuardian1 || hasGuardian2) ? (
                                    <div className="divide-y divide-slate-100 -mx-4 -mb-4">
                                        {/* Primary Guardian */}
                                        {hasGuardian1 && (
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-brand-100 text-brand-700 text-xs font-semibold">
                                                        Primary
                                                    </span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-4 w-4 text-slate-500" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {gymnast.guardian_1?.first_name} {gymnast.guardian_1?.last_name}
                                                        </p>
                                                    </div>
                                                    {gymnast.guardian_1?.email && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`mailto:${gymnast.guardian_1.email}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.guardian_1.email}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {gymnast.guardian_1?.phone && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`tel:${gymnast.guardian_1.phone}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.guardian_1.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Secondary Guardian */}
                                        {hasGuardian2 && (
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                        Secondary
                                                    </span>
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-4 w-4 text-slate-500" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {gymnast.guardian_2?.first_name} {gymnast.guardian_2?.last_name}
                                                        </p>
                                                    </div>
                                                    {gymnast.guardian_2?.email && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Mail className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`mailto:${gymnast.guardian_2.email}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.guardian_2.email}
                                                            </a>
                                                        </div>
                                                    )}
                                                    {gymnast.guardian_2?.phone && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`tel:${gymnast.guardian_2.phone}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.guardian_2.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-slate-500">No parents / guardians added</p>
                                        {canEditProfile && (
                                            <button
                                                onClick={() => startEdit('guardians')}
                                                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                Add parent / guardian
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Emergency Contacts Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <Phone className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-900">Emergency Contacts</h3>
                                {canEditProfile && editSection !== 'emergency' && (
                                    <button
                                        onClick={() => startEdit('emergency')}
                                        className="ml-auto p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                        title="Edit emergency contacts"
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                )}
                                {editSection === 'emergency' && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <button
                                            onClick={cancelEdit}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            onClick={saveSection}
                                            disabled={saving}
                                            className="p-1.5 rounded-md text-brand-600 hover:text-brand-700 hover:bg-brand-50 transition-colors"
                                            title="Save"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {editSection === 'emergency' ? (
                                    <div className="space-y-6">
                                        {/* Emergency Contact 1 Edit */}
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
                                                    Contact 1
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={editEC1Name}
                                                        onChange={(e) => setEditEC1Name(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="Full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={editEC1Phone}
                                                        onChange={(e) => setEditEC1Phone(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="Phone number"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Relationship</label>
                                                    <input
                                                        type="text"
                                                        value={editEC1Relationship}
                                                        onChange={(e) => setEditEC1Relationship(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="e.g., Grandmother"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Emergency Contact 2 Edit */}
                                        <div className="pt-4 border-t border-slate-200">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                    Contact 2
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Name</label>
                                                    <input
                                                        type="text"
                                                        value={editEC2Name}
                                                        onChange={(e) => setEditEC2Name(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="Full name"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={editEC2Phone}
                                                        onChange={(e) => setEditEC2Phone(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="Phone number"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Relationship</label>
                                                    <input
                                                        type="text"
                                                        value={editEC2Relationship}
                                                        onChange={(e) => setEditEC2Relationship(e.target.value)}
                                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                        placeholder="e.g., Neighbor"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (hasEmergencyContact1 || hasEmergencyContact2) ? (
                                    <div className="divide-y divide-slate-100 -mx-4 -mb-4">
                                        {/* Emergency Contact 1 */}
                                        {hasEmergencyContact1 && (
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-semibold">
                                                        Contact 1
                                                    </span>
                                                    {gymnast.emergency_contact_1?.relationship && (
                                                        <span className="text-xs text-slate-500">
                                                            ({gymnast.emergency_contact_1.relationship})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-4 w-4 text-amber-600" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {gymnast.emergency_contact_1?.name}
                                                        </p>
                                                    </div>
                                                    {gymnast.emergency_contact_1?.phone && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`tel:${gymnast.emergency_contact_1.phone}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.emergency_contact_1.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Emergency Contact 2 */}
                                        {hasEmergencyContact2 && (
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
                                                        Contact 2
                                                    </span>
                                                    {gymnast.emergency_contact_2?.relationship && (
                                                        <span className="text-xs text-slate-500">
                                                            ({gymnast.emergency_contact_2.relationship})
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                            <User className="h-4 w-4 text-slate-500" />
                                                        </div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {gymnast.emergency_contact_2?.name}
                                                        </p>
                                                    </div>
                                                    {gymnast.emergency_contact_2?.phone && (
                                                        <div className="flex items-center gap-3 pl-11">
                                                            <Phone className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                                            <a
                                                                href={`tel:${gymnast.emergency_contact_2.phone}`}
                                                                className="text-sm text-brand-600 hover:text-brand-700 hover:underline"
                                                            >
                                                                {gymnast.emergency_contact_2.phone}
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-sm text-slate-500">No emergency contacts added</p>
                                        {canEditProfile && (
                                            <button
                                                onClick={() => startEdit('emergency')}
                                                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                Add emergency contact
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Medical Information Card */}
                        <div className="card overflow-hidden border-error-200">
                            <div className="flex items-center gap-2 px-4 py-3 bg-error-50 border-b border-error-200">
                                <Heart className="h-4 w-4 text-error-600" />
                                <h3 className="text-sm font-semibold text-error-700">Medical Information</h3>
                                <div className="flex items-center gap-2 ml-auto">
                                    {canReportInjury && (
                                        <button
                                            onClick={() => setIsReportInjuryOpen(true)}
                                            className="inline-flex items-center gap-1 rounded-md bg-error-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-error-600 transition-colors"
                                        >
                                            <AlertTriangle className="h-3 w-3" />
                                            Report Injury
                                        </button>
                                    )}
                                    {canEditProfile && canViewMedical && editSection !== 'medical' && (
                                        <button
                                            onClick={() => startEdit('medical')}
                                            className="p-1.5 rounded-md text-error-400 hover:text-error-600 hover:bg-error-100 transition-colors"
                                            title="Edit medical information"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    {editSection === 'medical' && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={cancelEdit}
                                                disabled={saving}
                                                className="p-1.5 rounded-md text-error-400 hover:text-error-600 hover:bg-error-100 transition-colors"
                                                title="Cancel"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                onClick={saveSection}
                                                disabled={saving}
                                                className="p-1.5 rounded-md text-error-600 hover:text-error-700 hover:bg-error-100 transition-colors"
                                                title="Save"
                                            >
                                                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="p-4">
                                {!canViewMedical ? (
                                    <div className="text-center py-6">
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                                            <Lock className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-900 mt-3">Access Restricted</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Medical information is only visible to coaches and the gymnast's guardians.
                                        </p>
                                    </div>
                                ) : editSection === 'medical' ? (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-error-600 uppercase tracking-wide mb-1">Allergies</label>
                                            <textarea
                                                value={editAllergies}
                                                onChange={(e) => setEditAllergies(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                placeholder="List any allergies..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Medications</label>
                                            <textarea
                                                value={editMedications}
                                                onChange={(e) => setEditMedications(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                placeholder="List current medications..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">Conditions</label>
                                            <textarea
                                                value={editConditions}
                                                onChange={(e) => setEditConditions(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                placeholder="List any medical conditions..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Additional Notes</label>
                                            <textarea
                                                value={editMedicalNotes}
                                                onChange={(e) => setEditMedicalNotes(e.target.value)}
                                                rows={2}
                                                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                                                placeholder="Any additional medical notes..."
                                            />
                                        </div>
                                    </div>
                                ) : hasMedicalInfo ? (
                                    <div className="space-y-4">
                                        {gymnast.medical_info?.allergies && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-error-100 flex items-center justify-center flex-shrink-0">
                                                    <AlertCircle className="h-4 w-4 text-error-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-error-600 uppercase tracking-wide">Allergies</p>
                                                    <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.allergies}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.medications && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Medications</p>
                                                    <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.medications}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.conditions && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Conditions</p>
                                                    <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.conditions}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.notes && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Additional Notes</p>
                                                    <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center mx-auto">
                                            <svg className="h-5 w-5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-slate-500 mt-2">No medical concerns reported</p>
                                        {canEditProfile && (
                                            <button
                                                onClick={() => startEdit('medical')}
                                                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                            >
                                                Add medical info
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Injury History Section */}
                                {canViewMedical && injuryReports.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-error-100">
                                        <button
                                            onClick={() => setShowInjuryHistory(!showInjuryHistory)}
                                            className="flex items-center gap-2 text-sm font-semibold text-error-600 hover:text-error-700 transition-colors w-full"
                                        >
                                            {showInjuryHistory ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                            <AlertTriangle className="h-4 w-4" />
                                            Injury History ({injuryReports.length})
                                        </button>

                                        {showInjuryHistory && (
                                            <div className="mt-3 space-y-3">
                                                {injuryReports.map((injury) => (
                                                    <div
                                                        key={injury.id}
                                                        className={`rounded-lg border p-3 ${
                                                            injury.status === 'active'
                                                                ? 'border-error-200 bg-error-50'
                                                                : injury.status === 'recovering'
                                                                ? 'border-amber-200 bg-amber-50'
                                                                : 'border-success-200 bg-success-50'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                        injury.status === 'active'
                                                                            ? 'bg-error-100 text-error-700'
                                                                            : injury.status === 'recovering'
                                                                            ? 'bg-amber-100 text-amber-700'
                                                                            : 'bg-success-100 text-success-700'
                                                                    }`}>
                                                                        {injury.status.charAt(0).toUpperCase() + injury.status.slice(1)}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {format(parseISO(injury.date), 'MMM d, yyyy')} at {injury.time}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-500">
                                                                    <span className="capitalize">{injury.location}</span>
                                                                    {injury.body_part && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span>{injury.body_part}</span>
                                                                        </>
                                                                    )}
                                                                    {injury.severity && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className={`capitalize ${
                                                                                injury.severity === 'severe'
                                                                                    ? 'text-error-600 font-medium'
                                                                                    : injury.severity === 'moderate'
                                                                                    ? 'text-amber-600'
                                                                                    : 'text-slate-500'
                                                                            }`}>
                                                                                {injury.severity}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <p className="mt-2 text-sm text-slate-700">{injury.description}</p>
                                                                <div className="mt-2 text-xs text-slate-500">
                                                                    <span className="font-medium">Response:</span> {injury.response}
                                                                </div>
                                                                {injury.follow_up && (
                                                                    <div className="mt-1 text-xs text-slate-500">
                                                                        <span className="font-medium">Follow-up:</span> {injury.follow_up}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Report Injury Modal */}
            <ReportInjuryModal
                isOpen={isReportInjuryOpen}
                onClose={() => setIsReportInjuryOpen(false)}
                gymnastProfileId={gymnast.id}
                gymnastName={`${gymnast.first_name} ${gymnast.last_name}`}
                currentMedicalInfo={gymnast.medical_info}
                onReportSaved={() => {
                    setIsReportInjuryOpen(false);
                    fetchGymnast();
                }}
            />
        </div>
    );
}
