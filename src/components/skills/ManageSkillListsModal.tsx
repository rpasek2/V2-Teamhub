import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, AlertCircle, Copy, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SkillList } from '../../types';

interface ManageSkillListsModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubId: string;
    skillLists: SkillList[];
    onListsUpdated: (lists: SkillList[]) => void;
}

export function ManageSkillListsModal({
    isOpen,
    onClose,
    hubId,
    skillLists,
    onListsUpdated
}: ManageSkillListsModalProps) {
    const [newListName, setNewListName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAddList = async () => {
        if (!newListName.trim()) return;

        // Check for duplicate names
        if (skillLists.some(l => l.name.toLowerCase() === newListName.trim().toLowerCase())) {
            setError('A skill list with this name already exists');
            return;
        }

        setSaving(true);
        setError(null);

        const { data, error: insertError } = await supabase
            .from('skill_lists')
            .insert({
                hub_id: hubId,
                name: newListName.trim(),
                is_default: false
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error adding skill list:', insertError);
            setError(insertError.message);
        } else if (data) {
            onListsUpdated([...skillLists, data]);
            setNewListName('');
        }

        setSaving(false);
    };

    const handleRename = async (listId: string) => {
        if (!editingName.trim()) {
            setEditingId(null);
            return;
        }

        // Check for duplicate names
        if (skillLists.some(l => l.id !== listId && l.name.toLowerCase() === editingName.trim().toLowerCase())) {
            setError('A skill list with this name already exists');
            setEditingId(null);
            return;
        }

        setError(null);
        const { error: updateError } = await supabase
            .from('skill_lists')
            .update({ name: editingName.trim() })
            .eq('id', listId);

        if (updateError) {
            console.error('Error renaming skill list:', updateError);
            setError(updateError.message);
        } else {
            onListsUpdated(
                skillLists.map(l => l.id === listId ? { ...l, name: editingName.trim() } : l)
            );
        }

        setEditingId(null);
        setEditingName('');
    };

    const handleDelete = async (list: SkillList) => {
        if (list.is_default) return;
        if (!confirm(`Delete "${list.name}"? All skills in this list will be permanently deleted.`)) return;

        setError(null);
        const { error: deleteError } = await supabase
            .from('skill_lists')
            .delete()
            .eq('id', list.id);

        if (deleteError) {
            console.error('Error deleting skill list:', deleteError);
            setError(deleteError.message);
        } else {
            onListsUpdated(skillLists.filter(l => l.id !== list.id));
        }
    };

    const handleDuplicate = async (sourceList: SkillList) => {
        setSaving(true);
        setError(null);

        // Create new list
        const newName = `${sourceList.name} (Copy)`;
        const { data: newList, error: insertError } = await supabase
            .from('skill_lists')
            .insert({
                hub_id: hubId,
                name: newName,
                is_default: false
            })
            .select()
            .single();

        if (insertError || !newList) {
            console.error('Error creating duplicate list:', insertError);
            setError(insertError?.message || 'Failed to create list');
            setSaving(false);
            return;
        }

        // Copy all skills from source list
        const { data: sourceSkills, error: fetchError } = await supabase
            .from('hub_event_skills')
            .select('hub_id, level, event, skill_name, skill_order, created_by')
            .eq('skill_list_id', sourceList.id);

        if (fetchError) {
            console.error('Error fetching source skills:', fetchError);
            setError(fetchError.message);
            setSaving(false);
            return;
        }

        if (sourceSkills && sourceSkills.length > 0) {
            const newSkills = sourceSkills.map(s => ({
                hub_id: s.hub_id,
                skill_list_id: newList.id,
                level: s.level,
                event: s.event,
                skill_name: s.skill_name,
                skill_order: s.skill_order,
                created_by: s.created_by
            }));

            const { error: copyError } = await supabase
                .from('hub_event_skills')
                .insert(newSkills);

            if (copyError) {
                console.error('Error copying skills:', copyError);
                setError(copyError.message);
                setSaving(false);
                return;
            }
        }

        onListsUpdated([...skillLists, newList]);
        setSaving(false);
    };

    const startEditing = (list: SkillList) => {
        setEditingId(list.id);
        setEditingName(list.name);
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
                <div className="relative w-full max-w-lg transform rounded-xl bg-surface shadow-2xl transition-all">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-line px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-heading">
                                Manage Skill Lists
                            </h2>
                            <p className="text-sm text-muted">
                                Organize skills into separate lists
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-lg p-2 text-faint hover:bg-surface-hover hover:text-muted"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 flex items-start gap-2 rounded-lg bg-red-500/10 p-3 text-red-600">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Add New List */}
                        <div className="mb-4 flex gap-2">
                            <input
                                type="text"
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                                placeholder="New skill list name..."
                                className="flex-1 rounded-lg border border-line-strong bg-surface px-3 py-2 text-sm text-heading focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
                            />
                            <button
                                onClick={handleAddList}
                                disabled={!newListName.trim() || saving}
                                className="flex items-center gap-1.5 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white hover:bg-accent-700 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                                Add
                            </button>
                        </div>

                        {/* Skill Lists */}
                        {skillLists.length === 0 ? (
                            <div className="rounded-lg border-2 border-dashed border-line p-8 text-center">
                                <p className="text-sm text-muted">
                                    No skill lists yet. Add your first one above.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {skillLists.map((list) => (
                                    <div
                                        key={list.id}
                                        className="flex items-center gap-2 rounded-lg border border-line bg-surface p-2 hover:bg-surface-hover"
                                    >
                                        {/* List Name (editable) */}
                                        <div className="flex-1 min-w-0">
                                            {editingId === list.id ? (
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    onBlur={() => handleRename(list.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRename(list.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    autoFocus
                                                    className="w-full rounded border border-accent-300 bg-surface px-2 py-1 text-sm text-heading focus:outline-none focus:ring-1 focus:ring-accent-500"
                                                />
                                            ) : (
                                                <button
                                                    onClick={() => startEditing(list)}
                                                    className="w-full text-left text-sm font-medium text-heading hover:text-accent-600 truncate flex items-center gap-2"
                                                >
                                                    {list.name}
                                                    {list.is_default && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-600">
                                                            <Shield className="h-2.5 w-2.5" />
                                                            DEFAULT
                                                        </span>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Duplicate Button */}
                                        <button
                                            onClick={() => handleDuplicate(list)}
                                            disabled={saving}
                                            className="rounded p-1.5 text-faint hover:bg-accent-500/10 hover:text-accent-600 disabled:opacity-50"
                                            title="Duplicate list with all skills"
                                        >
                                            <Copy className="h-4 w-4" />
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => handleDelete(list)}
                                            disabled={list.is_default}
                                            className="rounded p-1.5 text-faint hover:bg-red-500/10 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={list.is_default ? 'Cannot delete default list' : 'Delete list'}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <p className="mt-4 text-xs text-muted">
                            Click on a list name to rename it. Use the copy button to duplicate a list with all its skills.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end border-t border-line px-6 py-4">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-surface-hover px-4 py-2 text-sm font-medium text-body hover:bg-surface-active"
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
