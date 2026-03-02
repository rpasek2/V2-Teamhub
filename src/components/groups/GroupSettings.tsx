import { useState } from 'react';
import { Settings, Lock, Globe, Trash2, Save, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Group } from '../../types';

interface GroupSettingsProps {
    group: Group;
    onUpdate: () => void;
}

export function GroupSettings({ group, onUpdate }: GroupSettingsProps) {
    const navigate = useNavigate();
    const [name, setName] = useState(group.name);
    const [description, setDescription] = useState(group.description || '');
    const [type, setType] = useState<'public' | 'private'>(group.type);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');

    const handleSave = async () => {
        if (!name.trim()) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('groups')
                .update({
                    name: name.trim(),
                    description: description.trim() || null,
                    type
                })
                .eq('id', group.id);

            if (error) throw error;
            onUpdate();
        } catch (err) {
            console.error('Error updating group:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (deleteConfirmText !== group.name) return;

        setDeleting(true);
        try {
            const { error } = await supabase
                .from('groups')
                .delete()
                .eq('id', group.id);

            if (error) throw error;
            navigate('../groups');
        } catch (err) {
            console.error('Error deleting group:', err);
            setDeleting(false);
        }
    };

    const hasChanges = name !== group.name || description !== (group.description || '') || type !== group.type;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* General Settings */}
            <div className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden">
                <div className="px-6 py-4 border-b border-line bg-surface">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-heading">General Settings</h3>
                            <p className="text-sm text-muted">Manage your group's basic information</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-1.5">
                            Group Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter group name"
                            className="w-full rounded-xl border border-line bg-surface text-heading px-4 py-2.5 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this group is about..."
                            rows={3}
                            className="w-full rounded-xl border border-line px-4 py-2.5 text-sm focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all resize-none"
                        />
                    </div>

                    {/* Privacy */}
                    <div>
                        <label className="block text-sm font-medium text-body mb-3">
                            Privacy
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('public')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    type === 'public'
                                        ? 'border-accent-500 bg-accent-500/10'
                                        : 'border-line hover:border-line-strong'
                                }`}
                            >
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    type === 'public' ? 'bg-accent-500/15' : 'bg-surface-hover'
                                }`}>
                                    <Globe className={`h-5 w-5 ${type === 'public' ? 'text-accent-600' : 'text-muted'}`} />
                                </div>
                                <div className="text-left">
                                    <p className={`font-medium ${type === 'public' ? 'text-accent-600' : 'text-heading'}`}>Public</p>
                                    <p className="text-xs text-muted">Anyone in the hub can join</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('private')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    type === 'private'
                                        ? 'border-accent-500 bg-accent-500/10'
                                        : 'border-line hover:border-line-strong'
                                }`}
                            >
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    type === 'private' ? 'bg-accent-500/15' : 'bg-surface-hover'
                                }`}>
                                    <Lock className={`h-5 w-5 ${type === 'private' ? 'text-accent-600' : 'text-muted'}`} />
                                </div>
                                <div className="text-left">
                                    <p className={`font-medium ${type === 'private' ? 'text-accent-600' : 'text-heading'}`}>Private</p>
                                    <p className="text-xs text-muted">Only invited members can join</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving || !name.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-600 text-white text-sm font-semibold shadow-lg shadow-accent-500/25 hover:bg-accent-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-surface rounded-2xl shadow-sm border border-red-500/20 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-500/10 bg-gradient-to-r from-red-500/10 to-surface">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-600">Danger Zone</h3>
                            <p className="text-sm text-red-600">Irreversible actions</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-heading">Delete this group</h4>
                            <p className="text-sm text-muted mt-1">
                                Once you delete a group, there is no going back. All posts, files, and member data will be permanently removed.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/20 text-red-600 text-sm font-medium hover:bg-red-500/10 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Delete Group
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-surface rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-heading">Delete Group</h3>
                                <p className="text-sm text-muted">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-subtle mb-4">
                            To confirm deletion, please type <strong className="text-heading">{group.name}</strong> below:
                        </p>

                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type group name to confirm"
                            className="w-full rounded-xl border border-line bg-surface text-heading px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-line text-body text-sm font-medium hover:bg-surface-hover transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteConfirmText !== group.name || deleting}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="h-4 w-4" />
                                        Delete Group
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
