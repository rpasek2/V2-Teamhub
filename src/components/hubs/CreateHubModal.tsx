import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface CreateHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHubCreated: () => void;
}

export function CreateHubModal({ isOpen, onClose, onHubCreated }: CreateHubModalProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Create Organization
            const { data: org, error: orgError } = await supabase
                .from('organizations')
                .insert({
                    name: name,
                    owner_id: user.id,
                })
                .select()
                .single();

            if (orgError) throw orgError;

            // 2. Create Hub
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const uniqueSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`; // Ensure uniqueness

            const { data: hub, error: hubError } = await supabase
                .from('hubs')
                .insert({
                    name: name,
                    slug: uniqueSlug,
                    organization_id: org.id,
                })
                .select()
                .single();

            if (hubError) throw hubError;

            // 3. Add Creator as Owner
            const { error: memberError } = await supabase
                .from('hub_members')
                .insert({
                    hub_id: hub.id,
                    user_id: user.id,
                    role: 'owner',
                });

            if (memberError) throw memberError;

            onHubCreated();
            onClose();
            navigate(`/hub/${hub.id}`);

        } catch (err: any) {
            console.error('Error creating hub:', err);
            setError(err.message || 'Failed to create hub');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Create New Hub">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="hubName" className="block text-sm font-medium text-slate-700">
                        Hub Name
                    </label>
                    <input
                        type="text"
                        id="hubName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                        placeholder="e.g. Elite Gymnastics Academy"
                        required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        This will be the name of your organization and main hub.
                    </p>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Hub
                    </button>
                </div>
            </form>
        </Modal>
    );
}
