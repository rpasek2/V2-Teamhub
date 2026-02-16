import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Settings2, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { SkillsTable } from '../components/skills/SkillsTable';
import { ManageSkillsModal } from '../components/skills/ManageSkillsModal';
import { ManageEventsModal } from '../components/skills/ManageEventsModal';
import type { GymnastProfile, HubEventSkill, GymnastSkill, SkillEvent, GymnastEventComment } from '../types';
import { DEFAULT_WAG_SKILL_EVENTS, DEFAULT_MAG_SKILL_EVENTS } from '../types';

export function Skills() {
    const { hub, getPermissionScope, linkedGymnasts, refreshHub } = useHub();
    const { user } = useAuth();
    const { markAsViewed } = useNotifications();
    const { isStaff, isParent } = useRoleChecks();
    const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [allGymnasts, setAllGymnasts] = useState<GymnastProfile[]>([]);
    const [skills, setSkills] = useState<HubEventSkill[]>([]);
    const [gymnastSkills, setGymnastSkills] = useState<GymnastSkill[]>([]);
    const [eventComments, setEventComments] = useState<GymnastEventComment[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [isManageEventsModalOpen, setIsManageEventsModalOpen] = useState(false);
    const levels = hub?.settings?.levels || [];

    // Get events from hub settings or use defaults
    const getEventsForGender = (gender: 'Female' | 'Male'): SkillEvent[] => {
        const customEvents = hub?.settings?.skillEvents?.[gender];
        if (customEvents && customEvents.length > 0) {
            return customEvents;
        }
        return gender === 'Female' ? DEFAULT_WAG_SKILL_EVENTS : DEFAULT_MAG_SKILL_EVENTS;
    };

    const events = getEventsForGender(activeGender);

    // Get permission scope for skills
    const skillsScope = getPermissionScope('skills');

    // For parents, get the linked gymnast's info
    const linkedGymnast = isParent && linkedGymnasts.length > 0 ? linkedGymnasts[0] : null;
    const parentGender = linkedGymnast?.gender || 'Female';
    const parentLevel = linkedGymnast?.level || '';
    const parentEvents = getEventsForGender(parentGender as 'Female' | 'Male');

    // Filter gymnasts based on permission scope
    const gymnasts = useMemo(() => {
        if (skillsScope === 'none') return [];
        if (skillsScope === 'own' || isParent) {
            // Only show linked gymnasts
            const linkedIds = linkedGymnasts.map(g => g.id);
            return allGymnasts.filter(g => linkedIds.includes(g.id));
        }
        // 'all' scope - show all gymnasts
        return allGymnasts;
    }, [allGymnasts, skillsScope, linkedGymnasts, isParent]);

    // Mark skills as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('skills');
        }
    }, [hub, markAsViewed]);

    // Set default level when hub loads (staff only)
    useEffect(() => {
        if (!isParent && levels.length > 0 && !selectedLevel) {
            setSelectedLevel(levels[0]);
        }
    }, [levels, selectedLevel, isParent]);

    // For parents, use their gymnast's level
    useEffect(() => {
        if (isParent && parentLevel) {
            setSelectedLevel(parentLevel);
            setActiveGender(parentGender as 'Female' | 'Male');
        }
    }, [isParent, parentLevel, parentGender]);

    // Set default event when gender changes
    useEffect(() => {
        const genderEvents = getEventsForGender(activeGender);
        if (genderEvents.length > 0 && !selectedEvent) {
            setSelectedEvent(genderEvents[0].id);
        }
    }, [activeGender, selectedEvent, hub?.settings?.skillEvents]);

    // For parents, set default event based on their gymnast's gender
    useEffect(() => {
        if (isParent && parentEvents.length > 0 && !selectedEvent) {
            setSelectedEvent(parentEvents[0].id);
        }
    }, [isParent, parentEvents, selectedEvent]);

    // Fetch gymnasts for selected level and gender
    useEffect(() => {
        if (hub && selectedLevel) {
            fetchGymnasts();
        }
    }, [hub, selectedLevel, activeGender]);

    // Fetch skills for selected level and event
    useEffect(() => {
        if (hub && selectedLevel && selectedEvent) {
            fetchSkills();
        }
    }, [hub, selectedLevel, selectedEvent]);

    // Fetch gymnast skill statuses when gymnasts or skills change
    useEffect(() => {
        if (gymnasts.length > 0 && skills.length > 0) {
            fetchGymnastSkills();
        } else {
            setGymnastSkills([]);
        }
    }, [gymnasts, skills]);

    // Fetch event comments when event or gymnasts change
    useEffect(() => {
        if (hub && selectedEvent && gymnasts.length > 0) {
            fetchEventComments();
        } else {
            setEventComments([]);
        }
    }, [hub, selectedEvent, gymnasts]);

    const fetchGymnasts = async () => {
        if (!hub || !selectedLevel) return;
        setError(null);

        const { data, error: fetchError } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level, gender')
            .eq('hub_id', hub.id)
            .eq('level', selectedLevel)
            .eq('gender', activeGender)
            .order('last_name', { ascending: true });

        if (fetchError) {
            console.error('Error fetching gymnasts:', fetchError);
            setError('Failed to load data. Please try refreshing.');
        } else {
            setAllGymnasts((data || []) as GymnastProfile[]);
        }
        setInitialLoading(false);
    };

    const fetchSkills = async () => {
        if (!hub || !selectedLevel || !selectedEvent) return;

        const { data, error: fetchError } = await supabase
            .from('hub_event_skills')
            .select('id, hub_id, level, event, skill_name, skill_order, created_at, created_by')
            .eq('hub_id', hub.id)
            .eq('level', selectedLevel)
            .eq('event', selectedEvent)
            .order('skill_order', { ascending: true });

        if (fetchError) {
            console.error('Error fetching skills:', fetchError);
            setError('Failed to load data. Please try refreshing.');
        } else {
            setSkills(data || []);
        }
    };

    const fetchGymnastSkills = async () => {
        if (gymnasts.length === 0 || skills.length === 0) return;

        const gymnastIds = gymnasts.map(g => g.id);
        const skillIds = skills.map(s => s.id);

        const { data, error: fetchError } = await supabase
            .from('gymnast_skills')
            .select('id, gymnast_profile_id, hub_event_skill_id, status, notes, achieved_date, updated_at, updated_by')
            .in('gymnast_profile_id', gymnastIds)
            .in('hub_event_skill_id', skillIds);

        if (fetchError) {
            console.error('Error fetching gymnast skills:', fetchError);
            setError('Failed to load data. Please try refreshing.');
        } else {
            setGymnastSkills(data || []);
        }
    };

    const fetchEventComments = async () => {
        if (!hub || !selectedEvent || gymnasts.length === 0) return;

        const gymnastIds = gymnasts.map(g => g.id);

        const { data, error: fetchError } = await supabase
            .from('gymnast_event_comments')
            .select('id, gymnast_profile_id, hub_id, event, comment, created_by, created_at, updated_at')
            .eq('hub_id', hub.id)
            .eq('event', selectedEvent)
            .in('gymnast_profile_id', gymnastIds);

        if (fetchError) {
            console.error('Error fetching event comments:', fetchError);
            setError('Failed to load data. Please try refreshing.');
        } else {
            setEventComments(data || []);
        }
    };

    const handleCommentChange = async (gymnastId: string, comment: string) => {
        if (!hub || !selectedEvent || !user) return;

        // Find existing comment
        const existing = eventComments.find(
            c => c.gymnast_profile_id === gymnastId && c.event === selectedEvent
        );

        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('gymnast_event_comments')
                .update({
                    comment: comment || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);

            if (error) {
                console.error('Error updating comment:', error);
                return;
            }
        } else if (comment.trim()) {
            // Insert new (only if there's actual content)
            const { error } = await supabase
                .from('gymnast_event_comments')
                .insert({
                    gymnast_profile_id: gymnastId,
                    hub_id: hub.id,
                    event: selectedEvent,
                    comment: comment,
                    created_by: user.id
                });

            if (error) {
                console.error('Error inserting comment:', error);
                return;
            }
        }

        // Refresh comments
        fetchEventComments();
    };

    const handleSkillStatusChange = async (gymnastId: string, skillId: string, newStatus: string) => {
        // Find existing record
        const existing = gymnastSkills.find(
            gs => gs.gymnast_profile_id === gymnastId && gs.hub_event_skill_id === skillId
        );

        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('gymnast_skills')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    achieved_date: newStatus === 'achieved' || newStatus === 'mastered' ? new Date().toISOString().split('T')[0] : null
                })
                .eq('id', existing.id);

            if (error) {
                console.error('Error updating skill status:', error);
                return;
            }
        } else {
            // Insert new
            const { error } = await supabase
                .from('gymnast_skills')
                .insert({
                    gymnast_profile_id: gymnastId,
                    hub_event_skill_id: skillId,
                    status: newStatus,
                    achieved_date: newStatus === 'achieved' || newStatus === 'mastered' ? new Date().toISOString().split('T')[0] : null
                });

            if (error) {
                console.error('Error inserting skill status:', error);
                return;
            }
        }

        // Refresh gymnast skills
        fetchGymnastSkills();
    };

    const handleSkillsUpdated = () => {
        fetchSkills();
    };

    // Show loading state only on initial page load
    if (initialLoading && selectedLevel) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
        );
    }

    // Parent view - simplified with just gymnast name and event tabs
    if (isParent) {
        return (
            <div className="h-full flex flex-col">
                <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Skills</h1>
                        {linkedGymnast && (
                            <p className="text-sm text-slate-500 mt-1">
                                {linkedGymnast.first_name} {linkedGymnast.last_name} · {linkedGymnast.level}
                            </p>
                        )}
                    </div>
                </header>

                {error && (
                    <div className="mx-4 mt-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                        {error}
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-6">
                    {!linkedGymnast ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-slate-100 p-4">
                                <Sparkles className="h-8 w-8 text-slate-400" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-slate-900">No gymnast linked</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                Contact your coach to link your gymnast to your account.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Event Tabs */}
                            <div className="flex flex-wrap gap-2">
                                {parentEvents.map((event) => (
                                    <button
                                        key={event.id}
                                        onClick={() => setSelectedEvent(event.id)}
                                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                            selectedEvent === event.id
                                                ? 'bg-brand-500 text-white'
                                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        {event.fullName}
                                    </button>
                                ))}
                            </div>

                            {/* Skills Table */}
                            {selectedEvent && gymnasts.length > 0 && (
                                <SkillsTable
                                    key={selectedEvent}
                                    gymnasts={gymnasts}
                                    skills={skills}
                                    gymnastSkills={gymnastSkills}
                                    eventComments={eventComments}
                                    canEdit={false}
                                    onSkillStatusChange={handleSkillStatusChange}
                                />
                            )}

                            {/* No skills message */}
                            {selectedEvent && skills.length === 0 && (
                                <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
                                    <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
                                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                        No skills defined yet
                                    </h3>
                                    <p className="mt-2 text-sm text-slate-500">
                                        Your coach hasn't added skills for {parentEvents.find(e => e.id === selectedEvent)?.fullName || selectedEvent} at {linkedGymnast.level} yet.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        );
    }

    // Staff view - full controls with level and gender filters
    return (
        <div className="h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 rounded-t-xl">
                <h1 className="text-2xl font-bold text-slate-900">Skills</h1>

                {/* Gender Toggle */}
                <div className="flex rounded-lg bg-slate-100 p-1">
                    <button
                        onClick={() => setActiveGender('Female')}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeGender === 'Female'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        Girls
                    </button>
                    <button
                        onClick={() => setActiveGender('Male')}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeGender === 'Male'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        Boys
                    </button>
                </div>
            </header>

            {error && (
                <div className="mx-4 mt-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                    {error}
                </div>
            )}

            <main className="flex-1 overflow-y-auto p-6">
                {levels.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                        <div className="rounded-full bg-slate-100 p-4">
                            <Sparkles className="h-8 w-8 text-slate-400" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-900">No levels configured</h3>
                        <p className="mt-2 text-sm text-slate-500">
                            Add levels in hub settings to start tracking skills.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Level Buttons */}
                        <div className="flex flex-wrap gap-2">
                            {levels.map((level) => (
                                <button
                                    key={level}
                                    onClick={() => setSelectedLevel(level)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        selectedLevel === level
                                            ? 'bg-brand-500 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>

                        {/* Event Buttons */}
                        <div className="flex flex-wrap items-center gap-2">
                            {events.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event.id)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        selectedEvent === event.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
                                >
                                    {event.fullName}
                                </button>
                            ))}

                            {/* Manage Events Button */}
                            {isStaff && (
                                <button
                                    onClick={() => setIsManageEventsModalOpen(true)}
                                    className="ml-auto flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                    Manage Events
                                </button>
                            )}

                            {/* Manage Skills Button */}
                            {isStaff && selectedLevel && selectedEvent && (
                                <button
                                    onClick={() => setIsManageModalOpen(true)}
                                    className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                >
                                    <Settings2 className="h-4 w-4" />
                                    Manage Skills
                                </button>
                            )}
                        </div>

                        {/* Skills Table */}
                        {selectedLevel && selectedEvent && (
                            <>
                                {gymnasts.length === 0 ? (
                                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
                                        <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
                                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                            No {activeGender === 'Female' ? 'girls' : 'boys'} at {selectedLevel}
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            Add gymnasts to this level in the roster to track their skills.
                                        </p>
                                    </div>
                                ) : (
                                    <SkillsTable
                                        key={selectedEvent}
                                        gymnasts={gymnasts}
                                        skills={skills}
                                        gymnastSkills={gymnastSkills}
                                        eventComments={eventComments}
                                        canEdit={isStaff}
                                        onSkillStatusChange={handleSkillStatusChange}
                                        onCommentChange={handleCommentChange}
                                        onManageSkills={() => setIsManageModalOpen(true)}
                                    />
                                )}
                            </>
                        )}
                    </div>
                )}
            </main>

            {/* Manage Skills Modal */}
            {selectedLevel && selectedEvent && (
                <ManageSkillsModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    hubId={hub?.id || ''}
                    level={selectedLevel}
                    event={selectedEvent}
                    eventName={events.find(e => e.id === selectedEvent)?.fullName || selectedEvent}
                    skills={skills}
                    onSkillsUpdated={handleSkillsUpdated}
                />
            )}

            {/* Manage Events Modal */}
            {hub && (
                <ManageEventsModal
                    isOpen={isManageEventsModalOpen}
                    onClose={() => setIsManageEventsModalOpen(false)}
                    hubId={hub.id}
                    gender={activeGender}
                    currentEvents={events}
                    onEventsUpdated={(newEvents) => {
                        // Refresh hub data to pick up the new events
                        refreshHub();
                        // If the currently selected event was removed, clear the selection
                        if (selectedEvent && !newEvents.some(e => e.id === selectedEvent)) {
                            setSelectedEvent(newEvents.length > 0 ? newEvents[0].id : '');
                        }
                    }}
                />
            )}
        </div>
    );
}
