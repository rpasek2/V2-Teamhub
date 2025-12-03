import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Ticket } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

interface JoinHubModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHubJoined: () => void;
}

export function JoinHubModal({ isOpen, onClose, onHubJoined }: JoinHubModalProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !code.trim()) return;

        setLoading(true);
        setError(null);

        try {
            // 1. Find the invite code
            const { data: invite, error: inviteError } = await supabase
                .from('hub_invites')
                .select('*')
                .eq('code', code.trim().toUpperCase())
                .eq('is_active', true)
                .single();

            if (inviteError || !invite) {
                throw new Error('Invalid or expired invite code');
            }

            // 2. Check if max uses reached
            if (invite.max_uses !== null && invite.uses >= invite.max_uses) {
                throw new Error('This invite code has reached its maximum uses');
            }

            // 3. Check if expired
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                throw new Error('This invite code has expired');
            }

            // 4. Check if user is already a member
            const { data: existingMembers } = await supabase
                .from('hub_members')
                .select('hub_id, user_id')
                .eq('hub_id', invite.hub_id)
                .eq('user_id', user.id);

            if (existingMembers && existingMembers.length > 0) {
                throw new Error('You are already a member of this hub');
            }

            // 5. Add user to hub with the role specified in the invite
            const { error: memberError } = await supabase
                .from('hub_members')
                .insert({
                    hub_id: invite.hub_id,
                    user_id: user.id,
                    role: invite.role,
                    status: 'active',
                });

            if (memberError) throw memberError;

            // 6. Increment the uses count
            const { error: updateError } = await supabase
                .from('hub_invites')
                .update({ uses: invite.uses + 1 })
                .eq('id', invite.id);

            if (updateError) {
                console.error('Failed to update invite uses:', updateError);
            }

            onHubJoined();
            onClose();
            setCode('');
            navigate(`/hub/${invite.hub_id}`);

        } catch (err: any) {
            console.error('Error joining hub:', err);
            setError(err.message || 'Failed to join hub');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setCode('');
        setError(null);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Join a Hub">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center">
                    <div className="rounded-full bg-brand-100 p-3">
                        <Ticket className="h-8 w-8 text-brand-600" />
                    </div>
                </div>

                <p className="text-center text-sm text-slate-600">
                    Enter the invite code you received to join a hub.
                </p>

                <div>
                    <label htmlFor="inviteCode" className="block text-sm font-medium text-slate-700">
                        Invite Code
                    </label>
                    <input
                        type="text"
                        id="inviteCode"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg font-mono tracking-widest uppercase shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        placeholder="XXXXXX"
                        maxLength={10}
                        required
                    />
                </div>

                {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                        {error}
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="inline-flex items-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Join Hub
                    </button>
                </div>
            </form>
        </Modal>
    );
}
