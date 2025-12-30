import { useState } from 'react';
import { X, Calendar, Mail, Phone, User, AlertCircle, Shield, Shirt, Award, CreditCard, Heart, Lock, AlertTriangle, ChevronDown, ChevronRight, Target, ClipboardList } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ReportInjuryModal } from './ReportInjuryModal';
import { GoalsSection } from './GoalsSection';
import { AssessmentSection } from './AssessmentSection';
import { format, parseISO } from 'date-fns';
import type { GymnastProfile } from '../../types';

type ModalTab = 'profile' | 'goals' | 'assessment';

interface GymnastProfileModalProps {
    gymnast: GymnastProfile | null;
    isOpen: boolean;
    onClose: () => void;
    canViewMedical?: boolean; // Whether user can view medical info (admin/coach or own child)
    canReportInjury?: boolean; // Whether user can report injuries (staff only)
    canEditAssessment?: boolean; // Whether user can edit assessment (staff only)
    onInjuryReported?: () => void; // Callback after injury is reported
}

export function GymnastProfileModal({ gymnast, isOpen, onClose, canViewMedical = true, canReportInjury = false, canEditAssessment = false, onInjuryReported }: GymnastProfileModalProps) {
    const [isReportInjuryOpen, setIsReportInjuryOpen] = useState(false);
    const [showInjuryHistory, setShowInjuryHistory] = useState(false);
    const [activeTab, setActiveTab] = useState<ModalTab>('profile');

    if (!gymnast) return null;

    const injuryReports = gymnast.medical_info?.injury_reports || [];

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

    const hasGuardian1 = gymnast.guardian_1 && (gymnast.guardian_1.first_name || gymnast.guardian_1.last_name || gymnast.guardian_1.email || gymnast.guardian_1.phone);
    const hasGuardian2 = gymnast.guardian_2 && (gymnast.guardian_2.first_name || gymnast.guardian_2.last_name || gymnast.guardian_2.email || gymnast.guardian_2.phone);
    const hasMedicalInfo = gymnast.medical_info && (gymnast.medical_info.allergies || gymnast.medical_info.medications || gymnast.medical_info.conditions || gymnast.medical_info.notes);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <div className="relative">
                {/* Header */}
                <div className="bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 -m-6 mb-0 p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center ring-4 ring-white/30">
                                <span className="text-2xl font-bold text-white">
                                    {gymnast.first_name[0]}{gymnast.last_name[0]}
                                </span>
                            </div>
                            <div>
                                <p className="text-brand-200 text-sm font-medium">ID: {gymnast.gymnast_id}</p>
                                <h2 className="text-2xl font-bold tracking-tight">
                                    {gymnast.first_name} {gymnast.last_name}
                                </h2>
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
                        <button
                            onClick={onClose}
                            className="rounded-full p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-slate-200 -mx-6 px-6 mt-4">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                            activeTab === 'profile'
                                ? 'border-brand-500 text-brand-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                                : 'border-transparent text-slate-500 hover:text-slate-700'
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
                                : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        Assessment
                    </button>
                </div>

                {/* Content */}
                <div className="pt-6 pb-2 space-y-4 max-h-[60vh] overflow-y-auto px-1 -mx-1">
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
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <User className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-700">Basic Information</h3>
                        </div>
                        <div className="p-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0">
                                        <Calendar className="h-4 w-4 text-brand-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Date of Birth</p>
                                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{formatDate(gymnast.date_of_birth)}</p>
                                        <p className="text-xs text-slate-500">{calculateAge(gymnast.date_of_birth)} years old</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                        <User className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Gender</p>
                                        <p className="text-sm font-semibold text-slate-900 mt-0.5">{gymnast.gender || 'Not specified'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Membership Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <CreditCard className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-700">Membership</h3>
                        </div>
                        <div className="p-4">
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
                        </div>
                    </div>

                    {/* Apparel Sizes Card */}
                    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                            <Shirt className="h-4 w-4 text-slate-500" />
                            <h3 className="text-sm font-semibold text-slate-700">Apparel Sizes</h3>
                        </div>
                        <div className="p-4">
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
                                            <p className="text-sm text-slate-400 mt-0.5">Not set</p>
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
                                            <p className="text-sm text-slate-400 mt-0.5">Not set</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guardians Card */}
                    {(hasGuardian1 || hasGuardian2) && (
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                                <Phone className="h-4 w-4 text-slate-500" />
                                <h3 className="text-sm font-semibold text-slate-700">Emergency Contacts</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
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
                        </div>
                    )}

                    {/* Medical Information Card */}
                    <div className="rounded-xl border border-red-200 bg-white overflow-hidden shadow-sm">
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
                            <Heart className="h-4 w-4 text-red-500" />
                            <h3 className="text-sm font-semibold text-red-700">Medical Information</h3>
                            <div className="flex items-center gap-2 ml-auto">
                                {canReportInjury && (
                                    <button
                                        onClick={() => setIsReportInjuryOpen(true)}
                                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                                    >
                                        <AlertTriangle className="h-3 w-3" />
                                        Report Injury
                                    </button>
                                )}
                                <span className="text-xs text-red-400 flex items-center gap-1">
                                    <Shield className="h-3 w-3" />
                                    Confidential
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            {!canViewMedical ? (
                                // Restricted view for parents viewing other children
                                <div className="text-center py-6">
                                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                                        <Lock className="h-6 w-6 text-slate-400" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700 mt-3">Access Restricted</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Medical information is only visible to coaches and the gymnast's guardians.
                                    </p>
                                </div>
                            ) : hasMedicalInfo ? (
                                <div className="space-y-4">
                                    {gymnast.medical_info?.allergies && (
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                                <AlertCircle className="h-4 w-4 text-red-600" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Allergies</p>
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
                                                <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Medications</p>
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
                                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Conditions</p>
                                                <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.conditions}</p>
                                            </div>
                                        </div>
                                    )}
                                    {gymnast.medical_info?.notes && (
                                        <div className="flex items-start gap-3">
                                            <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Additional Notes</p>
                                                <p className="text-sm text-slate-700 mt-0.5">{gymnast.medical_info.notes}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-2">No medical concerns reported</p>
                                </div>
                            )}

                            {/* Injury History Section */}
                            {canViewMedical && injuryReports.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-red-100">
                                    <button
                                        onClick={() => setShowInjuryHistory(!showInjuryHistory)}
                                        className="flex items-center gap-2 text-sm font-semibold text-red-700 hover:text-red-800 transition-colors w-full"
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
                                                            ? 'border-red-200 bg-red-50'
                                                            : injury.status === 'recovering'
                                                            ? 'border-amber-200 bg-amber-50'
                                                            : 'border-green-200 bg-green-50'
                                                    }`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                                    injury.status === 'active'
                                                                        ? 'bg-red-100 text-red-700'
                                                                        : injury.status === 'recovering'
                                                                        ? 'bg-amber-100 text-amber-700'
                                                                        : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                    {injury.status.charAt(0).toUpperCase() + injury.status.slice(1)}
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    {format(parseISO(injury.date), 'MMM d, yyyy')} at {injury.time}
                                                                </span>
                                                            </div>
                                                            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-600">
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
                                                                                ? 'text-red-600 font-medium'
                                                                                : injury.severity === 'moderate'
                                                                                ? 'text-amber-600'
                                                                                : 'text-slate-600'
                                                                        }`}>
                                                                            {injury.severity}
                                                                        </span>
                                                                    </>
                                                                )}
                                                            </div>
                                                            <p className="mt-2 text-sm text-slate-700">{injury.description}</p>
                                                            <div className="mt-2 text-xs text-slate-600">
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

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
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
                    onInjuryReported?.();
                }}
            />
        </Modal>
    );
}
