import { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';

interface Channel {
    id: string;
    name: string;
    type: 'public' | 'private';
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
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (hub) {
            fetchChannels();
        }
    }, [hub]);

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
        if (!hub) return;
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('hub_id', hub.id)
            .order('name');

        if (error) console.error('Error fetching channels:', error);
        else {
            setChannels(data || []);
            if (data && data.length > 0 && !selectedChannel) {
                setSelectedChannel(data[0]);
            } else if (data && data.length === 0) {
                createDefaultChannel();
            }
        }
    };

    const createDefaultChannel = async () => {
        if (!hub || !user) return;
        const { data, error } = await supabase
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

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl">
            {/* Sidebar - Channels */}
            <div className="w-64 border-r border-slate-200 bg-slate-50 flex flex-col">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h2 className="font-semibold text-slate-900">Channels</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {channels.map((channel) => (
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
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedChannel ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center">
                            <Hash className="mr-2 h-5 w-5 text-slate-400" />
                            <h3 className="text-lg font-medium text-slate-900">{selectedChannel.name}</h3>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.map((message, index) => {
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
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 border-t border-slate-200 bg-white">
                            <form onSubmit={sendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder={`Message #${selectedChannel.name}`}
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
                            <h3 className="mt-2 text-sm font-semibold text-slate-900">No channel selected</h3>
                            <p className="mt-1 text-sm text-slate-500">Select a channel to start messaging.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
