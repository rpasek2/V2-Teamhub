import React, { useState } from 'react';
import { X, Loader2, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGroupCreated: () => void;
}

export function CreateGroupModal({ isOpen, onClose, onGroupCreated }: CreateGroupModalProps) {
    const { hub, user } = useHub();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const type = 'private';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create the group
            const { data: group, error: groupError } = await supabase
                .from('groups')
                .insert({
                    hub_id: hub.id,
                    name,
                    description,
                    type,
                    created_by: user.id
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

            onGroupCreated();
            onClose();
            setName('');
            setDescription('');
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
