import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { HubEventSkill, GymEvent } from '../../types';
import { EVENT_FULL_NAMES } from '../../types';

interface ManageSkillsModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    level: string;
    event: GymEvent;
    skills: HubEventSkill[];
    onSkillsUpdated: () => void;
}

export function ManageSkillsModal({
    isOpen,
    onClose,
    hubId,
    level,
    event,
    skills,
    onSkillsUpdated
}: ManageSkillsModalProps) {
    const [localSkills, setLocalSkills] = useState<HubEventSkill[]>([]);
    const [newSkillName, setNewSkillName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setLocalSkills([...skills].sort((a, b) => a.skill_order - b.skill_order));
    }, [skills]);

    const handleAddSkill = async () => {
        if (!newSkillName.trim()) return;
        setError(null);
        setSaving(true);

        const maxOrder = localSkills.length > 0
            ? Math.max(...localSkills.map(s => s.skill_order))
            : -1;

        const { data, error: insertError } = await supabase
            .from('hub_event_skills')
            .insert({
                hub_id: hubId,
                level,
                event,
                skill_name: newSkillName.trim(),
                skill_order: maxOrder + 1
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error adding skill:', insertError);
            setError(insertError.message);
        } else if (data) {
            setLocalSkills([...localSkills, data]);
            setNewSkillName('');
            onSkillsUpdated();
        }

        setSaving(false);
    };

    const handleDeleteSkill = async (skillId: string) => {
        if (!confirm('Delete this skill? Any recorded progress for this skill will also be deleted.')) {
            return;
        }

        setError(null);
        const { error: deleteError } = await supabase
            .from('hub_event_skills')
            .delete()
            .eq('id', skillId);

        if (deleteError) {
            console.error('Error deleting skill:', deleteError);
            setError(deleteError.message);
        } else {
            setLocalSkills(localSkills.filter(s => s.id !== skillId));
            onSkillsUpdated();
        }
    };

    const handleUpdateSkillName = async (skillId: string) => {
        if (!editingName.trim()) {
            setEditingId(null);
            return;
        }

        setError(null);
        const { error: updateError } = await supabase
            .from('hub_event_skills')
            .update({ skill_name: editingName.trim() })
            .eq('id', skillId);

        if (updateError) {
            console.error('Error updating skill:', updateError);
            setError(updateError.message);
        } else {
            setLocalSkills(localSkills.map(s =>
                s.id === skillId ? { ...s, skill_name: editingName.trim() } : s
            ));
            onSkillsUpdated();
        }

        setEditingId(null);
        setEditingName('');
    };

    const handleMoveSkill = async (skillId: string, direction: 'up' | 'down') => {
        const index = localSkills.findIndex(s => s.id === skillId);
        if (index === -1) return;
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localSkills.length - 1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        const newSkills = [...localSkills];
        const [moved] = newSkills.splice(index, 1);
        newSkills.splice(newIndex, 0, moved);

        // Update order values
        const updates = newSkills.map((skill, idx) => ({
            id: skill.id,
            skill_order: idx
        }));

        setLocalSkills(newSkills.map((s, idx) => ({ ...s, skill_order: idx })));

        // Update in database
        setError(null);
        for (const update of updates) {
            const { error: updateError } = await supabase
                .from('hub_event_skills')
                .update({ skill_order: update.skill_order })
                .eq('id', update.id);

            if (updateError) {
                console.error('Error updating skill order:', updateError);
                setError(updateError.message);
                break;
            }
        }

        onSkillsUpdated();
    };

    const startEditing = (skill: HubEventSkill) => {
        setEditingId(skill.id);
        setEditingName(skill.skill_name);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative w-full max-w-lg transform rounded-xl bg-white shadow-2xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Manage Skills
                            </h2>
                            <p className="text-sm text-slate-500">
                                {level} - {EVENT_FULL_NAMES[event]}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-red-800">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Add New Skill */}
                        <div className="mb-4 flex gap-2">
                            <input
                                type="text"
                                value={newSkillName}
                                onChange={(e) => setNewSkillName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                                placeholder="Enter skill name..."
                                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                            <button
                                onClick={handleAddSkill}
                                disabled={!newSkillName.trim() || saving}
                                className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Add
                            </button>
                        </div>

                        {/* Skills List */}
                        {localSkills.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-slate-200 p-8 text-center">
                                <p className="text-sm text-slate-500">
                                    No skills defined yet. Add your first skill above.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {localSkills.map((skill, index) => (
                                    <div
                                        key={skill.id}
                                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                                    >
                                        {/* Drag Handle / Order indicator */}
                                        <div className="flex flex-col items-center text-slate-400">
                                            <GripVertical className="h-5 w-5" />
                                        </div>

                                        {/* Skill Name (editable) */}
                                        <div className="flex-1 min-w-0">
                                            {editingId === skill.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={() => handleUpdateSkillName(skill.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateSkillName(skill.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    autoFocus
                                                    className="w-full rounded border border-brand-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(skill)}
                                                    className="w-full text-left text-sm font-medium text-slate-900 hover:text-brand-600 truncate"
                                                >
                                                    {skill.skill_name}
                                                </button>
                                            )}
                                        </div>

                                        {/* Move Buttons */}
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleMoveSkill(skill.id, 'up')}
                                                disabled={index === 0}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move up"
                                            >
                                                <ChevronUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleMoveSkill(skill.id, 'down')}
                                                disabled={index === localSkills.length - 1}
                                                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Move down"
                                            >
                                                <ChevronDown className="h-4 w-4" />
                                            </button>
                                        </div>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDeleteSkill(skill.id)}
                                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                            title="Delete skill"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-4 text-xs text-slate-500">
                            Click on a skill name to edit it. Use arrows to reorder skills.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
