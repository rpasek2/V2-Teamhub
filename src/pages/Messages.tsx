import { useState, useEffect, useRef } from 'react';
import { Send, Hash, MessageSquare, Users, Plus, X, Search, ShieldAlert, Check, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { AnonymousReportModal } from '../components/messages/AnonymousReportModal';

interface AnonymousReport {
    id: string;
    hub_id: string;
    message: string;
    read_at: string | null;
    created_at: string;
}

interface OwnerInfo {
    user_id: string;
    full_name: string;
}

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
    // Unread message count for this channel
    unread_count?: number;
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
    const { markAsViewed } = useNotifications();
    const { isOwner, isStaff } = useRoleChecks();
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

    // Mark messages as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('messages');
        }
    }, [hub, markAsViewed]);

    // Anonymous reports state
    const [anonymousReports, setAnonymousReports] = useState<AnonymousReport[]>([]);
    const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
    const [showAnonymousReportModal, setShowAnonymousReportModal] = useState(false);
    const [viewingAnonymousReports, setViewingAnonymousReports] = useState(false);
    const [loadingReports, setLoadingReports] = useState(false);
    const [selectedReport, setSelectedReport] = useState<AnonymousReport | null>(null);
    const anonymousReportsEnabled = hub?.settings?.anonymous_reports_enabled !== false; // Default to enabled

    useEffect(() => {
        if (hub && user) {
            fetchChannels();
        }
    }, [hub, user]);

    // Fetch owner info for non-staff (to show who receives anonymous reports)
    useEffect(() => {
        if (hub && !isStaff && anonymousReportsEnabled) {
            fetchOwnerInfo();
        }
    }, [hub, isStaff, anonymousReportsEnabled]);

    // Fetch anonymous reports for owner
    useEffect(() => {
        if (hub && isOwner) {
            fetchAnonymousReports();
        }
    }, [hub, isOwner]);

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

        // Fetch all channels (RLS will filter) and unread counts in parallel
        const [channelsResult, unreadResult] = await Promise.all([
            supabase
                .from('channels')
                .select('id, name, type, group_id, dm_participant_ids')
                .eq('hub_id', hub.id)
                .order('name'),
            supabase.rpc('get_channel_unread_counts', {
                p_user_id: user.id,
                p_hub_id: hub.id
            })
        ]);

        if (channelsResult.error) {
            console.error('Error fetching channels:', channelsResult.error);
            return;
        }

        const allChannels = channelsResult.data || [];
        const unreadCounts = unreadResult.data || [];

        // Create a map of channel_id -> unread_count
        const unreadMap = new Map<string, number>();
        unreadCounts.forEach((item: { channel_id: string; unread_count: number }) => {
            unreadMap.set(item.channel_id, item.unread_count);
        });

        // Separate DM channels from regular channels and attach unread counts
        const regularChannels: Channel[] = allChannels
            .filter(c => !c.dm_participant_ids)
            .map(c => ({ ...c, unread_count: unreadMap.get(c.id) || 0 })) as Channel[];
        const dmChans: Channel[] = allChannels
            .filter(c => c.dm_participant_ids)
            .map(c => ({ ...c, unread_count: unreadMap.get(c.id) || 0 })) as Channel[];

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

    // Mark a channel as read by upserting last_read_at in channel_members
    const markChannelAsRead = async (channelId: string) => {
        if (!user) return;

        const now = new Date().toISOString();

        const { error } = await supabase
            .from('channel_members')
            .upsert({
                channel_id: channelId,
                user_id: user.id,
                last_read_at: now,
                added_at: now
            }, {
                onConflict: 'channel_id,user_id'
            });

        if (error) {
            console.error('Error marking channel as read:', error);
        } else {
            // Optimistically update local state to clear the badge
            setChannels(prev => prev.map(c =>
                c.id === channelId ? { ...c, unread_count: 0 } : c
            ));
            setDmChannels(prev => prev.map(c =>
                c.id === channelId ? { ...c, unread_count: 0 } : c
            ));
        }
    };

    // Fetch owner info for non-staff users
    const fetchOwnerInfo = async () => {
        if (!hub) return;

        const { data, error } = await supabase
            .from('hub_members')
            .select(`
                user_id,
                profile:profiles (
                    full_name
                )
            `)
            .eq('hub_id', hub.id)
            .eq('role', 'owner')
            .single();

        if (error) {
            console.error('Error fetching owner info:', error);
        } else if (data) {
            setOwnerInfo({
                user_id: data.user_id,
                full_name: (data.profile as any)?.full_name || 'Hub Owner'
            });
        }
    };

    // Fetch anonymous reports for owner
    const fetchAnonymousReports = async () => {
        if (!hub) return;
        setLoadingReports(true);

        const { data, error } = await supabase
            .from('anonymous_reports')
            .select('*')
            .eq('hub_id', hub.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching anonymous reports:', error);
        } else {
            setAnonymousReports(data || []);
        }
        setLoadingReports(false);
    };

    // Mark a report as read
    const markReportAsRead = async (reportId: string) => {
        const { error } = await supabase
            .from('anonymous_reports')
            .update({ read_at: new Date().toISOString() })
            .eq('id', reportId);

        if (error) {
            console.error('Error marking report as read:', error);
        } else {
            setAnonymousReports(prev =>
                prev.map(r => r.id === reportId ? { ...r, read_at: new Date().toISOString() } : r)
            );
        }
    };

    // Delete a report
    const deleteReport = async (reportId: string) => {
        const { error } = await supabase
            .from('anonymous_reports')
            .delete()
            .eq('id', reportId);

        if (error) {
            console.error('Error deleting report:', error);
        } else {
            setAnonymousReports(prev => prev.filter(r => r.id !== reportId));
            if (selectedReport?.id === reportId) {
                setSelectedReport(null);
            }
        }
    };

    // Count unread reports
    const unreadReportsCount = anonymousReports.filter(r => !r.read_at).length;

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
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl">
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
                            onClick={() => {
                                setSelectedChannel(channel);
                                setViewingAnonymousReports(false);
                                if (channel.unread_count && channel.unread_count > 0) {
                                    markChannelAsRead(channel.id);
                                }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedChannel?.id === channel.id && !viewingAnonymousReports
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center min-w-0">
                                <Hash className="mr-2 h-4 w-4 opacity-50 flex-shrink-0" />
                                <span className="truncate">{channel.name}</span>
                            </div>
                            {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                <span className="ml-2 h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Group channels */}
                    {channels.filter(c => c.group_id).map((channel) => (
                        <button
                            key={channel.id}
                            onClick={() => {
                                setSelectedChannel(channel);
                                setViewingAnonymousReports(false);
                                if (channel.unread_count && channel.unread_count > 0) {
                                    markChannelAsRead(channel.id);
                                }
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                selectedChannel?.id === channel.id && !viewingAnonymousReports
                                    ? 'bg-white text-brand-600 shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <div className="flex items-center min-w-0">
                                <Users className="mr-2 h-4 w-4 opacity-50 flex-shrink-0" />
                                <span className="truncate">{channel.name}</span>
                            </div>
                            {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                <span className="ml-2 h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center flex-shrink-0">
                                    {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Direct Messages Section */}
                    <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Direct Messages</span>
                        <button
                            onClick={openNewDmModal}
                            className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-900"
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
                                onClick={() => {
                                    setSelectedChannel(channel);
                                    setViewingAnonymousReports(false);
                                    if (channel.unread_count && channel.unread_count > 0) {
                                        markChannelAsRead(channel.id);
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    selectedChannel?.id === channel.id && !viewingAnonymousReports
                                        ? 'bg-white text-brand-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center min-w-0">
                                    <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 mr-2 flex-shrink-0">
                                        {channel.dm_other_user?.full_name?.[0] || '?'}
                                    </div>
                                    <span className="truncate">{channel.dm_other_user?.full_name || 'Unknown'}</span>
                                </div>
                                {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                    <span className="ml-2 h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center flex-shrink-0">
                                        {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                    </span>
                                )}
                            </button>
                        ))
                    )}

                    {/* Anonymous Reports Section - For Owner */}
                    {isOwner && (
                        <>
                            <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <span>Anonymous Reports</span>
                            </div>
                            <button
                                onClick={() => {
                                    setViewingAnonymousReports(true);
                                    setSelectedChannel(null);
                                    setSelectedReport(null);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                    viewingAnonymousReports && !selectedReport
                                        ? 'bg-white text-purple-600 shadow-sm'
                                        : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <div className="flex items-center">
                                    <ShieldAlert className="mr-2 h-4 w-4 opacity-50" />
                                    <span>View Reports</span>
                                </div>
                                {unreadReportsCount > 0 && (
                                    <span className="bg-purple-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                        {unreadReportsCount}
                                    </span>
                                )}
                            </button>
                        </>
                    )}

                    {/* Submit Anonymous Report - For Non-Staff */}
                    {!isStaff && anonymousReportsEnabled && ownerInfo && (
                        <>
                            <div className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <span>Anonymous</span>
                            </div>
                            <button
                                onClick={() => setShowAnonymousReportModal(true)}
                                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-purple-600 hover:bg-purple-50"
                            >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                <span>Submit Report</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Anonymous Reports View - For Owner */}
                {viewingAnonymousReports && isOwner ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 mr-3">
                                <ShieldAlert className="h-4 w-4 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Anonymous Reports</h3>
                            <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                {anonymousReports.length} report{anonymousReports.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Reports List */}
                        <div className="flex-1 overflow-y-auto bg-slate-50">
                            {loadingReports ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                                </div>
                            ) : anonymousReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <div className="rounded-full bg-purple-100 p-4 mb-4">
                                        <ShieldAlert className="h-8 w-8 text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-slate-900">No anonymous reports</h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        When members submit anonymous reports, they'll appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200">
                                    {anonymousReports.map((report) => (
                                        <div
                                            key={report.id}
                                            className={`p-4 hover:bg-white transition-colors cursor-pointer ${
                                                !report.read_at ? 'bg-purple-50' : ''
                                            } ${selectedReport?.id === report.id ? 'bg-white ring-1 ring-purple-200' : ''}`}
                                            onClick={() => {
                                                setSelectedReport(report);
                                                if (!report.read_at) {
                                                    markReportAsRead(report.id);
                                                }
                                            }}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {!report.read_at && (
                                                            <span className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" />
                                                        )}
                                                        <span className="text-xs text-slate-500">
                                                            {format(new Date(report.created_at), 'MMM d, yyyy · h:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-slate-700 line-clamp-2">
                                                        {report.message}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {report.read_at && (
                                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                                            <Check className="h-3 w-3" />
                                                            Read
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (confirm('Delete this report?')) {
                                                                deleteReport(report.id);
                                                            }
                                                        }}
                                                        className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                        title="Delete report"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Report Detail */}
                        {selectedReport && (
                            <div className="border-t border-slate-200 p-6 bg-white">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-slate-500">
                                        Received {format(new Date(selectedReport.created_at), 'MMMM d, yyyy · h:mm a')}
                                    </span>
                                    {selectedReport.read_at && (
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            Marked as read
                                        </span>
                                    )}
                                </div>
                                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedReport.message}</p>
                                </div>
                                <p className="mt-3 text-xs text-slate-400">
                                    This report was submitted anonymously. You cannot reply to the sender.
                                </p>
                            </div>
                        )}
                    </>
                ) : selectedChannel ? (
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
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
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
                                                            <span className="text-xs text-slate-400">
                                                                {format(new Date(message.created_at), 'h:mm a')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-4 py-2 rounded-lg text-sm ${isMe
                                                            ? 'bg-mint-500 text-white rounded-tr-none'
                                                            : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'
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
                                    className="input flex-1"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
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
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">New Message</h3>
                            <button
                                onClick={() => setShowNewDmModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
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
                                    className="input w-full pl-10"
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

            {/* Anonymous Report Modal - For Non-Staff */}
            {hub && ownerInfo && (
                <AnonymousReportModal
                    isOpen={showAnonymousReportModal}
                    onClose={() => setShowAnonymousReportModal(false)}
                    hubId={hub.id}
                    ownerName={ownerInfo.full_name}
                />
            )}
        </div>
    );
}
