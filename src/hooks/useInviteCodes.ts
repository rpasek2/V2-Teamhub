import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HubInvite, HubRole } from '../types';

interface UseInviteCodesOptions {
    hubId: string | undefined;
}

interface UseInviteCodesReturn {
    invites: HubInvite[];
    loadingInvites: boolean;
    creatingInvite: boolean;
    newInviteRole: HubRole;
    newInviteMaxUses: string;
    copiedCode: string | null;
    message: { type: 'success' | 'error'; text: string } | null;
    setNewInviteRole: (role: HubRole) => void;
    setNewInviteMaxUses: (maxUses: string) => void;
    setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
    fetchInvites: () => Promise<void>;
    handleCreateInvite: () => Promise<void>;
    handleCopyCode: (code: string) => void;
    handleToggleInvite: (id: string, isActive: boolean) => Promise<void>;
    handleDeleteInvite: (id: string, code: string) => Promise<void>;
}

export function useInviteCodes({ hubId }: UseInviteCodesOptions): UseInviteCodesReturn {
    const [invites, setInvites] = useState<HubInvite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(false);
    const [creatingInvite, setCreatingInvite] = useState(false);
    const [newInviteRole, setNewInviteRole] = useState<HubRole>('parent');
    const [newInviteMaxUses, setNewInviteMaxUses] = useState<string>('');
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchInvites = useCallback(async () => {
        if (!hubId) return;
        setLoadingInvites(true);
        try {
            const { data, error } = await supabase
                .from('hub_invites')
                .select('*')
                .eq('hub_id', hubId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites(data || []);
        } catch (err) {
            console.error('Error fetching invites:', err);
        } finally {
            setLoadingInvites(false);
        }
    }, [hubId]);

    const generateInviteCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const randomValues = crypto.getRandomValues(new Uint8Array(6));
        return Array.from(randomValues, (byte) => chars[byte % chars.length]).join('');
    };

    const handleCreateInvite = useCallback(async () => {
        if (!hubId) return;
        setCreatingInvite(true);
        setMessage(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const code = generateInviteCode();
            const maxUses = newInviteMaxUses ? parseInt(newInviteMaxUses) : null;

            const { error } = await supabase
                .from('hub_invites')
                .insert([{
                    hub_id: hubId,
                    code,
                    role: newInviteRole,
                    created_by: user.id,
                    max_uses: maxUses,
                    uses: 0,
                    is_active: true
                }]);

            if (error) throw error;

            setNewInviteMaxUses('');
            await fetchInvites();
            setMessage({ type: 'success', text: `Invite code created: ${code}` });
        } catch (err: unknown) {
            console.error('Error creating invite:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to create invite.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setCreatingInvite(false);
        }
    }, [hubId, newInviteRole, newInviteMaxUses, fetchInvites]);

    const handleCopyCode = useCallback((code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    }, []);

    const handleToggleInvite = useCallback(async (id: string, isActive: boolean) => {
        try {
            const { error } = await supabase
                .from('hub_invites')
                .update({ is_active: !isActive })
                .eq('id', id);

            if (error) throw error;
            await fetchInvites();
        } catch (err) {
            console.error('Error toggling invite:', err);
            setMessage({ type: 'error', text: 'Failed to update invite.' });
        }
    }, [fetchInvites]);

    const handleDeleteInvite = useCallback(async (id: string, code: string) => {
        if (!confirm(`Delete invite code "${code}"?`)) return;

        try {
            const { error } = await supabase
                .from('hub_invites')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchInvites();
            setMessage({ type: 'success', text: 'Invite deleted.' });
        } catch (err) {
            console.error('Error deleting invite:', err);
            setMessage({ type: 'error', text: 'Failed to delete invite.' });
        }
    }, [fetchInvites]);

    return {
        invites,
        loadingInvites,
        creatingInvite,
        newInviteRole,
        newInviteMaxUses,
        copiedCode,
        message,
        setNewInviteRole,
        setNewInviteMaxUses,
        setMessage,
        fetchInvites,
        handleCreateInvite,
        handleCopyCode,
        handleToggleInvite,
        handleDeleteInvite,
    };
}
