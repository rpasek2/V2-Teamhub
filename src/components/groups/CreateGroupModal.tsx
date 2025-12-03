import React, { useState } from 'react';
import { X, Loader2, Users, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const { hub, user, levels } = useHub();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const type = 'private';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLevels, setSelectedLevels] = useState<Set<string>>(new Set());

    const toggleLevel = (level: string) => {
        setSelectedLevels(prev => {
            const newSet = new Set(prev);
            if (newSet.has(level)) {
                newSet.delete(level);
            } else {
                newSet.add(level);
            }
            return newSet;
        });
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user) return;

        setLoading(true);
        setError(null);

        try {
            const levelsArray = selectedLevels.size > 0 ? Array.from(selectedLevels) : null;

            // 1. Create the group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert({
                    hub_id: hub.id,
                    name,
                    description,
                    type,
                    created_by: user.id,
                    auto_assign_levels: levelsArray
                })
                .select()
                .single();

            if (groupError) throw groupError;

            // 2. Add creator as admin member
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: group.id,
                    user_id: user.id,
                    role: 'admin'
                });

            if (memberError) throw memberError;

            // 3. If levels are selected, auto-add parents of gymnasts in those levels
            if (levelsArray && levelsArray.length > 0) {
                // Fetch gymnasts in the selected levels
                const { data: gymnasts } = await supabase
                    .from('gymnast_profiles')
                    .select('guardian_1, guardian_2')
                    .eq('hub_id', hub.id)
                    .in('level', levelsArray);

                if (gymnasts && gymnasts.length > 0) {
                    // Collect unique guardian emails
                    const guardianEmails = new Set<string>();
                    gymnasts.forEach(g => {
                        if (g.guardian_1?.email) guardianEmails.add(g.guardian_1.email.toLowerCase());
                        if (g.guardian_2?.email) guardianEmails.add(g.guardian_2.email.toLowerCase());
                    });

                    // Find hub members with matching emails (parents)
                    if (guardianEmails.size > 0) {
                        const { data: hubMembers } = await supabase
                            .from('hub_members')
                            .select('user_id, profiles(email)')
                            .eq('hub_id', hub.id);

                        if (hubMembers) {
                            const membersToAdd: { group_id: string; user_id: string; role: string }[] = [];

                            hubMembers.forEach((member: any) => {
                                const memberEmail = member.profiles?.email?.toLowerCase();
                                if (memberEmail && guardianEmails.has(memberEmail) && member.user_id !== user.id) {
                                    membersToAdd.push({
                                        group_id: group.id,
                                        user_id: member.user_id,
                                        role: 'member'
                                    });
                                }
                            });

                            if (membersToAdd.length > 0) {
                                await supabase
                                    .from('group_members')
                                    .insert(membersToAdd);
                            }
                        }
                    }
                }
            }

            onGroupCreated();
            onClose();
            setName('');
            setDescription('');
            setSelectedLevels(new Set());
        } catch (err: any) {
            console.error('Error creating group:', err);
            setError(err.message || 'Failed to create group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>

            {/* Modal Content */}
            <div className="relative z-[10000] w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                <div className="absolute top-4 right-4">
                    <button
                        type="button"
                        className="rounded-md text-gray-400 hover:text-gray-500"
                        onClick={onClose}
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-100">
                        <Users className="h-6 w-6 text-brand-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900" id="modal-title">
                            Create New Group
                        </h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Create a space for your team to communicate and share updates.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 rounded-md bg-red-50 p-4">
                        <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Group Name
                        </label>
                        <input
                            type="text"
                            name="name"
                            id="name"
                            required
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Level 4 Parents"
                        />
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            rows={3}
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What is this group for?"
                        />
                    </div>

                    {/* Auto-assign Levels */}
                    {levels.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Auto-Assign to Levels
                                <span className="ml-1 font-normal text-gray-500">(Optional)</span>
                            </label>
                            <p className="text-xs text-gray-500 mb-3">
                                Parents of gymnasts in the selected levels will be automatically added to this group.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {levels.map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        onClick={() => toggleLevel(level)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                            selectedLevels.has(level)
                                                ? 'bg-brand-600 text-white'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {selectedLevels.has(level) && (
                                            <Check className="h-3.5 w-3.5" />
                                        )}
                                        {level}
                                    </button>
                                ))}
                            </div>
                            {selectedLevels.size > 0 && (
                                <p className="mt-2 text-xs text-brand-600">
                                    {selectedLevels.size} level{selectedLevels.size !== 1 ? 's' : ''} selected
                                </p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex items-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Group'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
