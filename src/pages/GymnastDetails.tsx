import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Award, Target, ClipboardList, ListChecks, Sparkles, Trophy, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { isTabEnabled } from '../lib/permissions';
import { useHub } from '../context/HubContext';
import { GymnastProfileTab } from '../components/gymnast/GymnastProfileTab';
import { GoalsSection } from '../components/gymnast/GoalsSection';
import { AssessmentSection } from '../components/gymnast/AssessmentSection';
import { GymnastAssignmentStats } from '../components/gymnast/GymnastAssignmentStats';
import { GymnastSkillsTab } from '../components/gymnast/GymnastSkillsTab';
import { GymnastScoresTab } from '../components/gymnast/GymnastScoresTab';
import { GymnastAttendanceTab } from '../components/gymnast/GymnastAttendanceTab';
import type { GymnastProfile } from '../types';

type PageTab = 'profile' | 'goals' | 'assessment' | 'assignments' | 'skills' | 'scores' | 'attendance';

export function GymnastDetails() {
    const { gymnastId } = useParams<{ gymnastId: string }>();
    const navigate = useNavigate();
    const { hub, linkedGymnasts, currentRole } = useHub();

    const [gymnast, setGymnast] = useState<GymnastProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<PageTab>('profile');

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

    const canEditProfile = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const canManageFloorMusic = useMemo(() => {
        const staffRoles = ['owner', 'director', 'admin', 'coach'];
        return currentRole ? staffRoles.includes(currentRole) : false;
    }, [currentRole]);

    const canEditAssessment = canReportInjury;

    const enabledTabs = hub?.settings?.enabledTabs;

    // Reset active tab to 'profile' if the current tab becomes disabled
    useEffect(() => {
        if (activeTab !== 'profile' && activeTab !== 'goals' && activeTab !== 'assessment') {
            if (!isTabEnabled(activeTab, enabledTabs)) {
                setActiveTab('profile');
            }
        }
    }, [enabledTabs, activeTab]);

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
                {isTabEnabled('assignments', enabledTabs) && (
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
                )}
                {isTabEnabled('skills', enabledTabs) && (
                <button
                    onClick={() => setActiveTab('skills')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'skills'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Sparkles className="h-4 w-4" />
                    Skills
                </button>
                )}
                {isTabEnabled('scores', enabledTabs) && (
                <button
                    onClick={() => setActiveTab('scores')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'scores'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <Trophy className="h-4 w-4" />
                    Scores
                </button>
                )}
                {isTabEnabled('attendance', enabledTabs) && (
                <button
                    onClick={() => setActiveTab('attendance')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === 'attendance'
                            ? 'border-brand-500 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                >
                    <UserCheck className="h-4 w-4" />
                    Attendance
                </button>
                )}
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
                {activeTab === 'assignments' && isTabEnabled('assignments', enabledTabs) && (
                    <GymnastAssignmentStats gymnastProfileId={gymnast.id} />
                )}

                {/* Skills Tab */}
                {activeTab === 'skills' && isTabEnabled('skills', enabledTabs) && (
                    <GymnastSkillsTab
                        gymnastId={gymnast.id}
                        gymnastLevel={gymnast.level}
                        gymnastGender={gymnast.gender as 'Male' | 'Female' | null}
                    />
                )}

                {/* Scores Tab */}
                {activeTab === 'scores' && isTabEnabled('scores', enabledTabs) && (
                    <GymnastScoresTab
                        gymnastId={gymnast.id}
                        gymnastGender={gymnast.gender as 'Male' | 'Female' | null}
                        gymnastLevel={gymnast.level}
                    />
                )}

                {/* Attendance Tab */}
                {activeTab === 'attendance' && isTabEnabled('attendance', enabledTabs) && (
                    <GymnastAttendanceTab
                        gymnastId={gymnast.id}
                        gymnastLevel={gymnast.level}
                        scheduleGroup={gymnast.schedule_group || undefined}
                    />
                )}

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <GymnastProfileTab
                        gymnast={gymnast}
                        canEditProfile={canEditProfile}
                        canReportInjury={canReportInjury}
                        canViewMedical={canViewMedical}
                        canManageFloorMusic={canManageFloorMusic}
                        onGymnastUpdated={fetchGymnast}
                    />
                )}
            </div>
        </div>
    );
}
