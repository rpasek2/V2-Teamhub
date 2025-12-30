import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Settings2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { SkillsTable } from '../components/skills/SkillsTable';
import { ManageSkillsModal } from '../components/skills/ManageSkillsModal';
import type { GymnastProfile, HubEventSkill, GymnastSkill, GymEvent } from '../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_FULL_NAMES } from '../types';

export function Skills() {
    const { hub, currentRole, getPermissionScope, linkedGymnasts } = useHub();
    const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedEvent, setSelectedEvent] = useState<GymEvent | ''>('');
    const [allGymnasts, setAllGymnasts] = useState<GymnastProfile[]>([]);
    const [skills, setSkills] = useState<HubEventSkill[]>([]);
    const [gymnastSkills, setGymnastSkills] = useState<GymnastSkill[]>([]);
    const [loading, setLoading] = useState(true);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
    const levels = hub?.settings?.levels || [];
    const events = activeGender === 'Female' ? WAG_EVENTS : MAG_EVENTS;

    // Get permission scope for skills
    const skillsScope = getPermissionScope('skills');

    // Filter gymnasts based on permission scope
    const gymnasts = useMemo(() => {
        if (skillsScope === 'none') return [];
        if (skillsScope === 'own') {
            // Only show linked gymnasts for this level/gender
            const linkedIds = linkedGymnasts.map(g => g.id);
            return allGymnasts.filter(g => linkedIds.includes(g.id));
        }
        // 'all' scope - show all gymnasts
        return allGymnasts;
    }, [allGymnasts, skillsScope, linkedGymnasts]);

    // Set default level when hub loads
    useEffect(() => {
        if (levels.length > 0 && !selectedLevel) {
            setSelectedLevel(levels[0]);
        }
    }, [levels, selectedLevel]);

    // Set default event when gender changes
    useEffect(() => {
        const genderEvents = activeGender === 'Female' ? WAG_EVENTS : MAG_EVENTS;
        if (genderEvents.length > 0) {
            setSelectedEvent(genderEvents[0]);
        }
    }, [activeGender]);

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

    const fetchGymnasts = async () => {
        if (!hub || !selectedLevel) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('gymnast_profiles')
            .select('id, first_name, last_name, level, gender')
            .eq('hub_id', hub.id)
            .eq('level', selectedLevel)
            .eq('gender', activeGender)
            .order('last_name', { ascending: true });

        if (error) {
            console.error('Error fetching gymnasts:', error);
        } else {
            setAllGymnasts((data || []) as GymnastProfile[]);
        }
        setLoading(false);
    };

    const fetchSkills = async () => {
        if (!hub || !selectedLevel || !selectedEvent) return;

        const { data, error } = await supabase
            .from('hub_event_skills')
            .select('*')
            .eq('hub_id', hub.id)
            .eq('level', selectedLevel)
            .eq('event', selectedEvent)
            .order('skill_order', { ascending: true });

        if (error) {
            console.error('Error fetching skills:', error);
        } else {
            setSkills(data || []);
        }
    };

    const fetchGymnastSkills = async () => {
        if (gymnasts.length === 0 || skills.length === 0) return;

        const gymnastIds = gymnasts.map(g => g.id);
        const skillIds = skills.map(s => s.id);

        const { data, error } = await supabase
            .from('gymnast_skills')
            .select('*')
            .in('gymnast_profile_id', gymnastIds)
            .in('hub_event_skill_id', skillIds);

        if (error) {
            console.error('Error fetching gymnast skills:', error);
        } else {
            setGymnastSkills(data || []);
        }
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

    if (loading && !selectedLevel) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-mint-500 border-t-transparent"></div>
            </div>
        );
    }

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
                                            ? 'bg-mint-500 text-white'
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
                                    key={event}
                                    onClick={() => setSelectedEvent(event)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                                        selectedEvent === event
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                    }`}
                                >
                                    {EVENT_FULL_NAMES[event]}
                                </button>
                            ))}

                            {/* Manage Skills Button */}
                            {isStaff && selectedLevel && selectedEvent && (
                                <button
                                    onClick={() => setIsManageModalOpen(true)}
                                    className="ml-auto flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
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
                                ) : skills.length === 0 ? (
                                    <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
                                        <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
                                        <h3 className="mt-4 text-lg font-semibold text-slate-900">
                                            No skills defined
                                        </h3>
                                        <p className="mt-2 text-sm text-slate-500">
                                            {isStaff
                                                ? 'Click "Manage Skills" to add skills for this event.'
                                                : 'Skills have not been configured for this event yet.'}
                                        </p>
                                        {isStaff && (
                                            <button
                                                onClick={() => setIsManageModalOpen(true)}
                                                className="btn-primary mt-4"
                                            >
                                                <Settings2 className="h-4 w-4" />
                                                Manage Skills
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <SkillsTable
                                        gymnasts={gymnasts}
                                        skills={skills}
                                        gymnastSkills={gymnastSkills}
                                        canEdit={isStaff}
                                        onSkillStatusChange={handleSkillStatusChange}
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
                    skills={skills}
                    onSkillsUpdated={handleSkillsUpdated}
                />
            )}
        </div>
    );
}
