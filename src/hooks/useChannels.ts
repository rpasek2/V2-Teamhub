import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface HubChannel {
    id: string;
    name: string;
    type: 'public' | 'private';
    group_id: string | null;
    dm_participant_ids: string[] | null;
    created_at: string;
}

interface UseChannelsOptions {
    hubId: string | undefined;
}

interface UseChannelsReturn {
    channels: HubChannel[];
    loadingChannels: boolean;
    addingChannel: boolean;
    newChannelName: string;
    message: { type: 'success' | 'error'; text: string } | null;
    setNewChannelName: (name: string) => void;
    setMessage: (msg: { type: 'success' | 'error'; text: string } | null) => void;
    fetchChannels: () => Promise<void>;
    handleAddChannel: () => Promise<void>;
    handleDeleteChannel: (id: string, name: string) => Promise<void>;
}

export function useChannels({ hubId }: UseChannelsOptions): UseChannelsReturn {
    const [channels, setChannels] = useState<HubChannel[]>([]);
    const [loadingChannels, setLoadingChannels] = useState(false);
    const [addingChannel, setAddingChannel] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const fetchChannels = useCallback(async () => {
        if (!hubId) return;
        setLoadingChannels(true);
        try {
            const { data, error } = await supabase
                .from('channels')
                .select('id, name, type, group_id, dm_participant_ids, created_at')
                .eq('hub_id', hubId)
                .eq('type', 'public')
                .is('group_id', null)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setChannels(data || []);
        } catch (err) {
            console.error('Error fetching channels:', err);
        } finally {
            setLoadingChannels(false);
        }
    }, [hubId]);

    const handleAddChannel = useCallback(async () => {
        if (!hubId || !newChannelName.trim()) return;
        setAddingChannel(true);
        setMessage(null);

        try {
            const sanitizedName = newChannelName
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');

            if (!sanitizedName) {
                setMessage({ type: 'error', text: 'Invalid channel name. Use letters, numbers, and hyphens.' });
                setAddingChannel(false);
                return;
            }

            const { error } = await supabase
                .from('channels')
                .insert([{
                    hub_id: hubId,
                    name: sanitizedName,
                    type: 'public'
                }]);

            if (error) throw error;

            setNewChannelName('');
            await fetchChannels();
            setMessage({ type: 'success', text: `Channel #${sanitizedName} created.` });
        } catch (err: unknown) {
            console.error('Error adding channel:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to add channel.';
            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setAddingChannel(false);
        }
    }, [hubId, newChannelName, fetchChannels]);

    const handleDeleteChannel = useCallback(async (id: string, name: string) => {
        if (!confirm(`Delete channel #${name}? All messages will be lost.`)) return;

        try {
            const { error } = await supabase
                .from('channels')
                .delete()
                .eq('id', id);

            if (error) throw error;
            await fetchChannels();
            setMessage({ type: 'success', text: `Channel #${name} deleted.` });
        } catch (err: unknown) {
            console.error('Error deleting channel:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to delete channel.';
            setMessage({ type: 'error', text: errorMessage });
        }
    }, [fetchChannels]);

    return {
        channels,
        loadingChannels,
        addingChannel,
        newChannelName,
        message,
        setNewChannelName,
        setMessage,
        fetchChannels,
        handleAddChannel,
        handleDeleteChannel,
    };
}
