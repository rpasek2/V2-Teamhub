import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Send, Hash, MessageSquare, Users, Plus, X, Search, ShieldAlert, Check, Trash2, Loader2, UserPlus, Lock, Paperclip, Image, FileText, ThumbsUp, Heart, PartyPopper } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { AnonymousReportModal } from '../components/messages/AnonymousReportModal';
import { ImageGallery } from '../components/groups/attachments/ImageGallery';
import { FileList } from '../components/groups/attachments/FileList';
import { validateFile, generateSecureFileName, formatFileSize } from '../utils/fileValidation';
import type { MessageAttachment, FileAttachment, MessageReactionType } from '../types';

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
    attachments?: MessageAttachment[];
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
    const [hasMoreMessages, setHasMoreMessages] = useState(false);
    const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
    const MESSAGE_PAGE_SIZE = 50;
    const [loadingChannels, setLoadingChannels] = useState(true);

    // Attachment state
    const [pendingImages, setPendingImages] = useState<File[]>([]);
    const [pendingFiles, setPendingFiles] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    // Message reactions state
    const [messageReactions, setMessageReactions] = useState<Map<string, { like: number; heart: number; celebrate: number; userReaction: MessageReactionType | null }>>(new Map());

    // DM read receipt state
    const [otherUserLastRead, setOtherUserLastRead] = useState<string | null>(null);

    // New DM modal state
    const [showNewDmModal, setShowNewDmModal] = useState(false);
    const [hubMembers, setHubMembers] = useState<HubMemberOption[]>([]);
    const hubMemberMap = useMemo(() => {
        const map = new Map<string, HubMemberOption>();
        for (const m of hubMembers) map.set(m.user_id, m);
        return map;
    }, [hubMembers]);
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
            // Fetch DM read receipt if this is a DM channel
            if (selectedChannel.dm_participant_ids) {
                fetchDmReadReceipt(selectedChannel.id);
            } else {
                setOtherUserLastRead(null);
            }
            return () => {
                subscription.unsubscribe();
            };
        }
    }, [selectedChannel]);

    useEffect(() => {
        scrollToBottom();
        // Fetch reactions whenever messages change
        if (messages.length > 0) {
            fetchMessageReactions(messages.map(m => m.id));
        }
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
                // Mark as read so the unread badge clears on auto-select
                if (defaultChannel.unread_count && defaultChannel.unread_count > 0) {
                    markChannelAsRead(defaultChannel.id);
                }
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
        // Fetch most recent messages (descending), then reverse for display
        const { data, error } = await supabase
            .from('messages')
            .select('*, attachments, profiles(full_name, email)')
            .eq('channel_id', channelId)
            .order('created_at', { ascending: false })
            .range(0, MESSAGE_PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching messages:', error);
            return;
        }
        const fetched = data || [];
        setHasMoreMessages(fetched.length === MESSAGE_PAGE_SIZE);
        setMessages(fetched.reverse()); // Reverse to chronological order
    };

    const loadOlderMessages = async () => {
        if (!selectedChannel || loadingMoreMessages || !hasMoreMessages) return;
        setLoadingMoreMessages(true);

        const oldestMessage = messages[0];
        if (!oldestMessage) { setLoadingMoreMessages(false); return; }

        const { data, error } = await supabase
            .from('messages')
            .select('*, attachments, profiles(full_name, email)')
            .eq('channel_id', selectedChannel.id)
            .lt('created_at', oldestMessage.created_at)
            .order('created_at', { ascending: false })
            .range(0, MESSAGE_PAGE_SIZE - 1);

        if (error) {
            console.error('Error fetching older messages:', error);
            setLoadingMoreMessages(false);
            return;
        }

        const fetched = data || [];
        setHasMoreMessages(fetched.length === MESSAGE_PAGE_SIZE);
        setMessages(prev => [...fetched.reverse(), ...prev]);
        setLoadingMoreMessages(false);
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
                        .select('*, attachments, profiles(full_name, email)')
                        .eq('id', payload.new.id)
                        .single();

                    if (data) {
                        setMessages((prev) => [...prev, data]);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages',
                    filter: `channel_id=eq.${channelId}`,
                },
                (payload) => {
                    setMessages((prev) => prev.filter(m => m.id !== payload.old.id));
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'message_reactions',
                },
                () => {
                    // Re-fetch reactions on any change
                    setMessages(prev => {
                        if (prev.length > 0) fetchMessageReactions(prev.map(m => m.id));
                        return prev;
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'channel_members',
                    filter: `channel_id=eq.${channelId}`,
                },
                () => {
                    // Re-fetch DM read receipt when other user reads
                    fetchDmReadReceipt(channelId);
                }
            )
            .subscribe();
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 5 - pendingImages.length;
        const toAdd = files.slice(0, remaining);
        for (const file of toAdd) {
            const result = validateFile(file, 'postImage');
            if (!result.valid) {
                alert(result.error);
                return;
            }
        }
        const newPreviews = toAdd.map(f => URL.createObjectURL(f));
        setPendingImages(prev => [...prev, ...toAdd]);
        setImagePreviews(prev => [...prev, ...newPreviews]);
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 3 - pendingFiles.length;
        const toAdd = files.slice(0, remaining);
        for (const file of toAdd) {
            const result = validateFile(file, 'postFile');
            if (!result.valid) {
                alert(result.error);
                return;
            }
        }
        setPendingFiles(prev => [...prev, ...toAdd]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removePendingImage = (index: number) => {
        URL.revokeObjectURL(imagePreviews[index]);
        setPendingImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removePendingFile = (index: number) => {
        setPendingFiles(prev => prev.filter((_, i) => i !== index));
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const hasText = newMessage.trim().length > 0;
        const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;
        if ((!hasText && !hasAttachments) || !selectedChannel || !user || uploading) return;

        const content = newMessage.trim();
        const savedImages = [...pendingImages];
        const savedFiles = [...pendingFiles];
        const savedPreviews = [...imagePreviews];
        setNewMessage('');
        setShowAttachMenu(false);

        // Upload attachments if any
        const attachments: MessageAttachment[] = [];
        if (hasAttachments) {
            setUploading(true);
            try {
                // Upload images
                if (pendingImages.length > 0) {
                    const imageUrls: string[] = new Array(pendingImages.length);
                    await Promise.all(pendingImages.map(async (image, i) => {
                        const fileName = generateSecureFileName(image.name);
                        const filePath = `messages/${selectedChannel.id}/${fileName}`;
                        const { error: uploadErr } = await supabase.storage
                            .from('post-attachments')
                            .upload(filePath, image, { cacheControl: '3600', upsert: false });
                        if (uploadErr) throw uploadErr;
                        const { data: { publicUrl } } = supabase.storage
                            .from('post-attachments')
                            .getPublicUrl(filePath);
                        imageUrls[i] = publicUrl;
                    }));
                    attachments.push({ type: 'images', urls: imageUrls });
                }
                // Upload files
                if (pendingFiles.length > 0) {
                    const fileAttachments: FileAttachment[] = new Array(pendingFiles.length);
                    await Promise.all(pendingFiles.map(async (file, i) => {
                        const fileName = generateSecureFileName(file.name);
                        const filePath = `messages/${selectedChannel.id}/files/${fileName}`;
                        const { error: uploadErr } = await supabase.storage
                            .from('post-attachments')
                            .upload(filePath, file, { cacheControl: '3600', upsert: false });
                        if (uploadErr) throw uploadErr;
                        const { data: { publicUrl } } = supabase.storage
                            .from('post-attachments')
                            .getPublicUrl(filePath);
                        fileAttachments[i] = {
                            url: publicUrl,
                            name: file.name,
                            size: file.size,
                            mimeType: file.type,
                        };
                    }));
                    attachments.push({ type: 'files', files: fileAttachments });
                }
            } catch (err) {
                console.error('Error uploading attachments:', err);
                setNewMessage(content);
                setUploading(false);
                return;
            }
            // Revoke preview URLs and clear pending state
            imagePreviews.forEach(url => URL.revokeObjectURL(url));
            setPendingImages([]);
            setPendingFiles([]);
            setImagePreviews([]);
            setUploading(false);
        }

        const { error } = await supabase
            .from('messages')
            .insert([
                {
                    channel_id: selectedChannel.id,
                    user_id: user.id,
                    content: content,
                    ...(attachments.length > 0 ? { attachments } : {}),
                },
            ]);

        if (error) {
            console.error('Error sending message:', error);
            setNewMessage(content);
            // Restore attachments so user can retry
            if (hasAttachments) {
                setPendingImages(savedImages);
                setPendingFiles(savedFiles);
                setImagePreviews(savedPreviews);
            }
        }
    };

    const deleteMessage = async (messageId: string) => {
        if (!confirm('Delete this message?')) return;
        const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
        if (error) {
            console.error('Error deleting message:', error);
            return;
        }
        setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    // Fetch reactions for all visible messages
    const fetchMessageReactions = async (messageIds: string[]) => {
        if (messageIds.length === 0) return;
        const { data, error } = await supabase
            .from('message_reactions')
            .select('message_id, reaction_type, user_id')
            .in('message_id', messageIds);
        if (error) { console.error('Error fetching reactions:', error); return; }
        const map = new Map<string, { like: number; heart: number; celebrate: number; userReaction: MessageReactionType | null }>();
        data?.forEach(r => {
            const existing = map.get(r.message_id) || { like: 0, heart: 0, celebrate: 0, userReaction: null };
            existing[r.reaction_type as MessageReactionType]++;
            if (r.user_id === user?.id) existing.userReaction = r.reaction_type as MessageReactionType;
            map.set(r.message_id, existing);
        });
        setMessageReactions(map);
    };

    const handleMessageReaction = async (messageId: string, type: MessageReactionType) => {
        if (!user?.id) return;
        const current = messageReactions.get(messageId);
        const currentReaction = current?.userReaction || null;

        if (currentReaction === type) {
            // Remove reaction
            await supabase.from('message_reactions').delete()
                .eq('message_id', messageId).eq('user_id', user.id);
            setMessageReactions(prev => {
                const next = new Map(prev);
                const entry = { ...(next.get(messageId) || { like: 0, heart: 0, celebrate: 0, userReaction: null }) };
                entry[type] = Math.max(0, entry[type] - 1);
                entry.userReaction = null;
                next.set(messageId, entry);
                return next;
            });
        } else {
            if (currentReaction) {
                // Update existing
                await supabase.from('message_reactions').update({ reaction_type: type })
                    .eq('message_id', messageId).eq('user_id', user.id);
            } else {
                // Insert new
                await supabase.from('message_reactions').insert({
                    message_id: messageId, user_id: user.id, reaction_type: type
                });
            }
            setMessageReactions(prev => {
                const next = new Map(prev);
                const entry = { ...(next.get(messageId) || { like: 0, heart: 0, celebrate: 0, userReaction: null }) };
                if (currentReaction) entry[currentReaction] = Math.max(0, entry[currentReaction] - 1);
                entry[type] = entry[type] + 1;
                entry.userReaction = type;
                next.set(messageId, entry);
                return next;
            });
        }
    };

    // Fetch DM read receipt
    const fetchDmReadReceipt = async (channelId: string) => {
        const { data, error } = await supabase.rpc('get_dm_read_receipt', { p_channel_id: channelId });
        if (!error) setOtherUserLastRead(data);
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
            setHasMoreMessages(false);
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
        // channel_members.user_id FKs to auth.users, not profiles — fetch separately
        const { data: memberRows, error: memberError } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channelId);

        if (memberError) {
            console.error('Error fetching channel members:', memberError);
            return;
        }

        const userIds = (memberRows || []).map((m) => m.user_id);
        if (userIds.length === 0) {
            setExistingMembers([]);
            return;
        }

        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        if (profileError) {
            console.error('Error fetching member profiles:', profileError);
            return;
        }

        const members: HubMemberOption[] = (profiles || []).map((p) => ({
            user_id: p.id,
            full_name: p.full_name || 'Unknown',
            email: p.email || ''
        }));
        setExistingMembers(members);
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
                    const member = hubMemberMap.get(id);
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
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-surface shadow-sm ring-1 ring-line sm:rounded-xl">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-surface shadow-sm ring-1 ring-line sm:rounded-xl">
            {/* Sidebar */}
            <div className="w-64 border-r border-line bg-surface-alt flex flex-col">
                <div className="p-4 border-b border-line flex justify-between items-center">
                    <h2 className="font-semibold text-heading">Messages</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {/* Channels Section */}
                    <div className="px-3 py-2 text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
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
                                className="p-1 rounded hover:bg-surface-active transition-colors text-faint hover:text-heading"
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
                                        ? 'bg-surface text-accent-600 shadow-sm'
                                        : 'text-subtle hover:bg-surface-hover'
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
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-faint hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                        ? 'bg-surface text-accent-600 shadow-sm'
                                        : 'text-subtle hover:bg-surface-hover'
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
                                    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-faint hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/gc:opacity-100 transition-opacity"
                                    title="Delete channel"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Direct Messages Section */}
                    <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted uppercase tracking-wider flex items-center justify-between">
                        <span>Direct Messages</span>
                        <button
                            onClick={openNewDmModal}
                            className="p-1 rounded hover:bg-surface-active transition-colors text-faint hover:text-heading"
                            title="New message"
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {dmChannels.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-faint">No conversations yet</p>
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
                                            ? 'bg-surface text-accent-600 shadow-sm'
                                            : 'text-subtle hover:bg-surface-hover'
                                    }`}
                                >
                                    <div className="flex items-center min-w-0">
                                        <div className="h-6 w-6 rounded-full bg-surface-active flex items-center justify-center text-xs font-medium text-subtle mr-2 flex-shrink-0">
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
                                        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-faint hover:text-red-500 hover:bg-red-50 opacity-0 group-hover/dm:opacity-100 transition-opacity"
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
                            <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted uppercase tracking-wider">
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
                                        ? 'bg-surface text-purple-600 shadow-sm'
                                        : 'text-subtle hover:bg-surface-hover'
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
                            <div className="px-3 py-2 mt-4 text-xs font-semibold text-muted uppercase tracking-wider">
                                <span>Anonymous</span>
                            </div>
                            <button
                                onClick={() => setShowAnonymousReportModal(true)}
                                className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors text-purple-600 hover:bg-purple-500/10"
                            >
                                <ShieldAlert className="mr-2 h-4 w-4" />
                                <span>Submit Report</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 bg-surface">
                {/* Anonymous Reports View - For Owner */}
                {viewingAnonymousReports && isOwner ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-line flex items-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/15 mr-3">
                                <ShieldAlert className="h-4 w-4 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-medium text-heading">Anonymous Reports</h3>
                            <span className="ml-2 text-xs bg-purple-500/15 text-purple-600 px-2 py-0.5 rounded-full">
                                {anonymousReports.length} report{anonymousReports.length !== 1 ? 's' : ''}
                            </span>
                        </div>

                        {/* Reports List */}
                        <div className="flex-1 overflow-y-auto bg-surface-alt">
                            {loadingReports ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-8 w-8 animate-spin text-faint" />
                                </div>
                            ) : anonymousReports.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                                    <div className="rounded-full bg-purple-500/15 p-4 mb-4">
                                        <ShieldAlert className="h-8 w-8 text-purple-400" />
                                    </div>
                                    <h3 className="text-lg font-medium text-heading">No anonymous reports</h3>
                                    <p className="mt-1 text-sm text-muted">
                                        When members submit anonymous reports, they'll appear here.
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-line">
                                    {anonymousReports.map((report) => (
                                        <div
                                            key={report.id}
                                            className={`p-4 hover:bg-surface transition-colors cursor-pointer ${
                                                !report.read_at ? 'bg-purple-500/5' : ''
                                            } ${selectedReport?.id === report.id ? 'bg-surface ring-1 ring-purple-500/30' : ''}`}
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
                                                        <span className="text-xs text-muted">
                                                            {format(new Date(report.created_at), 'MMM d, yyyy · h:mm a')}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-body line-clamp-2">
                                                        {report.message}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {report.read_at && (
                                                        <span className="text-xs text-faint flex items-center gap-1">
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
                                                        className="p-1 rounded text-faint hover:text-red-500 hover:bg-red-500/10"
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
                            <div className="border-t border-line p-6 bg-surface">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs text-muted">
                                        Received {format(new Date(selectedReport.created_at), 'MMMM d, yyyy · h:mm a')}
                                    </span>
                                    {selectedReport.read_at && (
                                        <span className="text-xs text-green-600 flex items-center gap-1">
                                            <Check className="h-3 w-3" />
                                            Marked as read
                                        </span>
                                    )}
                                </div>
                                <div className="bg-surface-alt rounded-lg p-4 border border-line">
                                    <p className="text-sm text-body whitespace-pre-wrap">{selectedReport.message}</p>
                                </div>
                                <p className="mt-3 text-xs text-faint">
                                    This report was submitted anonymously. You cannot reply to the sender.
                                </p>
                            </div>
                        )}
                    </>
                ) : selectedChannel ? (
                    <>
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-line flex items-center justify-between">
                            <div className="flex items-center">
                                {selectedChannel.dm_participant_ids ? (
                                    <>
                                        <div className="h-8 w-8 rounded-full bg-surface-active flex items-center justify-center text-sm font-medium text-subtle mr-3">
                                            {selectedChannel.dm_other_user?.full_name?.[0] || '?'}
                                        </div>
                                        <h3 className="text-lg font-medium text-heading">
                                            {(selectedChannel.dm_other_users && selectedChannel.dm_other_users.length > 1)
                                                ? selectedChannel.dm_other_users.map(u => u.full_name).join(', ')
                                                : selectedChannel.dm_other_user?.full_name || 'Unknown'}
                                        </h3>
                                    </>
                                ) : (
                                    <>
                                        {selectedChannel.group_id ? (
                                            <Users className="mr-2 h-5 w-5 text-faint" />
                                        ) : selectedChannel.type === 'private' ? (
                                            <Lock className="mr-2 h-5 w-5 text-faint" />
                                        ) : (
                                            <Hash className="mr-2 h-5 w-5 text-faint" />
                                        )}
                                        <h3 className="text-lg font-medium text-heading">{selectedChannel.name}</h3>
                                        {selectedChannel.group_id && (
                                            <span className="ml-2 text-xs bg-surface-hover text-subtle px-2 py-0.5 rounded-full">
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
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-subtle hover:bg-surface-hover rounded-lg transition-colors"
                                    title="Manage members"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    <span>Members</span>
                                </button>
                            )}
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-surface-alt">
                            {/* Load older messages button */}
                            {hasMoreMessages && (
                                <div className="text-center">
                                    <button
                                        onClick={loadOlderMessages}
                                        disabled={loadingMoreMessages}
                                        className="text-sm text-accent-600 hover:text-accent-700 font-medium px-4 py-2 rounded-lg hover:bg-surface-hover transition-colors"
                                    >
                                        {loadingMoreMessages ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Loading...
                                            </span>
                                        ) : (
                                            'Load older messages'
                                        )}
                                    </button>
                                </div>
                            )}
                            {messages.length === 0 ? (
                                <div className="text-center py-12">
                                    <MessageSquare className="mx-auto h-12 w-12 text-faint" />
                                    <p className="mt-2 text-sm text-muted">
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
                                        <div key={message.id} className={`group/msg flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`flex max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                <div className={`flex-shrink-0 ${isMe ? 'ml-3' : 'mr-3'}`}>
                                                    {showHeader && (
                                                        <div className="h-8 w-8 rounded-full bg-surface-active flex items-center justify-center text-xs font-medium text-subtle">
                                                            {message.profiles?.full_name?.[0] || message.profiles?.email?.[0] || '?'}
                                                        </div>
                                                    )}
                                                    {!showHeader && <div className="w-8" />}
                                                </div>
                                                <div className="relative">
                                                    {showHeader && (
                                                        <div className={`flex items-baseline mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                            <span className="text-sm font-medium text-heading mr-2">
                                                                {message.profiles?.full_name || 'Unknown'}
                                                            </span>
                                                            <span className="text-xs text-faint">
                                                                {format(new Date(message.created_at), 'h:mm a')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div
                                                        className={`px-4 py-2 rounded-lg text-sm ${isMe
                                                            ? 'bg-accent-500 text-white rounded-tr-none'
                                                            : 'bg-surface text-body border border-line rounded-tl-none'
                                                            }`}
                                                    >
                                                        {message.content && <p>{message.content}</p>}
                                                        {message.attachments?.map((att, ai) => {
                                                            if (att.type === 'images') {
                                                                return (
                                                                    <div key={ai} className="mt-2 max-w-[300px]">
                                                                        <ImageGallery urls={att.urls} />
                                                                    </div>
                                                                );
                                                            }
                                                            if (att.type === 'files') {
                                                                return (
                                                                    <div key={ai} className={`mt-2 ${isMe ? '[&_a]:text-white [&_a:hover]:text-white/80' : ''}`}>
                                                                        <FileList files={att.files} />
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })}
                                                    </div>
                                                    {/* Hover actions: reactions + delete */}
                                                    <div className={`absolute -top-2 ${isMe ? 'left-0' : 'right-0'} flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity`}>
                                                        {(['like', 'heart', 'celebrate'] as MessageReactionType[]).map(type => (
                                                            <button
                                                                key={type}
                                                                onClick={() => handleMessageReaction(message.id, type)}
                                                                className={`p-1 rounded bg-surface border border-line shadow-sm transition-colors ${
                                                                    messageReactions.get(message.id)?.userReaction === type
                                                                        ? type === 'like' ? 'text-blue-600 bg-blue-50' : type === 'heart' ? 'text-pink-500 bg-pink-50' : 'text-amber-600 bg-amber-50'
                                                                        : 'text-faint hover:text-body'
                                                                }`}
                                                                title={type === 'like' ? 'Like' : type === 'heart' ? 'Love' : 'Celebrate'}
                                                            >
                                                                {type === 'like' && <ThumbsUp className="h-3 w-3" />}
                                                                {type === 'heart' && <Heart className="h-3 w-3" />}
                                                                {type === 'celebrate' && <PartyPopper className="h-3 w-3" />}
                                                            </button>
                                                        ))}
                                                        {isMe && (
                                                            <button
                                                                onClick={() => deleteMessage(message.id)}
                                                                className="p-1 rounded bg-surface border border-line shadow-sm hover:bg-error-50 hover:border-error-200 hover:text-error-600 text-faint"
                                                                title="Delete message"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {/* Reaction pills */}
                                                    {(() => {
                                                        const r = messageReactions.get(message.id);
                                                        if (!r || (r.like === 0 && r.heart === 0 && r.celebrate === 0)) return null;
                                                        return (
                                                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                                {r.like > 0 && (
                                                                    <button onClick={() => handleMessageReaction(message.id, 'like')} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border ${r.userReaction === 'like' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-surface border-line text-muted hover:bg-surface-hover'}`}>
                                                                        <ThumbsUp className="h-3 w-3" /> {r.like}
                                                                    </button>
                                                                )}
                                                                {r.heart > 0 && (
                                                                    <button onClick={() => handleMessageReaction(message.id, 'heart')} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border ${r.userReaction === 'heart' ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-surface border-line text-muted hover:bg-surface-hover'}`}>
                                                                        <Heart className="h-3 w-3" /> {r.heart}
                                                                    </button>
                                                                )}
                                                                {r.celebrate > 0 && (
                                                                    <button onClick={() => handleMessageReaction(message.id, 'celebrate')} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border ${r.userReaction === 'celebrate' ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-surface border-line text-muted hover:bg-surface-hover'}`}>
                                                                        <PartyPopper className="h-3 w-3" /> {r.celebrate}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    {/* DM Read receipt */}
                                                    {isMe && selectedChannel?.dm_participant_ids && otherUserLastRead &&
                                                        new Date(message.created_at) <= new Date(otherUserLastRead) &&
                                                        (index === messages.length - 1 || messages[index + 1].user_id !== user?.id ||
                                                            new Date(messages[index + 1].created_at) > new Date(otherUserLastRead)) && (
                                                        <div className="flex justify-end mt-0.5">
                                                            <span className="text-[11px] text-muted flex items-center gap-1">
                                                                <Check className="h-3 w-3" /> Seen
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-line bg-surface">
                            {/* Attachment preview strip */}
                            {(pendingImages.length > 0 || pendingFiles.length > 0) && (
                                <div className="px-4 pt-3 flex flex-wrap gap-2">
                                    {pendingImages.map((_, i) => (
                                        <div key={i} className="relative group">
                                            <img
                                                src={imagePreviews[i]}
                                                alt=""
                                                className="h-16 w-16 object-cover rounded-lg border border-line"
                                            />
                                            <button
                                                onClick={() => removePendingImage(i)}
                                                className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-error-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {pendingFiles.map((file, i) => (
                                        <div key={i} className="relative group flex items-center gap-2 bg-surface-hover rounded-lg px-3 py-2 text-xs">
                                            <FileText className="h-4 w-4 text-muted flex-shrink-0" />
                                            <span className="text-body truncate max-w-[120px]">{file.name}</span>
                                            <span className="text-faint">{formatFileSize(file.size)}</span>
                                            <button
                                                onClick={() => removePendingFile(i)}
                                                className="ml-1 text-faint hover:text-error-600"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={sendMessage} className="flex items-center gap-2 p-4">
                                {/* Hidden file inputs */}
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={handleImageSelect}
                                />
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                                    multiple
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />

                                {/* Attach button */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                                        className="p-2 text-faint hover:text-subtle hover:bg-surface-hover rounded-lg transition-colors"
                                        title="Attach files"
                                    >
                                        <Paperclip className="h-5 w-5" />
                                    </button>
                                    {showAttachMenu && (
                                        <div className="absolute bottom-full left-0 mb-2 bg-surface border border-line rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                                            <button
                                                type="button"
                                                onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-body hover:bg-surface-hover"
                                                disabled={pendingImages.length >= 5}
                                            >
                                                <Image className="h-4 w-4 text-blue-500" />
                                                Photos {pendingImages.length > 0 && `(${pendingImages.length}/5)`}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-body hover:bg-surface-hover"
                                                disabled={pendingFiles.length >= 3}
                                            >
                                                <FileText className="h-4 w-4 text-red-500" />
                                                Files {pendingFiles.length > 0 && `(${pendingFiles.length}/3)`}
                                            </button>
                                        </div>
                                    )}
                                </div>

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
                                    disabled={uploading}
                                />
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && pendingImages.length === 0 && pendingFiles.length === 0) || uploading}
                                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                            <MessageSquare className="mx-auto h-12 w-12 text-faint" />
                            <h3 className="mt-2 text-sm font-semibold text-heading">No conversation selected</h3>
                            <p className="mt-1 text-sm text-muted">Select a channel or start a new message.</p>
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
                    <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-line">
                        <div className="flex items-center justify-between border-b border-line px-6 py-4">
                            <h3 className="text-lg font-semibold text-heading">New Message</h3>
                            <button
                                onClick={() => setShowNewDmModal(false)}
                                className="rounded-full p-1 text-faint hover:bg-surface-hover hover:text-heading"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
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
                                    <p className="text-center py-4 text-sm text-muted">Loading...</p>
                                ) : filteredMembers.length === 0 ? (
                                    <p className="text-center py-4 text-sm text-muted">No members found</p>
                                ) : (
                                    <div className="space-y-1">
                                        {filteredMembers.map((member) => (
                                            <button
                                                key={member.user_id}
                                                onClick={() => startDmWithUser(member.user_id)}
                                                className="w-full flex items-center px-3 py-2 rounded-md hover:bg-surface-hover transition-colors"
                                            >
                                                <div className="h-8 w-8 rounded-full bg-surface-active flex items-center justify-center text-sm font-medium text-subtle mr-3">
                                                    {member.full_name[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-medium text-heading">{member.full_name}</p>
                                                    <p className="text-xs text-muted">{member.email}</p>
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
                    <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-line">
                        <div className="flex items-center justify-between border-b border-line px-6 py-4">
                            <h3 className="text-lg font-semibold text-heading">New Channel</h3>
                            <button
                                onClick={() => setShowNewChannelModal(false)}
                                className="rounded-full p-1 text-faint hover:bg-surface-hover hover:text-heading"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={createNewChannel} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-body mb-1">Channel name</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
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
                                <label className="block text-sm font-medium text-body mb-1">
                                    Add members <span className="text-faint font-normal">(optional)</span>
                                </label>
                                <p className="text-xs text-muted mb-2">
                                    Leave empty for a hub-wide channel visible to everyone, or select members for a private channel.
                                </p>

                                {/* Selected members chips */}
                                {selectedMemberIds.size > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {Array.from(selectedMemberIds).map(id => {
                                            const member = hubMemberMap.get(id);
                                            if (!member) return null;
                                            return (
                                                <span
                                                    key={id}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-700"
                                                >
                                                    {member.full_name}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleMemberSelection(id)}
                                                        className="hover:text-accent-900"
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
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                                    <input
                                        type="text"
                                        value={channelMemberSearch}
                                        onChange={(e) => setChannelMemberSearch(e.target.value)}
                                        placeholder="Search members..."
                                        className="input w-full pl-10"
                                    />
                                </div>

                                {/* Member list */}
                                <div className="mt-2 max-h-48 overflow-y-auto border border-line rounded-lg divide-y divide-line">
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
                                                        isSelected ? 'bg-accent-50' : 'hover:bg-surface-hover'
                                                    }`}
                                                >
                                                    <div className="h-7 w-7 rounded-full bg-surface-active flex items-center justify-center text-xs font-medium text-subtle mr-2.5 flex-shrink-0">
                                                        {member.full_name[0]}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-heading truncate">{member.full_name}</p>
                                                    </div>
                                                    {isSelected && (
                                                        <Check className="h-4 w-4 text-accent-600 flex-shrink-0" />
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
                    <div className="relative w-full max-w-md bg-surface rounded-xl shadow-2xl border border-line">
                        <div className="flex items-center justify-between border-b border-line px-6 py-4">
                            <h3 className="text-lg font-semibold text-heading">Channel Members</h3>
                            <button
                                onClick={() => setShowManageMembersModal(false)}
                                className="rounded-full p-1 text-faint hover:bg-surface-hover hover:text-heading"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {/* Current members */}
                            <div>
                                <label className="block text-sm font-medium text-body mb-2">
                                    Current members ({existingMembers.length})
                                </label>
                                <div className="max-h-40 overflow-y-auto border border-line rounded-lg divide-y divide-line">
                                    {existingMembers.map((member) => (
                                        <div key={member.user_id} className="flex items-center justify-between px-3 py-2">
                                            <div className="flex items-center min-w-0">
                                                <div className="h-7 w-7 rounded-full bg-surface-active flex items-center justify-center text-xs font-medium text-subtle mr-2.5 flex-shrink-0">
                                                    {member.full_name[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-heading truncate">{member.full_name}</p>
                                                    {member.user_id === user?.id && (
                                                        <span className="text-xs text-faint">You</span>
                                                    )}
                                                </div>
                                            </div>
                                            {member.user_id !== user?.id && (
                                                <button
                                                    onClick={() => removeMemberFromChannel(selectedChannel.id, member.user_id)}
                                                    className="p-1 rounded text-faint hover:text-red-500 hover:bg-red-50 transition-colors"
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
                                <label className="block text-sm font-medium text-body mb-1">Add members</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint" />
                                    <input
                                        type="text"
                                        value={manageMemberSearch}
                                        onChange={(e) => setManageMemberSearch(e.target.value)}
                                        placeholder="Search members..."
                                        className="input w-full pl-10"
                                    />
                                </div>
                                <div className="mt-2 max-h-40 overflow-y-auto border border-line rounded-lg divide-y divide-line">
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
                                                className="w-full flex items-center px-3 py-2 text-left hover:bg-surface-hover transition-colors"
                                            >
                                                <div className="h-7 w-7 rounded-full bg-surface-active flex items-center justify-center text-xs font-medium text-subtle mr-2.5 flex-shrink-0">
                                                    {member.full_name[0]}
                                                </div>
                                                <p className="text-sm font-medium text-heading truncate flex-1">{member.full_name}</p>
                                                <Plus className="h-4 w-4 text-faint" />
                                            </button>
                                        ))}
                                    {hubMembers.filter(m =>
                                        !existingMembers.some(em => em.user_id === m.user_id) &&
                                        (m.full_name.toLowerCase().includes(manageMemberSearch.toLowerCase()) ||
                                         m.email.toLowerCase().includes(manageMemberSearch.toLowerCase()))
                                    ).length === 0 && (
                                        <p className="px-3 py-3 text-sm text-muted text-center">No more members to add</p>
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
