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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
                            <Settings className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900">General Settings</h3>
                            <p className="text-sm text-slate-500">Manage your group's basic information</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Group Name */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Group Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter group name"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe what this group is about..."
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
                        />
                    </div>

                    {/* Privacy */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Privacy
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setType('public')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    type === 'public'
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    type === 'public' ? 'bg-brand-100' : 'bg-slate-100'
                                }`}>
                                    <Globe className={`h-5 w-5 ${type === 'public' ? 'text-brand-600' : 'text-slate-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className={`font-medium ${type === 'public' ? 'text-brand-700' : 'text-slate-900'}`}>Public</p>
                                    <p className="text-xs text-slate-500">Anyone in the hub can join</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('private')}
                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                    type === 'private'
                                        ? 'border-brand-500 bg-brand-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                    type === 'private' ? 'bg-brand-100' : 'bg-slate-100'
                                }`}>
                                    <Lock className={`h-5 w-5 ${type === 'private' ? 'text-brand-600' : 'text-slate-500'}`} />
                                </div>
                                <div className="text-left">
                                    <p className={`font-medium ${type === 'private' ? 'text-brand-700' : 'text-slate-900'}`}>Private</p>
                                    <p className="text-xs text-slate-500">Only invited members can join</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || saving || !name.trim()}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold shadow-lg shadow-brand-500/25 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
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
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <AlertTriangle className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-red-900">Danger Zone</h3>
                            <p className="text-sm text-red-600">Irreversible actions</p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h4 className="font-medium text-slate-900">Delete this group</h4>
                            <p className="text-sm text-slate-500 mt-1">
                                Once you delete a group, there is no going back. All posts, files, and member data will be permanently removed.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
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
                    <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900">Delete Group</h3>
                                <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-600 mb-4">
                            To confirm deletion, please type <strong className="text-slate-900">{group.name}</strong> below:
                        </p>

                        <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type group name to confirm"
                            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all mb-4"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    setDeleteConfirmText('');
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
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
