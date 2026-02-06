import { useState, useEffect } from 'react';
import { Sparkles, Loader2, MessageSquare, Check, X, Edit3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';
import { useAuth } from '../../context/AuthContext';
import { useRoleChecks } from '../../hooks/useRoleChecks';
import type { HubEventSkill, GymnastSkill, SkillStatus, SkillEvent, GymnastEventComment } from '../../types';
import { DEFAULT_WAG_SKILL_EVENTS, DEFAULT_MAG_SKILL_EVENTS, SKILL_STATUS_CONFIG } from '../../types';

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
    const { user } = useAuth();
    const { isStaff } = useRoleChecks();
    const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
    const [skills, setSkills] = useState<HubEventSkill[]>([]);
    const [gymnastSkills, setGymnastSkills] = useState<GymnastSkill[]>([]);
    const [eventComment, setEventComment] = useState<GymnastEventComment | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditingComment, setIsEditingComment] = useState(false);
    const [editingCommentText, setEditingCommentText] = useState('');

    // Get events from hub settings or use defaults
    const getEventsForGender = (gender: 'Female' | 'Male'): SkillEvent[] => {
        const customEvents = hub?.settings?.skillEvents?.[gender];
        if (customEvents && customEvents.length > 0) {
            return customEvents;
        }
        return gender === 'Female' ? DEFAULT_WAG_SKILL_EVENTS : DEFAULT_MAG_SKILL_EVENTS;
    };

    const events = getEventsForGender((gymnastGender || 'Female') as 'Female' | 'Male');

    // Set default event on mount
    useEffect(() => {
        if (events.length > 0 && !selectedEvent) {
            setSelectedEvent(events[0].id);
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

    // Fetch event comment when event changes
    useEffect(() => {
        if (hub && gymnastId && selectedEvent) {
            fetchEventComment();
        }
    }, [hub, gymnastId, selectedEvent]);

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

    const fetchEventComment = async () => {
        if (!hub || !gymnastId || !selectedEvent) return;

        const { data, error } = await supabase
            .from('gymnast_event_comments')
            .select('*')
            .eq('hub_id', hub.id)
            .eq('gymnast_profile_id', gymnastId)
            .eq('event', selectedEvent)
            .maybeSingle();

        if (error) {
            console.error('Error fetching event comment:', error);
        } else {
            setEventComment(data);
        }
    };

    const startEditingComment = () => {
        setIsEditingComment(true);
        setEditingCommentText(eventComment?.comment || '');
    };

    const cancelEditingComment = () => {
        setIsEditingComment(false);
        setEditingCommentText('');
    };

    const saveComment = async () => {
        if (!hub || !gymnastId || !selectedEvent || !user) return;

        if (eventComment) {
            // Update existing
            const { error } = await supabase
                .from('gymnast_event_comments')
                .update({
                    comment: editingCommentText || null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', eventComment.id);

            if (error) {
                console.error('Error updating comment:', error);
                return;
            }
        } else if (editingCommentText.trim()) {
            // Insert new
            const { error } = await supabase
                .from('gymnast_event_comments')
                .insert({
                    gymnast_profile_id: gymnastId,
                    hub_id: hub.id,
                    event: selectedEvent,
                    comment: editingCommentText,
                    created_by: user.id
                });

            if (error) {
                console.error('Error inserting comment:', error);
                return;
            }
        }

        setIsEditingComment(false);
        setEditingCommentText('');
        fetchEventComment();
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
                        No skills have been added for {events.find(e => e.id === selectedEvent)?.fullName || selectedEvent} at {gymnastLevel} yet.
                    </p>
                </div>
            ) : (
                <>
                    {/* Coach Notes Section */}
                    <div className="card p-4">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="h-4 w-4 text-slate-400" />
                                <h4 className="text-sm font-medium text-slate-700">Coach Notes</h4>
                            </div>
                            {isStaff && !isEditingComment && (
                                <button
                                    onClick={startEditingComment}
                                    className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                                >
                                    <Edit3 className="h-3 w-3" />
                                    {eventComment?.comment ? 'Edit' : 'Add'}
                                </button>
                            )}
                        </div>

                        {isEditingComment ? (
                            <div className="space-y-2">
                                <textarea
                                    value={editingCommentText}
                                    onChange={(e) => setEditingCommentText(e.target.value)}
                                    className="w-full min-h-[80px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 resize-none"
                                    placeholder={`Add notes about progress on ${events.find(e => e.id === selectedEvent)?.fullName || selectedEvent}...`}
                                    autoFocus
                                />
                                <div className="flex items-center gap-2 justify-end">
                                    <button
                                        onClick={cancelEditingComment}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                                    >
                                        <X className="h-4 w-4" />
                                        Cancel
                                    </button>
                                    <button
                                        onClick={saveComment}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600"
                                    >
                                        <Check className="h-4 w-4" />
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className={`text-sm ${eventComment?.comment ? 'text-slate-700' : 'text-slate-400 italic'}`}>
                                {eventComment?.comment || 'No notes yet for this event.'}
                            </p>
                        )}
                    </div>

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
                        {skills.length} skill{skills.length !== 1 ? 's' : ''} for {events.find(e => e.id === selectedEvent)?.fullName || selectedEvent}
                    </p>
                </>
            )}
        </div>
    );
}
