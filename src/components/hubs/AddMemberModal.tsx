import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useHub } from '../../context/HubContext';

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMemberAdded: () => void;
}

export function AddMemberModal({ isOpen, onClose, onMemberAdded }: AddMemberModalProps) {
    const { hub } = useHub();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('gymnast');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !email.trim()) return;

        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            // 1. Find user by email in profiles
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email.trim())
                .single();

            if (profileError || !profile) {
                throw new Error('User not found. Please ensure they have registered with this email.');
            }

            // 2. Check if already a member
            const { data: existingMember, error: checkError } = await supabase
                .from('hub_members')
                .select('id')
                .eq('hub_id', hub.id)
                .eq('user_id', profile.id)
                .single();

            if (existingMember) {
                throw new Error('User is already a member of this hub.');
            }

            // 3. Add to hub_members
            const { error: addError } = await supabase
                .from('hub_members')
                .insert({
                    hub_id: hub.id,
                    user_id: profile.id,
                    role: role,
                });

            if (addError) throw addError;

            setSuccess('Member added successfully!');
            setEmail('');
            setRole('gymnast');
            onMemberAdded();

            // Close after a brief delay to show success message
            setTimeout(() => {
                onClose();
                setSuccess(null);
            }, 1500);

        } catch (err: any) {
            console.error('Error adding member:', err);
            setError(err.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Member">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                        User Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                        placeholder="user@example.com"
                        required
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        The user must already have an account to be added.
                    </p>
                </div>

                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                        Role
                    </label>
                    <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 sm:text-sm"
                    >
                        <option value="gymnast">Gymnast</option>
                        <option value="parent">Parent</option>
                        <option value="coach">Coach</option>
                        <option value="admin">Admin</option>
                        <option value="director">Director</option>
                    </select>
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center">
                        <AlertCircle className="h-4 w-4 mr-2" />
                        {error}
                    </div>
                )}

                {success && (
                    <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
                        {success}
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
                        disabled={loading || !!success}
                        className="inline-flex items-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Member
                    </button>
                </div>
            </form>
        </Modal>
    );
}
