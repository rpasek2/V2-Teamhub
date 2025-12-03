import { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare, Users, Plus, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';

interface Channel {
    id: string;
    name: string;
    type: 'public' | 'private';
    group_id?: string | null;
    dm_participant_ids?: string[] | null;
    // For DM channels, we'll store the other user's info
    dm_other_user?: {
        id: string;
        full_name: string;
        email: string;
    };
}

interface HubMemberOption {
    user_id: string;
    full_name: string;
    email: string;
}

interface Message {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    profiles?: {
        full_name: string;
        email: string;
    };
}

export default function Messages() {
    const { hub } = useHub();
    const { user } = useAuth();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [dmChannels, setDmChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // New DM modal state
    const [showNewDmModal, setShowNewDmModal] = useState(false);
    const [hubMembers, setHubMembers] = useState<HubMemberOption[]>([]);
    const [dmSearchTerm, setDmSearchTerm] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    useEffect(() => {
        if (hub && user) {
            fetchChannels();
        }
    }, [hub, user]);

    useEffect(() => {
        if (selectedChannel) {
            fetchMessages(selectedChannel.id);
            const subscription = subscribeToMessages(selectedChannel.id);
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [selectedChannel]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchChannels = async () => {
        if (!hub || !user) return;

        // Fetch all channels (RLS will filter)
        const { data, error } = await supabase
            .from('channels')
            .select('id, name, type, group_id, dm_participant_ids')
            .eq('hub_id', hub.id)
            .order('name');

        if (error) {
            console.error('Error fetching channels:', error);
            return;
        }

        const allChannels = data || [];

        // Separate DM channels from regular channels
        const regularChannels: Channel[] = allChannels.filter(c => !c.dm_participant_ids) as Channel[];
        const dmChans: Channel[] = allChannels.filter(c => c.dm_participant_ids) as Channel[];

        // For DM channels, fetch the other user's profile
        if (dmChans.length > 0) {
            const otherUserIds = dmChans.map(c => {
                const participants = c.dm_participant_ids || [];
                return participants.find((id: string) => id !== user.id);
            }).filter(Boolean);

            if (otherUserIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', otherUserIds);

                // Attach profile info to DM channels
                dmChans.forEach(c => {
                    const participants = c.dm_participant_ids || [];
                    const otherId = participants.find((id: string) => id !== user.id);
                    const profile = profiles?.find(p => p.id === otherId);
                    if (profile) {
                        (c as Channel).dm_other_user = {
                            id: profile.id,
                            full_name: profile.full_name || profile.email,
                            email: profile.email
                        };
                    }
                });
            }
        }

        setChannels(regularChannels);
        setDmChannels(dmChans);

        // Select default channel if none selected
        if (!selectedChannel) {
            const defaultChannel = regularChannels.find(c => !c.group_id) || regularChannels[0] || dmChans[0];
            if (defaultChannel) {
                setSelectedChannel(defaultChannel);
            } else if (regularChannels.length === 0 && dmChans.length === 0) {
                createDefaultChannel();
            }
        }
    };

    const createDefaultChannel = async () => {
        if (!hub || !user) return;
        const { data } = await supabase
            .from('channels')
            .insert([{ hub_id: hub.id, name: 'general', created_by: user.id }])
            .select()
            .single();

        if (data) {
            setChannels([data]);
            setSelectedChannel(data);
        }
    };

    const fetchMessages = async (channelId: string) => {
        const { data, error } = await supabase
            .from('messages')
            .select('*, profiles(full_name, email)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true });

        if (error) console.error('Error fetching messages:', error);
        else setMessages(data || []);
    };

    const subscribeToMessages = (channelId: string) => {
        return supabase
            .channel(`messages:${channelId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                async (payload) => {
                    const { data } = await supabase
                        .from('messages')
                        .select('*, profiles(full_name, email)')
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        setMessages((prev) => [...prev, data]);
                    }
                }
            )
            .subscribe();
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChannel || !user) return;

        const content = newMessage.trim();
        setNewMessage('');

        const { error } = await supabase
            .from('messages')
            .insert([
                {
                    channel_id: selectedChannel.id,
                    user_id: user.id,
                    content: content,
                },
            ]);

        if (error) {
            console.error('Error sending message:', error);
            setNewMessage(content);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Fetch hub members for new DM modal
    const fetchHubMembers = async () => {
        if (!hub || !user) return;
        setLoadingMembers(true);

        const { data, error } = await supabase
            .from('hub_members')
            .select(`
                user_id,
                profile:profiles (
                    full_name,
                    email
                )
            `)
            .eq('hub_id', hub.id)
            .neq('user_id', user.id);

        if (error) {
            console.error('Error fetching hub members:', error);
        } else {
            const members: HubMemberOption[] = (data || []).map((m: any) => ({
                user_id: m.user_id,
                full_name: m.profile?.full_name || 'Unknown',
                email: m.profile?.email || ''
            }));
            setHubMembers(members);
        }
        setLoadingMembers(false);
    };

    const openNewDmModal = () => {
        setShowNewDmModal(true);
        setDmSearchTerm('');
        fetchHubMembers();
    };

    const startDmWithUser = async (otherUserId: string) => {
        if (!hub || !user) return;

        // Call the database function to get or create the DM channel
        const { data, error } = await supabase
            .rpc('get_or_create_dm_channel', {
                p_hub_id: hub.id,
                p_user1_id: user.id,
                p_user2_id: otherUserId
            });

        if (error) {
            console.error('Error creating DM channel:', error);
            return;
        }

        // Refresh channels and select the new DM
        await fetchChannels();

        // Find and select the DM channel
        const channelId = data;
        const { data: channelData } = await supabase
            .from('channels')
            .select('id, name, type, group_id, dm_participant_ids')
            .eq('id', channelId)
            .single();

        if (channelData) {
            // Get the other user's profile
            const otherUser = hubMembers.find(m => m.user_id === otherUserId);
            const dmChannel: Channel = {
                ...channelData,
                dm_other_user: otherUser ? {
                    id: otherUser.user_id,
                    full_name: otherUser.full_name,
                    email: otherUser.email
                } : undefined
            };
            setSelectedChannel(dmChannel);
        }

        setShowNewDmModal(false);
    };

    const filteredMembers = hubMembers.filter(m =>
        m.full_name.toLowerCase().includes(dmSearchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(dmSearchTerm.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl">
            {/* Sidebar */}
            <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-900">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {/* Channels Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Channels</span>
                    </div>

                    {/* Hub-wide channels */}
                    {channels.filter(c => !c.group_id).map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setSelectedChannel(channel)}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${selectedChannel?.id === channel.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <Hash className="mr-2 h-4 w-4 opacity-50" />
                            {channel.name}
                        </button>
                    ))}

                    {/* Group channels */}
                    {channels.filter(c => c.group_id).map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => setSelectedChannel(channel)}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${selectedChannel?.id === channel.id
                                ? 'bg-white text-brand-600 shadow-sm'
                                : 'text-slate-700 hover:bg-slate-100'
                                }`}
                        >
                            <Users className="mr-2 h-4 w-4 opacity-50" />
                            {channel.name}
                        </button>
                    ))}

                    {/* Direct Messages Section */}
                    <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Direct Messages</span>
                        <button
                            onClick={openNewDmModal}
                            className="p-1 rounded hover:bg-slate-200 transition-colors"
                            title="New message"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {dmChannels.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400">No conversations yet</p>
                    ) : (
                        dmChannels.map((channel) => (
                            <button
                                key={channel.id}
                                onClick={() => setSelectedChannel(channel)}
                                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${selectedChannel?.id === channel.id
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 mr-2">
                                    {channel.dm_other_user?.full_name?.[0] || '?'}
                                </div>
                                <span className="truncate">{channel.dm_other_user?.full_name || 'Unknown'}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedChannel ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center">
                            {selectedChannel.dm_participant_ids ? (
                                <>
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 mr-3">
                                        {selectedChannel.dm_other_user?.full_name?.[0] || '?'}
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">
                                        {selectedChannel.dm_other_user?.full_name || 'Unknown'}
                                    </h3>
                                </>
                            ) : (
                                <>
                                    {selectedChannel.group_id ? (
                                        <Users className="mr-2 h-5 w-5 text-slate-400" />
                                    ) : (
                                        <Hash className="mr-2 h-5 w-5 text-slate-400" />
                                    )}
                                    <h3 className="text-lg font-medium text-slate-900">{selectedChannel.name}</h3>
                                    {selectedChannel.group_id && (
                                        <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                            Group
                                        </span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
                                    <p className="mt-2 text-sm text-slate-500">
                                        {selectedChannel.dm_participant_ids
                                            ? `Start a conversation with ${selectedChannel.dm_other_user?.full_name || 'this user'}`
                                            : 'No messages yet. Start the conversation!'}
                                    </p>
                                </div>
                            ) : (
                                messages.map((message, index) => {
                                    const isMe = message.user_id === user?.id;
                                    const showHeader = index === 0 || messages[index - 1].user_id !== message.user_id;

                                    return (
                                        <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`flex-shrink-0 ${isMe ? 'ml-3' : 'mr-3'}`}>
                                                    {showHeader && (
                                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                                                            {message.profiles?.full_name?.[0] || message.profiles?.email?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    {!showHeader && <div className="w-8" />}
                                                </div>
                                                <div>
                                                    {showHeader && (
                                                        <div className={`flex items-baseline mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <span className="text-sm font-medium text-slate-900 mr-2">
                                                                {message.profiles?.full_name || 'Unknown'}
                                                            </span>
                                                            <span className="text-xs text-slate-500">
                                                                {format(new Date(message.created_at), 'h:mm a')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-4 py-2 rounded-lg text-sm ${isMe
                                                            ? 'bg-brand-600 text-white rounded-tr-none'
                                                            : 'bg-slate-100 text-slate-900 rounded-tl-none'
                                                            }`}
                                                    >
                                                        {message.content}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <form onSubmit={sendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={
                                        selectedChannel.dm_participant_ids
                                            ? `Message ${selectedChannel.dm_other_user?.full_name || 'user'}`
                                            : `Message #${selectedChannel.name}`
                                    }
                                    className="flex-1 rounded-md border-0 py-2 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="inline-flex items-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-500">
                        <div className="text-center">
                            <MessageSquare className="mx-auto h-12 w-12 text-slate-300" />
                            <h3 className="mt-2 text-sm font-semibold text-slate-900">No conversation selected</h3>
                            <p className="mt-1 text-sm text-slate-500">Select a channel or start a new message.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* New DM Modal */}
            {showNewDmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setShowNewDmModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">New Message</h3>
                            <button
                                onClick={() => setShowNewDmModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-500"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={dmSearchTerm}
                                    onChange={(e) => setDmSearchTerm(e.target.value)}
                                    placeholder="Search members..."
                                    className="w-full rounded-md border-0 py-2 pl-10 pr-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm"
                                    autoFocus
                                />
                            </div>
                            <div className="mt-4 max-h-64 overflow-y-auto">
                                {loadingMembers ? (
                                    <p className="text-center py-4 text-sm text-slate-500">Loading...</p>
                                ) : filteredMembers.length === 0 ? (
                                    <p className="text-center py-4 text-sm text-slate-500">No members found</p>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredMembers.map((member) => (
                                            <button
                                                key={member.user_id}
                                                onClick={() => startDmWithUser(member.user_id)}
                                                className="w-full flex items-center px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
                                            >
                                                <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 mr-3">
                                                    {member.full_name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                                                    <p className="text-xs text-slate-500">{member.email}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
