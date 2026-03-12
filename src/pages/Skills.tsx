import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Settings2, LayoutGrid, ChevronDown, ListChecks } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { SkillsTable } from '../components/skills/SkillsTable';
import { ManageSkillsModal } from '../components/skills/ManageSkillsModal';
import { ManageEventsModal } from '../components/skills/ManageEventsModal';
import { ManageSkillListsModal } from '../components/skills/ManageSkillListsModal';
import type { GymnastProfile, HubEventSkill, GymnastSkill, SkillEvent, GymnastEventComment, SkillList } from '../types';
import { DEFAULT_WAG_SKILL_EVENTS, DEFAULT_MAG_SKILL_EVENTS } from '../types';

export function Skills() {
    const { hub, getPermissionScope, linkedGymnasts, refreshHub } = useHub();
    const { user } = useAuth();
    const { markAsViewed } = useNotifications();
    const { isParent, canEdit } = useRoleChecks();
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
    const [isManageListsModalOpen, setIsManageListsModalOpen] = useState(false);
    const [selectedGymnastId, setSelectedGymnastId] = useState<string | null>(null);
    const [skillLists, setSkillLists] = useState<SkillList[]>([]);
    const [selectedSkillListId, setSelectedSkillListId] = useState<string>('');
    const levels = hub?.settings?.levels || [];

    // Auto-select first gymnast for parents in 'own' scope with multiple kids
    useEffect(() => {
        if (isParent && skillsScope === 'own' && linkedGymnasts.length > 0 && !selectedGymnastId) {
            setSelectedGymnastId(linkedGymnasts[0].id);
        }
    }, [isParent, skillsScope, linkedGymnasts, selectedGymnastId]);

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

    // For parents in 'own' scope, get the selected linked gymnast's info
    const isParentOwnScope = isParent && skillsScope === 'own';
    const linkedGymnast = isParentOwnScope && linkedGymnasts.length > 0
        ? linkedGymnasts.find(g => g.id === selectedGymnastId) || linkedGymnasts[0]
        : null;
    const parentGender = linkedGymnast?.gender || 'Female';
    const parentLevel = linkedGymnast?.level || '';
    const parentEvents = getEventsForGender(parentGender as 'Female' | 'Male');

    // Filter gymnasts based on permission scope
    const gymnasts = useMemo(() => {
        if (skillsScope === 'none') return [];
        if (skillsScope === 'own') {
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

    // Set default level when hub loads (staff or parents with 'all' scope)
    useEffect(() => {
        if (!isParentOwnScope && levels.length > 0 && !selectedLevel) {
            setSelectedLevel(levels[0]);
        }
    }, [levels, selectedLevel, isParentOwnScope]);

    // For parents in 'own' scope, use their gymnast's level
    useEffect(() => {
        if (isParentOwnScope && parentLevel) {
            setSelectedLevel(parentLevel);
            setActiveGender(parentGender as 'Female' | 'Male');
        }
    }, [isParentOwnScope, parentLevel, parentGender]);

    // Set default event when gender changes
    useEffect(() => {
        const genderEvents = getEventsForGender(activeGender);
        if (genderEvents.length > 0 && !selectedEvent) {
            setSelectedEvent(genderEvents[0].id);
        }
    }, [activeGender, selectedEvent, hub?.settings?.skillEvents]);

    // For parents in 'own' scope, set default event based on their gymnast's gender
    useEffect(() => {
        if (isParentOwnScope && parentEvents.length > 0 && !selectedEvent) {
            setSelectedEvent(parentEvents[0].id);
        }
    }, [isParentOwnScope, parentEvents, selectedEvent]);

    // Fetch skill lists when hub loads (reset on hub change)
    useEffect(() => {
        if (hub) {
            setSelectedSkillListId('');
            fetchSkillLists();
        }
    }, [hub?.id]);

    // Fetch gymnasts for selected level and gender
    useEffect(() => {
        if (hub && selectedLevel) {
            fetchGymnasts();
        }
    }, [hub, selectedLevel, activeGender]);

    // Fetch skills for selected level, event, and skill list
    useEffect(() => {
        if (hub && selectedLevel && selectedEvent && selectedSkillListId) {
            fetchSkills();
        }
    }, [hub, selectedLevel, selectedEvent, selectedSkillListId]);

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

    const fetchSkillLists = async () => {
        if (!hub) return;

        const { data, error: fetchError } = await supabase
            .from('skill_lists')
            .select('id, hub_id, name, is_default, created_at, created_by')
            .eq('hub_id', hub.id)
            .order('is_default', { ascending: false })
            .order('name', { ascending: true });

        if (fetchError) {
            console.error('Error fetching skill lists:', fetchError);
        } else {
            setSkillLists(data || []);
            // Auto-select default list if nothing selected
            if (!selectedSkillListId && data && data.length > 0) {
                const defaultList = data.find(l => l.is_default);
                setSelectedSkillListId(defaultList?.id || data[0].id);
            }
        }
    };

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
        if (!hub || !selectedLevel || !selectedEvent || !selectedSkillListId) return;

        const { data, error: fetchError } = await supabase
            .from('hub_event_skills')
            .select('id, hub_id, skill_list_id, level, event, skill_name, skill_order, created_at, created_by')
            .eq('hub_id', hub.id)
            .eq('skill_list_id', selectedSkillListId)
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
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
            </div>
        );
    }

    // Parent 'own' scope view - simplified with just gymnast name and event tabs
    if (isParentOwnScope) {
        return (
            <div className="h-full flex flex-col">
                <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4 rounded-t-xl">
                    <div>
                        <h1 className="text-2xl font-bold text-heading">Skills</h1>
                        {linkedGymnast && linkedGymnasts.length <= 1 && (
                            <p className="text-sm text-muted mt-1">
                                {linkedGymnast.first_name} {linkedGymnast.last_name} · {linkedGymnast.level}
                            </p>
                        )}
                    </div>
                    {linkedGymnasts.length > 1 && (
                        <div className="relative">
                            <select
                                value={selectedGymnastId || ''}
                                onChange={(e) => {
                                    setSelectedGymnastId(e.target.value);
                                    setSelectedEvent('');
                                }}
                                className="block appearance-none rounded-lg border border-line-strong bg-surface py-2.5 pl-4 pr-10 text-sm font-medium text-heading shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                            >
                                {linkedGymnasts.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.first_name} {g.last_name} · {g.level}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-faint" />
                        </div>
                    )}
                </header>

                {error && (
                    <div className="mx-4 mt-4 p-3 bg-error-50 border border-error-200 rounded-lg text-error-700 text-sm">
                        {error}
                    </div>
                )}

                <main className="flex-1 overflow-y-auto p-6">
                    {!linkedGymnast ? (
                        <div className="flex h-full flex-col items-center justify-center text-center">
                            <div className="rounded-full bg-surface-hover p-4">
                                <Sparkles className="h-8 w-8 text-faint" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-heading">No gymnast linked</h3>
                            <p className="mt-2 text-sm text-muted">
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
                                                ? 'bg-accent-500 text-white'
                                                : 'bg-surface-hover text-subtle hover:bg-surface-active'
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
                                <div className="rounded-lg border-2 border-dashed border-line p-12 text-center">
                                    <Sparkles className="mx-auto h-12 w-12 text-faint" />
                                    <h3 className="mt-4 text-lg font-semibold text-heading">
                                        No skills defined yet
                                    </h3>
                                    <p className="mt-2 text-sm text-muted">
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
            <header className="flex items-center justify-between border-b border-line bg-surface px-6 py-4 rounded-t-xl">
                <h1 className="text-2xl font-bold text-heading">Skills</h1>

                {/* Gender Toggle */}
                <div className="flex rounded-lg bg-surface-hover p-1">
                    <button
                        onClick={() => setActiveGender('Female')}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeGender === 'Female'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-muted hover:text-heading'
                        }`}
                    >
                        Girls
                    </button>
                    <button
                        onClick={() => setActiveGender('Male')}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                            activeGender === 'Male'
                                ? 'bg-surface text-heading shadow-sm'
                                : 'text-muted hover:text-heading'
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
                        <div className="rounded-full bg-surface-hover p-4">
                            <Sparkles className="h-8 w-8 text-faint" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-heading">No levels configured</h3>
                        <p className="mt-2 text-sm text-muted">
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
                                            ? 'bg-accent-500 text-white'
                                            : 'bg-surface-hover text-subtle hover:bg-surface-active'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>

                        {/* Skill List Selector + Event Buttons */}
                        {skillLists.length > 1 && (
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-subtle whitespace-nowrap">Skill List</label>
                                <div className="relative">
                                    <select
                                        value={selectedSkillListId}
                                        onChange={(e) => setSelectedSkillListId(e.target.value)}
                                        className="block appearance-none rounded-lg border border-line-strong bg-surface py-2 pl-3 pr-8 text-sm font-medium text-heading shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                                    >
                                        {skillLists.map(list => (
                                            <option key={list.id} value={list.id}>
                                                {list.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                                </div>
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                            {events.map((event) => (
                                <button
                                    key={event.id}
                                    onClick={() => setSelectedEvent(event.id)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        selectedEvent === event.id
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20'
                                    }`}
                                >
                                    {event.fullName}
                                </button>
                            ))}

                            {/* Management Buttons - pushed to the right */}
                            {canEdit && (
                                <div className="ml-auto flex items-center gap-2">
                                    {/* Manage Skill Lists Button */}
                                    <button
                                        onClick={() => setIsManageListsModalOpen(true)}
                                        className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-subtle hover:bg-surface-hover"
                                    >
                                        <ListChecks className="h-4 w-4" />
                                        Manage Lists
                                    </button>

                                    {/* Manage Events Button */}
                                    <button
                                        onClick={() => setIsManageEventsModalOpen(true)}
                                        className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-subtle hover:bg-surface-hover"
                                    >
                                        <LayoutGrid className="h-4 w-4" />
                                        Manage Events
                                    </button>

                                    {/* Manage Skills Button */}
                                    {selectedLevel && selectedEvent && (
                                        <button
                                            onClick={() => setIsManageModalOpen(true)}
                                            className="flex items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-subtle hover:bg-surface-hover"
                                        >
                                            <Settings2 className="h-4 w-4" />
                                            Manage Skills
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Skills Table */}
                        {selectedLevel && selectedEvent && (
                            <>
                                {gymnasts.length === 0 ? (
                                    <div className="rounded-lg border-2 border-dashed border-line p-12 text-center">
                                        <Sparkles className="mx-auto h-12 w-12 text-faint" />
                                        <h3 className="mt-4 text-lg font-semibold text-heading">
                                            No {activeGender === 'Female' ? 'girls' : 'boys'} at {selectedLevel}
                                        </h3>
                                        <p className="mt-2 text-sm text-muted">
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
                                        canEdit={canEdit}
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
            {selectedLevel && selectedEvent && selectedSkillListId && (
                <ManageSkillsModal
                    isOpen={isManageModalOpen}
                    onClose={() => setIsManageModalOpen(false)}
                    hubId={hub?.id || ''}
                    skillListId={selectedSkillListId}
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

            {/* Manage Skill Lists Modal */}
            {hub && (
                <ManageSkillListsModal
                    isOpen={isManageListsModalOpen}
                    onClose={() => setIsManageListsModalOpen(false)}
                    hubId={hub.id}
                    skillLists={skillLists}
                    onListsUpdated={(updatedLists) => {
                        setSkillLists(updatedLists);
                        // If selected list was deleted, switch to default
                        if (!updatedLists.find(l => l.id === selectedSkillListId)) {
                            const defaultList = updatedLists.find(l => l.is_default);
                            setSelectedSkillListId(defaultList?.id || updatedLists[0]?.id || '');
                        }
                    }}
                />
            )}
        </div>
    );
}
