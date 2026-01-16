import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import type { HubEventSkill, GymnastSkill, GymEvent, SkillStatus } from '../../types';
import { WAG_EVENTS, MAG_EVENTS, EVENT_FULL_NAMES, SKILL_STATUS_CONFIG } from '../../types';

interface GymnastSkillsTabProps {
    gymnastId: string;
    gymnastLevel: string | null;
    gymnastGender: 'Male' | 'Female' | null;
}

interface SkillWithStatus extends HubEventSkill {
    status: SkillStatus;
    achieved_date: string | null;
}

export function GymnastSkillsTab({ gymnastId, gymnastLevel, gymnastGender }: GymnastSkillsTabProps) {
    const { hub } = useHub();
    const [selectedEvent, setSelectedEvent] = useState<GymEvent | null>(null);
    const [skills, setSkills] = useState<HubEventSkill[]>([]);
    const [gymnastSkills, setGymnastSkills] = useState<GymnastSkill[]>([]);
    const [loading, setLoading] = useState(true);

    const events = gymnastGender === 'Male' ? MAG_EVENTS : WAG_EVENTS;

    // Set default event on mount
    useEffect(() => {
        if (events.length > 0 && !selectedEvent) {
            setSelectedEvent(events[0]);
        }
    }, [events, selectedEvent]);

    // Fetch skills when event changes
    useEffect(() => {
        if (hub && gymnastLevel && selectedEvent) {
            fetchSkills();
        }
    }, [hub, gymnastLevel, selectedEvent]);

    // Fetch gymnast skill statuses
    useEffect(() => {
        if (gymnastId && skills.length > 0) {
            fetchGymnastSkills();
        }
    }, [gymnastId, skills]);

    const fetchSkills = async () => {
        if (!hub || !gymnastLevel || !selectedEvent) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('hub_event_skills')
            .select('*')
            .eq('hub_id', hub.id)
            .eq('level', gymnastLevel)
            .eq('event', selectedEvent)
            .order('skill_order', { ascending: true });

        if (error) {
            console.error('Error fetching skills:', error);
            setSkills([]);
        } else {
            setSkills(data || []);
        }
        setLoading(false);
    };

    const fetchGymnastSkills = async () => {
        if (!gymnastId || skills.length === 0) return;

        const skillIds = skills.map(s => s.id);

        const { data, error } = await supabase
            .from('gymnast_skills')
            .select('*')
            .eq('gymnast_profile_id', gymnastId)
            .in('hub_event_skill_id', skillIds);

        if (error) {
            console.error('Error fetching gymnast skills:', error);
        } else {
            setGymnastSkills(data || []);
        }
    };

    // Combine skills with their status
    const skillsWithStatus: SkillWithStatus[] = skills.map(skill => {
        const gymnastSkill = gymnastSkills.find(gs => gs.hub_event_skill_id === skill.id);
        return {
            ...skill,
            status: (gymnastSkill?.status as SkillStatus) || 'none',
            achieved_date: gymnastSkill?.achieved_date || null,
        };
    });

    // Group skills by status for summary
    const statusCounts = skillsWithStatus.reduce((acc, skill) => {
        acc[skill.status] = (acc[skill.status] || 0) + 1;
        return acc;
    }, {} as Record<SkillStatus, number>);

    if (!gymnastLevel) {
        return (
            <div className="flex flex-col items-center justify-center text-center py-12">
                <div className="rounded-full bg-slate-100 p-4">
                    <Sparkles className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">No level assigned</h3>
                <p className="mt-2 text-sm text-slate-500">
                    Assign a level to this gymnast to view their skills.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Event Tabs */}
            <div className="flex flex-wrap gap-2">
                {events.map((event) => (
                    <button
                        key={event}
                        onClick={() => setSelectedEvent(event)}
                        className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                            selectedEvent === event
                                ? 'bg-brand-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {EVENT_FULL_NAMES[event]}
                    </button>
                ))}
            </div>

            {/* Loading State */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
                </div>
            ) : skills.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-slate-200 p-12 text-center">
                    <Sparkles className="mx-auto h-12 w-12 text-slate-400" />
                    <h3 className="mt-4 text-lg font-semibold text-slate-900">
                        No skills defined
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                        No skills have been added for {EVENT_FULL_NAMES[selectedEvent!]} at {gymnastLevel} yet.
                    </p>
                </div>
            ) : (
                <>
                    {/* Status Summary */}
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(SKILL_STATUS_CONFIG).map(([status, config]) => {
                            const count = statusCounts[status as SkillStatus] || 0;
                            if (count === 0 && status === 'none') return null;
                            if (count === 0 && status !== 'mastered' && status !== 'achieved') return null;

                            return (
                                <div
                                    key={status}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2 ${config.bgColor}`}
                                >
                                    {config.icon && <span className="text-sm">{config.icon}</span>}
                                    <span className={`text-sm font-medium ${config.color}`}>
                                        {count} {config.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Skills List */}
                    <div className="card overflow-hidden">
                        <div className="divide-y divide-slate-100">
                            {skillsWithStatus.map((skill) => {
                                const config = SKILL_STATUS_CONFIG[skill.status];
                                return (
                                    <div
                                        key={skill.id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-slate-900">
                                                {skill.skill_name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${config.bgColor} ${config.color}`}
                                            >
                                                {config.icon && <span className="text-sm">{config.icon}</span>}
                                                {config.label}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <p className="text-xs text-slate-500 text-center">
                        {skills.length} skill{skills.length !== 1 ? 's' : ''} for {EVENT_FULL_NAMES[selectedEvent!]}
                    </p>
                </>
            )}
        </div>
    );
}
