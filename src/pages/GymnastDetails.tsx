import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Mail, Phone, User, AlertCircle, Shield, Shirt, Award, CreditCard, Heart, Lock, AlertTriangle, ChevronDown, ChevronRight, Target, ClipboardList, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { ReportInjuryModal } from '../components/gymnast/ReportInjuryModal';
import { GoalsSection } from '../components/gymnast/GoalsSection';
import { AssessmentSection } from '../components/gymnast/AssessmentSection';
import { AddMemberModal } from '../components/hubs/AddMemberModal';
import type { GymnastProfile } from '../types';

type PageTab = 'profile' | 'goals' | 'assessment';

export function GymnastDetails() {
    const { gymnastId } = useParams<{ gymnastId: string }>();
    const navigate = useNavigate();
    const { hub, linkedGymnasts, currentRole } = useHub();

    const [gymnast, setGymnast] = useState<GymnastProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isReportInjuryOpen, setIsReportInjuryOpen] = useState(false);
    const [showInjuryHistory, setShowInjuryHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<PageTab>('profile');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
    const hasMedicalInfo = gymnast?.medical_info && (gymnast.medical_info.allergies || gymnast.medical_info.medications || gymnast.medical_info.conditions || gymnast.medical_info.notes);

    if (loading) {
        return (
            <div className="animate-fade-in p-8">
                <div className="text-slate-400">Loading gymnast profile...</div>
            </div>
        );
    }

    if (!gymnast) {
        return (
            <div className="animate-fade-in p-8">
                <button
                    onClick={() => navigate(`/hub/${hub?.id}/roster`)}
                    className="flex items-center gap-2 text-slate-400 hover:text-chalk-50 transition-colors mb-4"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Roster
                </button>
                <div className="text-slate-400">Gymnast not found.</div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Back Button */}
            <button
                onClick={() => navigate(`/hub/${hub?.id}/roster`)}
                className="flex items-center gap-2 text-slate-400 hover:text-chalk-50 transition-colors mb-6"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Roster
            </button>

            {/* Header */}
            <div className="bg-gradient-to-br from-mint-500 via-mint-600 to-mint-700 rounded-xl p-6 text-white mb-6">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                            <span className="text-2xl font-bold text-white">
                                {gymnast.first_name[0]}{gymnast.last_name[0]}
                            </span>
                        </div>
                        <div>
                            <p className="text-mint-200 text-sm font-medium">ID: {gymnast.gymnast_id}</p>
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
                    {canEditProfile && (
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('profile')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'profile'
                            ? 'border-mint-500 text-mint-400'
                            : 'border-transparent text-slate-400 hover:text-chalk-50'
                    }`}
                >
                    <User className="h-4 w-4" />
                    Profile
                </button>
                <button
                    onClick={() => setActiveTab('goals')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'goals'
                            ? 'border-mint-500 text-mint-400'
                            : 'border-transparent text-slate-400 hover:text-chalk-50'
                    }`}
                >
                    <Target className="h-4 w-4" />
                    Goals
                </button>
                <button
                    onClick={() => setActiveTab('assessment')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'assessment'
                            ? 'border-mint-500 text-mint-400'
                            : 'border-transparent text-slate-400 hover:text-chalk-50'
                    }`}
                >
                    <ClipboardList className="h-4 w-4" />
                    Assessment
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

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <>
                        {/* Basic Information Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                                <User className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-chalk-50">Basic Information</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-mint-500/10 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="h-4 w-4 text-mint-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Date of Birth</p>
                                            <p className="text-sm font-semibold text-chalk-50 mt-0.5">{formatDate(gymnast.date_of_birth)}</p>
                                            <p className="text-xs text-slate-500">{calculateAge(gymnast.date_of_birth)} years old</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                                            <User className="h-4 w-4 text-purple-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gender</p>
                                            <p className="text-sm font-semibold text-chalk-50 mt-0.5">{gymnast.gender || 'Not specified'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Membership Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                                <CreditCard className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-chalk-50">Membership</h3>
                            </div>
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                        <CreditCard className="h-4 w-4 text-emerald-400" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                                            {gymnast.member_id_type || 'Member ID'}
                                        </p>
                                        <p className="text-sm font-mono font-semibold text-chalk-50 mt-0.5">
                                            {gymnast.member_id || 'Not assigned'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Apparel Sizes Card */}
                        <div className="card overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                                <Shirt className="h-4 w-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-chalk-50">Apparel Sizes</h3>
                            </div>
                            <div className="p-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                            <Shirt className="h-4 w-4 text-blue-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">T-Shirt</p>
                                            {gymnast.tshirt_size ? (
                                                <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-400 text-sm font-semibold">
                                                    {gymnast.tshirt_size}
                                                </span>
                                            ) : (
                                                <p className="text-sm text-slate-500 mt-0.5">Not set</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                                            <Shirt className="h-4 w-4 text-pink-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Leotard</p>
                                            {gymnast.leo_size ? (
                                                <span className="inline-flex mt-1 px-2.5 py-0.5 rounded-md bg-pink-500/20 text-pink-400 text-sm font-semibold">
                                                    {gymnast.leo_size}
                                                </span>
                                            ) : (
                                                <p className="text-sm text-slate-500 mt-0.5">Not set</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Guardians Card */}
                        {(hasGuardian1 || hasGuardian2) && (
                            <div className="card overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border-b border-slate-700">
                                    <Phone className="h-4 w-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-chalk-50">Emergency Contacts</h3>
                                </div>
                                <div className="divide-y divide-slate-700/50">
                                    {/* Primary Guardian */}
                                    {hasGuardian1 && (
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-mint-500/20 text-mint-400 text-xs font-semibold">
                                                    Primary
                                                </span>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-chalk-50">
                                                        {gymnast.guardian_1?.first_name} {gymnast.guardian_1?.last_name}
                                                    </p>
                                                </div>
                                                {gymnast.guardian_1?.email && (
                                                    <div className="flex items-center gap-3 pl-11">
                                                        <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                                        <a
                                                            href={`mailto:${gymnast.guardian_1.email}`}
                                                            className="text-sm text-mint-400 hover:text-mint-300 hover:underline"
                                                        >
                                                            {gymnast.guardian_1.email}
                                                        </a>
                                                    </div>
                                                )}
                                                {gymnast.guardian_1?.phone && (
                                                    <div className="flex items-center gap-3 pl-11">
                                                        <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                                        <a
                                                            href={`tel:${gymnast.guardian_1.phone}`}
                                                            className="text-sm text-mint-400 hover:text-mint-300 hover:underline"
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
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-700 text-slate-300 text-xs font-semibold">
                                                    Secondary
                                                </span>
                                            </div>
                                            <div className="space-y-2.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                        <User className="h-4 w-4 text-slate-400" />
                                                    </div>
                                                    <p className="text-sm font-semibold text-chalk-50">
                                                        {gymnast.guardian_2?.first_name} {gymnast.guardian_2?.last_name}
                                                    </p>
                                                </div>
                                                {gymnast.guardian_2?.email && (
                                                    <div className="flex items-center gap-3 pl-11">
                                                        <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                                        <a
                                                            href={`mailto:${gymnast.guardian_2.email}`}
                                                            className="text-sm text-mint-400 hover:text-mint-300 hover:underline"
                                                        >
                                                            {gymnast.guardian_2.email}
                                                        </a>
                                                    </div>
                                                )}
                                                {gymnast.guardian_2?.phone && (
                                                    <div className="flex items-center gap-3 pl-11">
                                                        <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                                        <a
                                                            href={`tel:${gymnast.guardian_2.phone}`}
                                                            className="text-sm text-mint-400 hover:text-mint-300 hover:underline"
                                                        >
                                                            {gymnast.guardian_2.phone}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Medical Information Card */}
                        <div className="card overflow-hidden border-error-500/30">
                            <div className="flex items-center gap-2 px-4 py-3 bg-error-500/10 border-b border-error-500/30">
                                <Heart className="h-4 w-4 text-error-400" />
                                <h3 className="text-sm font-semibold text-error-400">Medical Information</h3>
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
                                    <span className="text-xs text-error-400/70 flex items-center gap-1">
                                        <Shield className="h-3 w-3" />
                                        Confidential
                                    </span>
                                </div>
                            </div>
                            <div className="p-4">
                                {!canViewMedical ? (
                                    <div className="text-center py-6">
                                        <div className="h-12 w-12 rounded-full bg-slate-700 flex items-center justify-center mx-auto">
                                            <Lock className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <p className="text-sm font-medium text-chalk-50 mt-3">Access Restricted</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Medical information is only visible to coaches and the gymnast's guardians.
                                        </p>
                                    </div>
                                ) : hasMedicalInfo ? (
                                    <div className="space-y-4">
                                        {gymnast.medical_info?.allergies && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-error-500/20 flex items-center justify-center flex-shrink-0">
                                                    <AlertCircle className="h-4 w-4 text-error-400" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-error-400 uppercase tracking-wide">Allergies</p>
                                                    <p className="text-sm text-slate-300 mt-0.5">{gymnast.medical_info.allergies}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.medications && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-orange-400 uppercase tracking-wide">Medications</p>
                                                    <p className="text-sm text-slate-300 mt-0.5">{gymnast.medical_info.medications}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.conditions && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">Conditions</p>
                                                    <p className="text-sm text-slate-300 mt-0.5">{gymnast.medical_info.conditions}</p>
                                                </div>
                                            </div>
                                        )}
                                        {gymnast.medical_info?.notes && (
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                                                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Additional Notes</p>
                                                    <p className="text-sm text-slate-300 mt-0.5">{gymnast.medical_info.notes}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="h-10 w-10 rounded-full bg-success-500/20 flex items-center justify-center mx-auto">
                                            <svg className="h-5 w-5 text-success-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-sm text-slate-400 mt-2">No medical concerns reported</p>
                                    </div>
                                )}

                                {/* Injury History Section */}
                                {canViewMedical && injuryReports.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-error-500/20">
                                        <button
                                            onClick={() => setShowInjuryHistory(!showInjuryHistory)}
                                            className="flex items-center gap-2 text-sm font-semibold text-error-400 hover:text-error-300 transition-colors w-full"
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
                                                                ? 'border-error-500/30 bg-error-500/10'
                                                                : injury.status === 'recovering'
                                                                ? 'border-amber-500/30 bg-amber-500/10'
                                                                : 'border-success-500/30 bg-success-500/10'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                        injury.status === 'active'
                                                                            ? 'bg-error-500/20 text-error-400'
                                                                            : injury.status === 'recovering'
                                                                            ? 'bg-amber-500/20 text-amber-400'
                                                                            : 'bg-success-500/20 text-success-400'
                                                                    }`}>
                                                                        {injury.status.charAt(0).toUpperCase() + injury.status.slice(1)}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">
                                                                        {format(parseISO(injury.date), 'MMM d, yyyy')} at {injury.time}
                                                                    </span>
                                                                </div>
                                                                <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
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
                                                                                    ? 'text-error-400 font-medium'
                                                                                    : injury.severity === 'moderate'
                                                                                    ? 'text-amber-400'
                                                                                    : 'text-slate-400'
                                                                            }`}>
                                                                                {injury.severity}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <p className="mt-2 text-sm text-slate-300">{injury.description}</p>
                                                                <div className="mt-2 text-xs text-slate-400">
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

            {/* Edit Profile Modal */}
            <AddMemberModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onMemberAdded={() => {
                    fetchGymnast();
                    setIsEditModalOpen(false);
                }}
                initialData={{
                    type: 'gymnast_profile',
                    id: gymnast.id,
                    full_profile: gymnast
                }}
            />
        </div>
    );
}
