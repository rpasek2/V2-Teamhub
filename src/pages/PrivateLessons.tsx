import { useState, useEffect } from 'react';
import { GraduationCap, Settings, Clock, Calendar, Users, Search, Loader2 } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { supabase } from '../lib/supabase';
import type { CoachLessonProfile, Profile, LessonSlot, LessonPackage } from '../types';

// Components
import { CoachLessonSetup } from '../components/private-lessons/CoachLessonSetup';
import { AvailabilityManager } from '../components/private-lessons/AvailabilityManager';
import { LessonCalendar } from '../components/private-lessons/LessonCalendar';
import { CoachLessonCard } from '../components/private-lessons/CoachLessonCard';
import { BookLessonModal } from '../components/private-lessons/BookLessonModal';
import { MyBookingsTab } from '../components/private-lessons/MyBookingsTab';
import { CoachBookingsTab } from '../components/private-lessons/CoachBookingsTab';

type Tab = 'browse' | 'my-bookings' | 'my-setup' | 'my-availability' | 'coach-bookings' | 'all-coaches' | 'all-bookings';

export default function PrivateLessons() {
    const { hub, currentRole } = useHub();

    const [activeTab, setActiveTab] = useState<Tab>('browse');
    const [coaches, setCoaches] = useState<(CoachLessonProfile & { coach_profile?: Profile })[]>([]);
    const [coachPackages, setCoachPackages] = useState<Record<string, LessonPackage[]>>({});
    const [loading, setLoading] = useState(true);

    // For booking flow
    const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<LessonSlot | null>(null);
    const [selectedPackages, setSelectedPackages] = useState<LessonPackage[]>([]);
    const [showBookModal, setShowBookModal] = useState(false);

    // Determine available tabs based on role
    // Staff includes owner, director, admin - they can also offer lessons
    const isStaff = ['owner', 'director', 'admin'].includes(currentRole || '');
    const isCoach = currentRole === 'coach';
    const isParent = currentRole === 'parent';
    // Anyone who can offer lessons (staff or coach)
    const canOfferLessons = isStaff || isCoach;

    // Set default tab based on role
    useEffect(() => {
        if (isCoach) {
            setActiveTab('my-setup');
        } else if (isParent) {
            setActiveTab('browse');
        } else if (isStaff) {
            setActiveTab('my-setup'); // Staff can also set up their own lessons
        }
    }, [isCoach, isParent, isStaff]);

    useEffect(() => {
        if (hub) {
            fetchCoaches();
        }
    }, [hub]);

    const fetchCoaches = async () => {
        if (!hub) return;

        setLoading(true);
        try {
            // Fetch coaches and packages in parallel
            const [coachResult, packageResult] = await Promise.all([
                supabase
                    .from('coach_lesson_profiles')
                    .select('*, coach_profile:profiles!coach_user_id(id, full_name, avatar_url, email)')
                    .eq('hub_id', hub.id)
                    .eq('is_active', true)
                    .order('created_at', { ascending: true }),
                supabase
                    .from('lesson_packages')
                    .select('*')
                    .eq('hub_id', hub.id)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true })
            ]);

            if (coachResult.error) throw coachResult.error;
            setCoaches(coachResult.data || []);

            // Group packages by coach_user_id
            if (packageResult.data) {
                const packagesMap: Record<string, LessonPackage[]> = {};
                packageResult.data.forEach(pkg => {
                    if (!packagesMap[pkg.coach_user_id]) {
                        packagesMap[pkg.coach_user_id] = [];
                    }
                    packagesMap[pkg.coach_user_id].push(pkg);
                });
                setCoachPackages(packagesMap);
            }
        } catch (err) {
            console.error('Error fetching coaches:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSlotSelect = (slot: LessonSlot, packages?: LessonPackage[]) => {
        setSelectedSlot(slot);
        setSelectedPackages(packages || []);
        setShowBookModal(true);
    };

    const selectedCoach = selectedCoachId
        ? coaches.find(c => c.coach_user_id === selectedCoachId)
        : null;

    // Get tabs for current role
    const getTabs = (): { id: Tab; label: string; icon: React.ReactNode }[] => {
        if (isCoach) {
            return [
                { id: 'my-setup', label: 'My Setup', icon: <Settings className="w-4 h-4" /> },
                { id: 'my-availability', label: 'My Availability', icon: <Clock className="w-4 h-4" /> },
                { id: 'coach-bookings', label: 'My Bookings', icon: <Calendar className="w-4 h-4" /> },
                { id: 'browse', label: 'Browse', icon: <Search className="w-4 h-4" /> },
            ];
        }

        if (isParent) {
            return [
                { id: 'browse', label: 'Find Lessons', icon: <Search className="w-4 h-4" /> },
                { id: 'my-bookings', label: 'My Bookings', icon: <Calendar className="w-4 h-4" /> },
            ];
        }

        // Staff (owner, director, admin) - can offer lessons AND manage all
        return [
            { id: 'my-setup', label: 'My Setup', icon: <Settings className="w-4 h-4" /> },
            { id: 'my-availability', label: 'My Availability', icon: <Clock className="w-4 h-4" /> },
            { id: 'coach-bookings', label: 'My Bookings', icon: <Calendar className="w-4 h-4" /> },
            { id: 'all-coaches', label: 'All Coaches', icon: <Users className="w-4 h-4" /> },
            { id: 'all-bookings', label: 'All Bookings', icon: <Calendar className="w-4 h-4" /> },
            { id: 'browse', label: 'Browse', icon: <Search className="w-4 h-4" /> },
        ];
    };

    const tabs = getTabs();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="py-6">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">Private Lessons</h1>
                                <p className="text-sm text-slate-500">
                                    {isCoach
                                        ? 'Manage your lesson offerings and availability'
                                        : isParent
                                        ? 'Book private lessons with our coaches'
                                        : 'Manage private lesson offerings'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 -mb-px overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id);
                                    setSelectedCoachId(null);
                                }}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === tab.id
                                        ? 'border-brand-500 text-brand-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Coach/Staff Setup Tab */}
                {activeTab === 'my-setup' && canOfferLessons && (
                    <CoachLessonSetup onProfileUpdated={fetchCoaches} />
                )}

                {/* Coach/Staff Availability Tab */}
                {activeTab === 'my-availability' && canOfferLessons && (
                    <AvailabilityManager />
                )}

                {/* Coach/Staff's Own Bookings Tab */}
                {activeTab === 'coach-bookings' && canOfferLessons && (
                    <CoachBookingsTab />
                )}

                {/* Parent's Bookings Tab */}
                {activeTab === 'my-bookings' && isParent && (
                    <MyBookingsTab />
                )}

                {/* Browse Tab (All roles) */}
                {activeTab === 'browse' && (
                    <div>
                        {selectedCoachId ? (
                            // Show calendar for selected coach
                            <div>
                                <button
                                    onClick={() => setSelectedCoachId(null)}
                                    className="mb-4 text-sm text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    &larr; Back to all coaches
                                </button>
                                {selectedCoach && (
                                    <div className="mb-4 flex items-center gap-3">
                                        {selectedCoach.coach_profile?.avatar_url ? (
                                            <img
                                                src={selectedCoach.coach_profile.avatar_url}
                                                alt=""
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold">
                                                {selectedCoach.coach_profile?.full_name?.charAt(0) || 'C'}
                                            </div>
                                        )}
                                        <div>
                                            <h2 className="font-semibold text-slate-900">
                                                {selectedCoach.coach_profile?.full_name}
                                            </h2>
                                            <p className="text-sm text-slate-500">
                                                {selectedCoachId && coachPackages[selectedCoachId]?.length > 0 ? (
                                                    `${coachPackages[selectedCoachId].length} lesson option${coachPackages[selectedCoachId].length > 1 ? 's' : ''} available`
                                                ) : (
                                                    `$${selectedCoach.cost_per_lesson}/lesson • ${selectedCoach.lesson_duration_minutes} min`
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                <LessonCalendar
                                    coachId={selectedCoachId}
                                    onSlotSelect={handleSlotSelect}
                                    view="week"
                                />
                            </div>
                        ) : loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                            </div>
                        ) : coaches.length === 0 ? (
                            <div className="card p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <GraduationCap className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-1">No coaches available</h3>
                                <p className="text-sm text-slate-500">
                                    No coaches have set up their private lesson profiles yet.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {coaches.map(coach => (
                                    <CoachLessonCard
                                        key={coach.id}
                                        profile={coach}
                                        packages={coachPackages[coach.coach_user_id] || []}
                                        onViewCalendar={() => setSelectedCoachId(coach.coach_user_id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* All Coaches Tab (Staff only) */}
                {activeTab === 'all-coaches' && isStaff && (
                    <div>
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
                            </div>
                        ) : coaches.length === 0 ? (
                            <div className="card p-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <Users className="w-6 h-6 text-slate-400" />
                                </div>
                                <h3 className="font-medium text-slate-900 mb-1">No coaches configured</h3>
                                <p className="text-sm text-slate-500">
                                    Coaches need to set up their lesson profiles in the My Setup tab.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {coaches.map(coach => (
                                    <div key={coach.id} className="card p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {coach.coach_profile?.avatar_url ? (
                                                    <img
                                                        src={coach.coach_profile.avatar_url}
                                                        alt=""
                                                        className="w-10 h-10 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-semibold">
                                                        {coach.coach_profile?.full_name?.charAt(0) || 'C'}
                                                    </div>
                                                )}
                                                <div>
                                                    <h3 className="font-medium text-slate-900">
                                                        {coach.coach_profile?.full_name}
                                                    </h3>
                                                    <p className="text-sm text-slate-500">
                                                        {coach.events.length} events • {coach.levels.length} levels • ${coach.cost_per_lesson}/lesson
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${
                                                    coach.is_active
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                    {coach.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('browse');
                                                        setSelectedCoachId(coach.coach_user_id);
                                                    }}
                                                    className="btn-secondary text-sm"
                                                >
                                                    View Calendar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* All Bookings Tab (Staff only) */}
                {activeTab === 'all-bookings' && isStaff && (
                    <div>
                        <p className="text-sm text-slate-500 mb-4">
                            Viewing all bookings across all coaches
                        </p>
                        <CoachBookingsTab coachId={undefined} />
                    </div>
                )}
            </div>

            {/* Book Lesson Modal */}
            {selectedSlot && (
                <BookLessonModal
                    isOpen={showBookModal}
                    onClose={() => {
                        setShowBookModal(false);
                        setSelectedSlot(null);
                        setSelectedPackages([]);
                    }}
                    onBooked={() => {
                        setShowBookModal(false);
                        setSelectedSlot(null);
                        setSelectedPackages([]);
                    }}
                    slot={selectedSlot}
                    coachProfile={selectedCoach || undefined}
                    packages={selectedPackages}
                />
            )}
        </div>
    );
}
