import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Send, Hash, MessageSquare, Users, Plus, X, Search, ShieldAlert, Check, Trash2, Loader2, UserPlus, Lock } from 'lucide-react';
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

interface DmUserInfo {
    id: string;
    full_name: string;
    email: string;
}

interface Channel {
    id: string;
    name: string;
    type: 'public' | 'private';
    group_id?: string | null;
    dm_participant_ids?: string[] | null;
    dm_other_user?: DmUserInfo;
    dm_other_users?: DmUserInfo[];
    created_by?: string | null;
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
    const { isOwner, isStaff, isAthlete } = useRoleChecks();
    const location = useLocation();
    const [channels, setChannels] = useState<Channel[]>([]);
    const [dmChannels, setDmChannels] = useState<Channel[]>([]);
    const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [loadingChannels, setLoadingChannels] = useState(true);

    // New DM modal state
    const [showNewDmModal, setShowNewDmModal] = useState(false);
    const [hubMembers, setHubMembers] = useState<HubMemberOption[]>([]);
    const [dmSearchTerm, setDmSearchTerm] = useState('');
    const [loadingMembers, setLoadingMembers] = useState(false);

    // New channel modal state
    const [showNewChannelModal, setShowNewChannelModal] = useState(false);
    const [newChannelName, setNewChannelName] = useState('');
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [channelMemberSearch, setChannelMemberSearch] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());

    // Manage members modal state
    const [showManageMembersModal, setShowManageMembersModal] = useState(false);
    const [existingMembers, setExistingMembers] = useState<HubMemberOption[]>([]);
    const [manageMemberSearch, setManageMemberSearch] = useState('');

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
        setLoadingChannels(true);

        // Fetch all channels (RLS will filter) and unread counts in parallel
        const [channelsResult, unreadResult] = await Promise.all([
            supabase
                .from('channels')
                .select('id, name, type, group_id, dm_participant_ids, created_by')
                .eq('hub_id', hub.id)
                .order('name'),
            supabase.rpc('get_channel_unread_counts', {
                p_user_id: user.id,
                p_hub_id: hub.id
            })
        ]);

        if (channelsResult.error) {
            console.error('Error fetching channels:', channelsResult.error);
            setLoadingChannels(false);
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

        // For DM channels, fetch all other users' profiles
        if (dmChans.length > 0) {
            const otherUserIdSet = new Set<string>();
            dmChans.forEach(c => {
                const participants = c.dm_participant_ids || [];
                participants.forEach((id: string) => {
                    if (id !== user.id) otherUserIdSet.add(id);
                });
            });
            const otherUserIds = Array.from(otherUserIdSet);

            if (otherUserIds.length > 0) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, full_name, email')
                    .in('id', otherUserIds);

                // Attach profile info to DM channels
                dmChans.forEach(c => {
                    const participants = c.dm_participant_ids || [];
                    const otherIds = participants.filter((id: string) => id !== user.id);
                    const otherProfiles = otherIds
                        .map(id => {
                            const profile = profiles?.find(p => p.id === id);
                            return profile ? { id: profile.id, full_name: profile.full_name || profile.email, email: profile.email } : null;
                        })
                        .filter((p: DmUserInfo | null): p is DmUserInfo => p !== null);

                    c.dm_other_users = otherProfiles;
                    c.dm_other_user = otherProfiles[0] || undefined;
                });
            }
        }

        setChannels(regularChannels);
        setDmChannels(dmChans);

        // Check for incoming channel ID from navigation state (e.g., "Message" button on profiles)
        const incomingChannelId = (location.state as { selectedChannelId?: string })?.selectedChannelId;

        if (incomingChannelId) {
            const allChans = [...regularChannels, ...dmChans];
            const target = allChans.find(c => c.id === incomingChannelId);
            if (target) {
                setSelectedChannel(target);
                // Clear the navigation state so refreshing doesn't re-select
                window.history.replaceState({}, '');
                return;
            }
        }

        // Select default channel if none selected
        if (!selectedChannel) {
            const defaultChannel = regularChannels.find(c => !c.group_id) || regularChannels[0] || dmChans[0];
            if (defaultChannel) {
                setSelectedChannel(defaultChannel);
            } else if (regularChannels.length === 0 && dmChans.length === 0) {
                createDefaultChannel();
            }
        }
        setLoadingChannels(false);
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

    // Delete a channel (DM or regular)
    const deleteChannel = async (channelId: string) => {
        if (!confirm('Delete this conversation? All messages will be permanently removed.')) return;

        const { error } = await supabase
            .from('channels')
            .delete()
            .eq('id', channelId);

        if (error) {
            console.error('Error deleting channel:', error);
            return;
        }

        // Clear selection and refresh
        if (selectedChannel?.id === channelId) {
            setSelectedChannel(null);
            setMessages([]);
        }
        setChannels(prev => prev.filter(c => c.id !== channelId));
        setDmChannels(prev => prev.filter(c => c.id !== channelId));
    };

    const toggleMemberSelection = (userId: string) => {
        setSelectedMemberIds(prev => {
            const next = new Set(prev);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    // Create a new channel
    const createNewChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hub || !user || !newChannelName.trim()) return;
        setCreatingChannel(true);

        const name = newChannelName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '');
        if (!name || name.length < 2 || name.length > 50) {
            setCreatingChannel(false);
            return;
        }
        const isPrivate = selectedMemberIds.size > 0;
        const { data, error } = await supabase
            .from('channels')
            .insert([{ hub_id: hub.id, name, created_by: user.id, type: isPrivate ? 'private' : 'public' }])
            .select()
            .single();

        if (error) {
            console.error('Error creating channel:', error);
        } else if (data) {
            // Add members if private
            if (isPrivate) {
                const now = new Date().toISOString();
                const memberRows = [user.id, ...selectedMemberIds].map(uid => ({
                    channel_id: data.id,
                    user_id: uid,
                    added_at: now,
                    last_read_at: now
                }));
                const { error: membersError } = await supabase
                    .from('channel_members')
                    .insert(memberRows);
                if (membersError) console.error('Error adding channel members:', membersError);
            }
            setChannels(prev => [...prev, data]);
            setSelectedChannel(data);
            setViewingAnonymousReports(false);
        }

        setCreatingChannel(false);
        setShowNewChannelModal(false);
        setNewChannelName('');
        setSelectedMemberIds(new Set());
    };

    // Add members to an existing channel
    const addMembersToChannel = async (channelId: string, memberIds: string[]) => {
        const now = new Date().toISOString();
        const memberRows = memberIds.map(uid => ({
            channel_id: channelId,
            user_id: uid,
            added_at: now,
            last_read_at: now
        }));
        const { error } = await supabase
            .from('channel_members')
            .upsert(memberRows, { onConflict: 'channel_id,user_id' });
        if (error) console.error('Error adding members:', error);
    };

    // Remove a member from a channel
    const removeMemberFromChannel = async (channelId: string, userId: string) => {
        const { error } = await supabase
            .from('channel_members')
            .delete()
            .eq('channel_id', channelId)
            .eq('user_id', userId);
        if (error) {
            console.error('Error removing member:', error);
        } else {
            setExistingMembers(prev => prev.filter(m => m.user_id !== userId));
        }
    };

    // Fetch existing members of a channel
    const fetchExistingMembers = async (channelId: string) => {
        const { data, error } = await supabase
            .from('channel_members')
            .select(`
                user_id,
                profile:profiles (
                    full_name,
                    email
                )
            `)
            .eq('channel_id', channelId);

        if (error) {
            console.error('Error fetching channel members:', error);
        } else {
            const members: HubMemberOption[] = (data || []).map((m) => {
                const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                return {
                    user_id: m.user_id,
                    full_name: profile?.full_name || 'Unknown',
                    email: profile?.email || ''
                };
            });
            setExistingMembers(members);
        }
    };

    // Open manage members modal
    const openManageMembersModal = () => {
        if (!selectedChannel) return;
        setShowManageMembersModal(true);
        setManageMemberSearch('');
        fetchExistingMembers(selectedChannel.id);
        fetchHubMembers();
    };

    // Mark a channel as read via RPC (bypasses RLS upsert issues)
    const markChannelAsRead = async (channelId: string) => {
        if (!user) return;

        const { error } = await supabase.rpc('mark_channel_read', {
            p_channel_id: channelId,
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
                full_name: (Array.isArray(data.profile) ? data.profile[0]?.full_name : (data.profile as { full_name?: string })?.full_name) || 'Hub Owner'
            });
        }
    };

    // Fetch anonymous reports for owner
    const fetchAnonymousReports = async () => {
        if (!hub) return;
        setLoadingReports(true);

        const { data, error } = await supabase
            .from('anonymous_reports')
            .select('id, hub_id, message, read_at, created_at')
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
            const members: HubMemberOption[] = (data || []).map((m) => {
                const profile = Array.isArray(m.profile) ? m.profile[0] : m.profile;
                return {
                    user_id: m.user_id,
                    full_name: profile?.full_name || 'Unknown',
                    email: profile?.email || ''
                };
            });
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
            .select('id, name, type, group_id, dm_participant_ids, created_by')
            .eq('id', channelId)
            .single();

        if (channelData) {
            // Get all other users' profiles
            const participants = channelData.dm_participant_ids || [];
            const otherIds = participants.filter((id: string) => id !== user.id);
            const otherProfiles: DmUserInfo[] = otherIds
                .map((id: string) => {
                    const member = hubMembers.find(m => m.user_id === id);
                    return member ? { id: member.user_id, full_name: member.full_name, email: member.email } : null;
                })
                .filter((p: DmUserInfo | null): p is DmUserInfo => p !== null);

            const dmChannel: Channel = {
                ...channelData,
                dm_other_users: otherProfiles,
                dm_other_user: otherProfiles[0] || undefined
            };
            setSelectedChannel(dmChannel);
        }

        setShowNewDmModal(false);
    };

    const filteredMembers = hubMembers.filter(m =>
        m.full_name.toLowerCase().includes(dmSearchTerm.toLowerCase()) ||
        m.email.toLowerCase().includes(dmSearchTerm.toLowerCase())
    );

    if (loadingChannels) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-white shadow-sm ring-1 ring-slate-200 sm:rounded-xl">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
        );
    }

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
                        {!isAthlete && (
                            <button
                                onClick={() => {
                                    setShowNewChannelModal(true);
                                    setNewChannelName('');
                                    setSelectedMemberIds(new Set());
                                    setChannelMemberSearch('');
                                    fetchHubMembers();
                                }}
                                className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-900"
                                title="New channel"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Hub-wide channels */}
                    {channels.filter(c => !c.group_id).map((channel) => (
                        <div key={channel.id} className="group relative">
                            <button
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
                                    {channel.type === 'private' ? (
                                        <Lock className="mr-2 h-4 w-4 opacity-50 flex-shrink-0" />
                                    ) : (
                                        <Hash className="mr-2 h-4 w-4 opacity-50 flex-shrink-0" />
                                    )}
                                    <span className="truncate">{channel.name}</span>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                        <span className="h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center">
                                            {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                        </span>
                                    )}
                                </div>
                            </button>
                            {isStaff && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteChannel(channel.id); }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete channel"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Group channels */}
                    {channels.filter(c => c.group_id).map((channel) => (
                        <div key={channel.id} className="group/gc relative">
                            <button
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
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                        <span className="h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center">
                                            {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                        </span>
                                    )}
                                </div>
                            </button>
                            {isStaff && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); deleteChannel(channel.id); }}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/gc:opacity-100 transition-opacity"
                                    title="Delete channel"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
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
                            <div key={channel.id} className="group/dm relative">
                                <button
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
                                        <span className="truncate">
                                            {(channel.dm_other_users && channel.dm_other_users.length > 1)
                                                ? channel.dm_other_users.map(u => u.full_name).join(', ')
                                                : channel.dm_other_user?.full_name || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {channel.unread_count !== undefined && channel.unread_count > 0 && (
                                            <span className="h-5 min-w-5 px-1.5 text-xs font-semibold text-white bg-error-500 rounded-full flex items-center justify-center">
                                                {channel.unread_count > 99 ? '99+' : channel.unread_count}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {user && channel.dm_participant_ids?.includes(user.id) && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); deleteChannel(channel.id); }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/dm:opacity-100 transition-opacity"
                                        title="Delete conversation"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
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
                        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center">
                                {selectedChannel.dm_participant_ids ? (
                                    <>
                                        <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600 mr-3">
                                            {selectedChannel.dm_other_user?.full_name?.[0] || '?'}
                                        </div>
                                        <h3 className="text-lg font-medium text-slate-900">
                                            {(selectedChannel.dm_other_users && selectedChannel.dm_other_users.length > 1)
                                                ? selectedChannel.dm_other_users.map(u => u.full_name).join(', ')
                                                : selectedChannel.dm_other_user?.full_name || 'Unknown'}
                                        </h3>
                                    </>
                                ) : (
                                    <>
                                        {selectedChannel.group_id ? (
                                            <Users className="mr-2 h-5 w-5 text-slate-400" />
                                        ) : selectedChannel.type === 'private' ? (
                                            <Lock className="mr-2 h-5 w-5 text-slate-400" />
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
                            {selectedChannel.type === 'private'
                                && !selectedChannel.dm_participant_ids
                                && (selectedChannel.created_by === user?.id || isStaff) && (
                                <button
                                    onClick={openManageMembersModal}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                    title="Manage members"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span>Members</span>
                                </button>
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
                                            ? `Message ${(selectedChannel.dm_other_users && selectedChannel.dm_other_users.length > 1)
                                                ? selectedChannel.dm_other_users.map(u => u.full_name).join(', ')
                                                : selectedChannel.dm_other_user?.full_name || 'user'}`
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
            {showNewDmModal && createPortal(
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
                </div>,
                document.body
            )}

            {/* New Channel Modal */}
            {showNewChannelModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setShowNewChannelModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">New Channel</h3>
                            <button
                                onClick={() => setShowNewChannelModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={createNewChannel} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Channel name</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={newChannelName}
                                        onChange={(e) => setNewChannelName(e.target.value)}
                                        placeholder="e.g. announcements"
                                        className="input w-full pl-10"
                                        maxLength={50}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Add members <span className="text-slate-400 font-normal">(optional)</span>
                                </label>
                                <p className="text-xs text-slate-500 mb-2">
                                    Leave empty for a hub-wide channel visible to everyone, or select members for a private channel.
                                </p>

                                {/* Selected members chips */}
                                {selectedMemberIds.size > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {Array.from(selectedMemberIds).map(id => {
                                            const member = hubMembers.find(m => m.user_id === id);
                                            if (!member) return null;
                                            return (
                                                <span
                                                    key={id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700"
                                                >
                                                    {member.full_name}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMemberSelection(id)}
                                                        className="hover:text-brand-900"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={channelMemberSearch}
                                        onChange={(e) => setChannelMemberSearch(e.target.value)}
                                        placeholder="Search members..."
                                        className="input w-full pl-10"
                                    />
                                </div>

                                {/* Member list */}
                                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {hubMembers
                                        .filter(m =>
                                            m.full_name.toLowerCase().includes(channelMemberSearch.toLowerCase()) ||
                                            m.email.toLowerCase().includes(channelMemberSearch.toLowerCase())
                                        )
                                        .map((member) => {
                                            const isSelected = selectedMemberIds.has(member.user_id);
                                            return (
                                                <button
                                                    key={member.user_id}
                                                    type="button"
                                                    onClick={() => toggleMemberSelection(member.user_id)}
                                                    className={`w-full flex items-center px-3 py-2 text-left transition-colors ${
                                                        isSelected ? 'bg-brand-50' : 'hover:bg-slate-50'
                                                    }`}
                                                >
                                                    <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 mr-2.5 flex-shrink-0">
                                                        {member.full_name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 truncate">{member.full_name}</p>
                                                    </div>
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 text-brand-600 flex-shrink-0" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowNewChannelModal(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newChannelName.trim() || creatingChannel}
                                    className="btn-primary disabled:opacity-50"
                                >
                                    {creatingChannel ? 'Creating...' : selectedMemberIds.size > 0 ? 'Create Private Channel' : 'Create Channel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* Manage Members Modal */}
            {showManageMembersModal && selectedChannel && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setShowManageMembersModal(false)}
                    />
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                            <h3 className="text-lg font-semibold text-slate-900">Channel Members</h3>
                            <button
                                onClick={() => setShowManageMembersModal(false)}
                                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Current members */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Current members ({existingMembers.length})
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {existingMembers.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between px-3 py-2">
                                            <div className="flex items-center min-w-0">
                                                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 mr-2.5 flex-shrink-0">
                                                    {member.full_name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{member.full_name}</p>
                                                    {member.user_id === user?.id && (
                                                        <span className="text-xs text-slate-400">You</span>
                                                    )}
                                                </div>
                                            </div>
                                            {member.user_id !== user?.id && (
                                                <button
                                                    onClick={() => removeMemberFromChannel(selectedChannel.id, member.user_id)}
                                                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    title="Remove member"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Add new members */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Add members</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        value={manageMemberSearch}
                                        onChange={(e) => setManageMemberSearch(e.target.value)}
                                        placeholder="Search members..."
                                        className="input w-full pl-10"
                                    />
                                </div>
                                <div className="mt-2 max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {hubMembers
                                        .filter(m =>
                                            !existingMembers.some(em => em.user_id === m.user_id) &&
                                            (m.full_name.toLowerCase().includes(manageMemberSearch.toLowerCase()) ||
                                             m.email.toLowerCase().includes(manageMemberSearch.toLowerCase()))
                                        )
                                        .map((member) => (
                                            <button
                                                key={member.user_id}
                                                onClick={async () => {
                                                    await addMembersToChannel(selectedChannel.id, [member.user_id]);
                                                    setExistingMembers(prev => [...prev, member]);
                                                }}
                                                className="w-full flex items-center px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="h-7 w-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600 mr-2.5 flex-shrink-0">
                                                    {member.full_name[0]}
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 truncate flex-1">{member.full_name}</p>
                                                <Plus className="h-4 w-4 text-slate-400" />
                                            </button>
                                        ))}
                                    {hubMembers.filter(m =>
                                        !existingMembers.some(em => em.user_id === m.user_id) &&
                                        (m.full_name.toLowerCase().includes(manageMemberSearch.toLowerCase()) ||
                                         m.email.toLowerCase().includes(manageMemberSearch.toLowerCase()))
                                    ).length === 0 && (
                                        <p className="px-3 py-3 text-sm text-slate-500 text-center">No more members to add</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
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
