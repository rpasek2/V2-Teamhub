import { useEffect } from 'react';
import { Loader2, Plus, Hash, Trash2, MessageSquare } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useChannels } from '../../hooks/useChannels';

interface ChannelsSectionProps {
    hubId: string | undefined;
}

export function ChannelsSection({ hubId }: ChannelsSectionProps) {
    const {
        channels,
        loadingChannels,
        addingChannel,
        newChannelName,
        message,
        setNewChannelName,
        fetchChannels,
        handleAddChannel,
        handleDeleteChannel,
    } = useChannels({ hubId });

    useEffect(() => {
        if (hubId) {
            fetchChannels();
        }
    }, [hubId, fetchChannels]);

    return (
        <CollapsibleSection
            title="Hub Channels"
            icon={MessageSquare}
            description="Manage hub-wide channels that all members can access"
        >
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Add new channel input */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Hash className="h-4 w-4" />
                    </span>
                    <input
                        type="text"
                        value={newChannelName}
                        onChange={(e) => setNewChannelName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddChannel())}
                        placeholder="channel-name"
                        className="input w-full pl-9"
                    />
                </div>
                <button
                    type="button"
                    onClick={handleAddChannel}
                    disabled={!newChannelName.trim() || addingChannel}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {addingChannel ? (
                        <Loader2 className="animate-spin h-4 w-4" />
                    ) : (
                        <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                        </>
                    )}
                </button>
            </div>

            {/* Channels list */}
            {loadingChannels ? (
                <div className="text-center py-6">
                    <Loader2 className="animate-spin h-6 w-6 text-slate-400 mx-auto" />
                </div>
            ) : channels.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Hash className="mx-auto h-8 w-8 text-slate-400" />
                    <p className="mt-2 text-sm text-slate-500">No channels yet.</p>
                    <p className="text-xs text-slate-400">Add a channel above to get started.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {channels.map((channel) => (
                        <li
                            key={channel.id}
                            className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200"
                        >
                            <div className="flex items-center">
                                <Hash className="h-4 w-4 text-slate-400 mr-2" />
                                <span className="text-sm font-medium text-slate-900">{channel.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteChannel(channel.id, channel.name)}
                                className="p-1 text-slate-400 hover:text-red-600"
                                title="Delete channel"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </CollapsibleSection>
    );
}
