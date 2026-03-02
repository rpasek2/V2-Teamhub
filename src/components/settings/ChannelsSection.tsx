import { useEffect } from 'react';
import { Loader2, Plus, Hash, Trash2, MessageSquare } from 'lucide-react';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { useChannels } from '../../hooks/useChannels';

interface ChannelsSectionProps {
    hubId: string | undefined;
    bare?: boolean;
}

export function ChannelsSection({ hubId, bare }: ChannelsSectionProps) {
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

    const content = (
        <>
            {message && (
                <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                    {message.text}
                </div>
            )}

            {/* Add new channel input */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-faint">
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
                    <Loader2 className="animate-spin h-6 w-6 text-faint mx-auto" />
                </div>
            ) : channels.length === 0 ? (
                <div className="text-center py-6 bg-surface-alt rounded-lg border-2 border-dashed border-line">
                    <Hash className="mx-auto h-8 w-8 text-faint" />
                    <p className="mt-2 text-sm text-muted">No channels yet.</p>
                    <p className="text-xs text-faint">Add a channel above to get started.</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {channels.map((channel) => (
                        <li
                            key={channel.id}
                            className="flex items-center justify-between bg-surface rounded-lg px-4 py-3 border border-line"
                        >
                            <div className="flex items-center">
                                <Hash className="h-4 w-4 text-faint mr-2" />
                                <span className="text-sm font-medium text-heading">{channel.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteChannel(channel.id, channel.name)}
                                className="p-1 text-faint hover:text-red-600"
                                title="Delete channel"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </>
    );

    if (bare) return content;

    return (
        <CollapsibleSection
            title="Hub Channels"
            icon={MessageSquare}
            description="Manage hub-wide channels that all members can access"
        >
            {content}
        </CollapsibleSection>
    );
}
