import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Keyboard,
  Animated,
  Image,
  ScrollView,
  ActionSheetIOS,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Send, Hash, User, Plus, X, FileText, ThumbsUp, Heart, PartyPopper, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useHubStore } from '../../src/stores/hubStore';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

interface FileAttachment {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

type MessageAttachment =
  | { type: 'images'; urls: string[] }
  | { type: 'files'; files: FileAttachment[] };

interface PendingFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
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

type MessageReactionType = 'like' | 'heart' | 'celebrate';

interface Channel {
  id: string;
  name: string;
  type: 'public' | 'private';
  dm_participant_ids?: string[] | null;
  dm_other_user?: {
    id: string;
    full_name: string;
  };
}

export default function ChatScreen() {
  const { t, isDark } = useTheme();
  const { channelId } = useLocalSearchParams<{ channelId: string }>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((state) => state.user);
  const currentHub = useHubStore((state) => state.currentHub);
  const fetchNotificationCounts = useNotificationStore((state) => state.fetchNotificationCounts);
  const flatListRef = useRef<FlatList>(null);

  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pendingImages, setPendingImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [messageReactions, setMessageReactions] = useState<Map<string, { like: number; heart: number; celebrate: number; userReaction: MessageReactionType | null }>>(new Map());
  const [otherUserLastRead, setOtherUserLastRead] = useState<string | null>(null);

  // Keyboard height animation
  const keyboardHeight = useRef(new Animated.Value(0)).current;

  // Listen for keyboard show/hide events
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const keyboardShowListener = Keyboard.addListener(showEvent, (e) => {
      // Calculate height: on Android add extra for the suggestion toolbar (GIF, autocomplete, etc.)
      const androidToolbarPadding = Platform.OS === 'android' ? 20 : 0;
      const baseHeight = e.endCoordinates.height;
      const adjustedHeight = Platform.OS === 'ios'
        ? baseHeight - insets.bottom
        : baseHeight + androidToolbarPadding;

      Animated.timing(keyboardHeight, {
        toValue: adjustedHeight > 0 ? adjustedHeight : baseHeight,
        duration: Platform.OS === 'ios' ? e.duration : 150,
        useNativeDriver: false,
      }).start();
      // No manual scroll needed — inverted FlatList handles this
    });

    const keyboardHideListener = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardHeight, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [insets.bottom]);

  // Fetch channel info
  useEffect(() => {
    if (channelId) {
      fetchChannel();
      fetchMessages();
      markChannelAsRead();

      // Subscribe to new messages
      const subscription = supabase
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
            // Fetch the full message with profile
            const { data } = await supabase
              .from('messages')
              .select('*, attachments, profiles(full_name, email)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === data.id)) return prev;
                return [data, ...prev];
              });
              // Mark as read since user is viewing
              markChannelAsRead();
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
            fetchDmReadReceipt(channelId);
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [channelId]);

  // Fetch reactions when messages change
  useEffect(() => {
    if (messages.length > 0) {
      fetchMessageReactions(messages.map(m => m.id));
    }
  }, [messages.length]);

  // Fetch DM read receipt when channel loads
  useEffect(() => {
    if (channel?.dm_participant_ids && channelId) {
      fetchDmReadReceipt(channelId);
    } else {
      setOtherUserLastRead(null);
    }
  }, [channel]);

  // Update header title when channel loads
  useEffect(() => {
    if (channel) {
      const title = channel.dm_participant_ids
        ? channel.dm_other_user?.full_name || 'Direct Message'
        : `#${channel.name}`;
      navigation.setOptions({ title });
    }
  }, [channel, navigation]);

  const fetchChannel = async () => {
    if (!channelId || !user) return;

    const { data, error } = await supabase
      .from('channels')
      .select('id, name, type, dm_participant_ids')
      .eq('id', channelId)
      .single();

    if (error) {
      console.error('Error fetching channel:', error);
      return;
    }

    // If it's a DM, get the other users' info
    if (data.dm_participant_ids) {
      const otherIds = data.dm_participant_ids.filter((id: string) => id !== user.id);
      if (otherIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', otherIds);

        if (profiles && profiles.length > 0) {
          setChannel({
            ...data,
            dm_other_user: {
              id: profiles[0].id,
              full_name: profiles.length > 1
                ? profiles.map(p => p.full_name || 'Unknown').join(', ')
                : profiles[0].full_name || 'Unknown',
            },
          });
          return;
        }
      }
    }

    setChannel(data);
  };

  const fetchMessages = async () => {
    if (!channelId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*, attachments, profiles(full_name, email)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markChannelAsRead = async () => {
    if (!channelId || !user) return;

    const { error } = await supabase.rpc('mark_channel_read', {
      p_channel_id: channelId,
    });

    if (error) {
      console.error('Error marking channel as read:', error);
    }

    // Refresh notification counts
    if (currentHub?.id && user?.id) {
      fetchNotificationCounts(currentHub.id, user.id);
    }
  };

  const pickImages = async () => {
    const remaining = 5 - pendingImages.length;
    if (remaining <= 0) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings to attach images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });

    if (!result.canceled) {
      setPendingImages(prev => [...prev, ...result.assets]);
    }
  };

  const takePhoto = async () => {
    if (pendingImages.length >= 5) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
    });

    if (!result.canceled) {
      setPendingImages(prev => [...prev, ...result.assets]);
    }
  };

  const pickFiles = async () => {
    const remaining = 3 - pendingFiles.length;
    if (remaining <= 0) return;

    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv',
      ],
      multiple: true,
    });

    if (!result.canceled) {
      const toAdd = result.assets.slice(0, remaining).map(a => ({
        uri: a.uri,
        name: a.name,
        size: a.size || 0,
        mimeType: a.mimeType || 'application/octet-stream',
      }));
      setPendingFiles(prev => [...prev, ...toAdd]);
    }
  };

  const showAttachMenu = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Photo Library', 'Take Photo', 'File'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) pickImages();
          if (buttonIndex === 2) takePhoto();
          if (buttonIndex === 3) pickFiles();
        }
      );
    } else {
      Alert.alert('Attach', 'Choose attachment type', [
        { text: 'Photo Library', onPress: pickImages },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'File', onPress: pickFiles },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const generateSecureName = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  };

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
        await supabase.from('message_reactions').update({ reaction_type: type })
          .eq('message_id', messageId).eq('user_id', user.id);
      } else {
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

  const fetchDmReadReceipt = async (chId: string) => {
    const { data, error } = await supabase.rpc('get_dm_read_receipt', { p_channel_id: chId });
    if (!error) setOtherUserLastRead(data);
  };

  const showMessageActions = (messageId: string, isMe: boolean) => {
    const reactionOptions = ['👍 Like', '❤️ Heart', '🎉 Celebrate'];
    const options = [...reactionOptions];
    if (isMe) options.push('Delete');
    options.push('Cancel');
    const destructiveIndex = isMe ? reactionOptions.length : undefined;
    const cancelIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, destructiveButtonIndex: destructiveIndex, cancelButtonIndex: cancelIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) handleMessageReaction(messageId, 'like');
          else if (buttonIndex === 1) handleMessageReaction(messageId, 'heart');
          else if (buttonIndex === 2) handleMessageReaction(messageId, 'celebrate');
          else if (buttonIndex === 3 && isMe) deleteMessage(messageId);
        }
      );
    } else {
      Alert.alert('Message', undefined, [
        { text: '👍 Like', onPress: () => handleMessageReaction(messageId, 'like') },
        { text: '❤️ Heart', onPress: () => handleMessageReaction(messageId, 'heart') },
        { text: '🎉 Celebrate', onPress: () => handleMessageReaction(messageId, 'celebrate') },
        ...(isMe ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => deleteMessage(messageId) }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const deleteMessage = (messageId: string) => {
    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('messages')
            .delete()
            .eq('id', messageId);
          if (error) {
            console.error('Error deleting message:', error);
            return;
          }
          setMessages(prev => prev.filter(m => m.id !== messageId));
        },
      },
    ]);
  };

  const sendMessage = async () => {
    const hasText = newMessage.trim().length > 0;
    const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;
    if ((!hasText && !hasAttachments) || !channelId || !user || sending) return;

    const content = newMessage.trim();
    const savedImages = [...pendingImages];
    const savedFiles = [...pendingFiles];
    setNewMessage('');
    setSending(true);

    const attachments: MessageAttachment[] = [];

    if (hasAttachments) {
      try {
        // Upload images
        if (pendingImages.length > 0) {
          const imageUrls: string[] = [];
          for (const img of pendingImages) {
            const fileName = generateSecureName(img.uri.split('/').pop() || 'image.jpg');
            const filePath = `messages/${channelId}/${fileName}`;

            const response = await fetch(img.uri);
            const blob = await response.blob();

            const { error: uploadErr } = await supabase.storage
              .from('post-attachments')
              .upload(filePath, blob, { cacheControl: '3600', contentType: img.mimeType || 'image/jpeg' });
            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
              .from('post-attachments')
              .getPublicUrl(filePath);
            imageUrls.push(publicUrl);
          }
          attachments.push({ type: 'images', urls: imageUrls });
        }

        // Upload files
        if (pendingFiles.length > 0) {
          const fileAttachments: FileAttachment[] = [];
          for (const file of pendingFiles) {
            const fileName = generateSecureName(file.name);
            const filePath = `messages/${channelId}/files/${fileName}`;

            const response = await fetch(file.uri);
            const blob = await response.blob();

            const { error: uploadErr } = await supabase.storage
              .from('post-attachments')
              .upload(filePath, blob, { cacheControl: '3600', contentType: file.mimeType });
            if (uploadErr) throw uploadErr;

            const { data: { publicUrl } } = supabase.storage
              .from('post-attachments')
              .getPublicUrl(filePath);
            fileAttachments.push({ url: publicUrl, name: file.name, size: file.size, mimeType: file.mimeType });
          }
          attachments.push({ type: 'files', files: fileAttachments });
        }
      } catch (err) {
        console.error('Error uploading attachments:', err);
        setNewMessage(content);
        setSending(false);
        return;
      }
      setPendingImages([]);
      setPendingFiles([]);
    }

    const { data: insertedData, error } = await supabase.from('messages').insert([
      {
        channel_id: channelId,
        user_id: user.id,
        content: content,
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    ]).select('*, attachments, profiles(full_name, email)').single();

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      if (hasAttachments) {
        setPendingImages(savedImages);
        setPendingFiles(savedFiles);
      }
    } else {
      // Add sent message to local state immediately (don't wait for realtime)
      if (insertedData) {
        setMessages((prev) => {
          // Deduplicate in case realtime already delivered it
          if (prev.some((m) => m.id === insertedData.id)) return prev;
          return [insertedData, ...prev];
        });
      }
      markChannelAsRead();
    }
    setSending(false);
  };

  const formatMessageTime = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      return format(date, 'h:mm a');
    } catch {
      return '';
    }
  };

  const formatDateHeader = (dateStr: string) => {
    try {
      const date = parseISO(dateStr);
      if (isToday(date)) return 'Today';
      if (isYesterday(date)) return 'Yesterday';
      return format(date, 'EEEE, MMMM d');
    } catch {
      return '';
    }
  };

  const shouldShowDateHeader = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    try {
      const currentDate = parseISO(currentMsg.created_at).toDateString();
      const prevDate = parseISO(prevMsg.created_at).toDateString();
      return currentDate !== prevDate;
    } catch {
      return false;
    }
  };

  const shouldShowHeader = (currentMsg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    if (prevMsg.user_id !== currentMsg.user_id) return true;
    // Show header if more than 5 minutes apart
    try {
      const currentTime = parseISO(currentMsg.created_at).getTime();
      const prevTime = parseISO(prevMsg.created_at).getTime();
      return currentTime - prevTime > 5 * 60 * 1000;
    } catch {
      return true;
    }
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const prevMessage = index > 0 ? messages[index - 1] : null;
    const isMe = item.user_id === user?.id;
    const showDateHeader = shouldShowDateHeader(item, prevMessage);
    const showHeader = shouldShowHeader(item, prevMessage);

    return (
      <View>
        {showDateHeader && (
          <View style={styles.dateHeaderContainer}>
            <View style={[styles.dateHeaderLine, { backgroundColor: t.border }]} />
            <Text style={[styles.dateHeaderText, { color: t.textMuted }]}>{formatDateHeader(item.created_at)}</Text>
            <View style={[styles.dateHeaderLine, { backgroundColor: t.border }]} />
          </View>
        )}
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          {!isMe && showHeader && (
            <View style={[styles.avatar, { backgroundColor: t.border }]}>
              <Text style={[styles.avatarText, { color: t.textSecondary }]}>
                {item.profiles?.full_name?.[0] || '?'}
              </Text>
            </View>
          )}
          {!isMe && !showHeader && <View style={styles.avatarSpacer} />}

          <View style={[styles.messageContent, isMe && styles.messageContentMe]}>
            {showHeader && (
              <View style={[styles.messageHeader, isMe && styles.messageHeaderMe]}>
                <Text style={[styles.senderName, { color: t.text }]}>
                  {isMe ? 'You' : item.profiles?.full_name || 'Unknown'}
                </Text>
                <Text style={[styles.messageTime, { color: t.textFaint }]}>{formatMessageTime(item.created_at)}</Text>
              </View>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => showMessageActions(item.id, isMe)}
              style={[styles.messageBubble, isMe ? [styles.messageBubbleMe, { backgroundColor: t.primary }] : [styles.messageBubbleOther, { backgroundColor: t.surface, borderColor: t.border }]]}
            >
              {item.content ? (
                <Text style={[styles.messageText, { color: t.textSecondary }, isMe && styles.messageTextMe]}>
                  {item.content}
                </Text>
              ) : null}
              {item.attachments?.map((att, ai) => {
                if (att.type === 'images') {
                  const screenW = Dimensions.get('window').width;
                  const maxW = screenW * 0.6;
                  return (
                    <View key={ai} style={item.content ? { marginTop: 8 } : undefined}>
                      {att.urls.map((url, ui) => (
                        <TouchableOpacity key={ui} onPress={() => Linking.openURL(url).catch(() => Alert.alert('Error', 'Unable to open this image.'))} activeOpacity={0.8}>
                          <Image
                            source={{ uri: url }}
                            style={{ width: maxW, height: maxW * 0.75, borderRadius: 10, marginTop: ui > 0 ? 4 : 0 }}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                }
                if (att.type === 'files') {
                  return (
                    <View key={ai} style={item.content ? { marginTop: 8 } : undefined}>
                      {att.files.map((file, fi) => (
                        <TouchableOpacity
                          key={fi}
                          style={[styles.filePill, { backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : t.surfaceSecondary }]}
                          onPress={() => Linking.openURL(file.url).catch(() => Alert.alert('Error', 'Unable to open this file.'))}
                        >
                          <FileText size={14} color={isMe ? colors.white : t.textMuted} />
                          <Text style={[styles.fileName, { color: isMe ? colors.white : t.text }]} numberOfLines={1}>
                            {file.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                }
                return null;
              })}
            </TouchableOpacity>
            {/* Reaction pills */}
            {(() => {
              const r = messageReactions.get(item.id);
              if (!r || (r.like === 0 && r.heart === 0 && r.celebrate === 0)) return null;
              return (
                <View style={[styles.reactionRow, isMe && styles.reactionRowMe]}>
                  {r.like > 0 && (
                    <TouchableOpacity onPress={() => handleMessageReaction(item.id, 'like')} style={[styles.reactionPill, { backgroundColor: r.userReaction === 'like' ? '#EFF6FF' : t.surfaceSecondary, borderColor: r.userReaction === 'like' ? '#BFDBFE' : t.border }]}>
                      <ThumbsUp size={12} color={r.userReaction === 'like' ? '#2563EB' : t.textMuted} />
                      <Text style={[styles.reactionCount, { color: r.userReaction === 'like' ? '#2563EB' : t.textMuted }]}>{r.like}</Text>
                    </TouchableOpacity>
                  )}
                  {r.heart > 0 && (
                    <TouchableOpacity onPress={() => handleMessageReaction(item.id, 'heart')} style={[styles.reactionPill, { backgroundColor: r.userReaction === 'heart' ? '#FDF2F8' : t.surfaceSecondary, borderColor: r.userReaction === 'heart' ? '#FBCFE8' : t.border }]}>
                      <Heart size={12} color={r.userReaction === 'heart' ? '#EC4899' : t.textMuted} />
                      <Text style={[styles.reactionCount, { color: r.userReaction === 'heart' ? '#EC4899' : t.textMuted }]}>{r.heart}</Text>
                    </TouchableOpacity>
                  )}
                  {r.celebrate > 0 && (
                    <TouchableOpacity onPress={() => handleMessageReaction(item.id, 'celebrate')} style={[styles.reactionPill, { backgroundColor: r.userReaction === 'celebrate' ? '#FFFBEB' : t.surfaceSecondary, borderColor: r.userReaction === 'celebrate' ? '#FDE68A' : t.border }]}>
                      <PartyPopper size={12} color={r.userReaction === 'celebrate' ? '#D97706' : t.textMuted} />
                      <Text style={[styles.reactionCount, { color: r.userReaction === 'celebrate' ? '#D97706' : t.textMuted }]}>{r.celebrate}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })()}
            {/* DM read receipt */}
            {isMe && channel?.dm_participant_ids && otherUserLastRead &&
              new Date(item.created_at) <= new Date(otherUserLastRead) &&
              (index === 0 || messages[index - 1]?.user_id !== user?.id ||
                new Date(messages[index - 1]?.created_at) > new Date(otherUserLastRead)) && (
              <View style={[styles.seenIndicator, isMe && { alignSelf: 'flex-end' }]}>
                <Check size={12} color={t.textFaint} />
                <Text style={[styles.seenText, { color: t.textFaint }]}>Seen</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        inverted={true}
        contentContainerStyle={styles.messagesList}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={20}
        removeClippedSubviews={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {channel?.dm_participant_ids ? (
              <User size={48} color={t.border} />
            ) : (
              <Hash size={48} color={t.border} />
            )}
            <Text style={[styles.emptyTitle, { color: t.text }]}>
              {channel?.dm_participant_ids
                ? `Start a conversation with ${channel.dm_other_user?.full_name || 'this user'}`
                : 'No messages yet'}
            </Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              Be the first to send a message!
            </Text>
          </View>
        }
      />

      {/* Input Area - animates up when keyboard opens */}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            marginBottom: keyboardHeight,
            backgroundColor: t.surface,
            borderTopColor: t.border,
          },
        ]}
      >
        {/* Attachment preview strip */}
        {(pendingImages.length > 0 || pendingFiles.length > 0) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewStrip} contentContainerStyle={{ gap: 8 }}>
            {pendingImages.map((img, i) => (
              <View key={`img-${i}`} style={styles.previewItem}>
                <Image source={{ uri: img.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.previewRemove}
                  onPress={() => setPendingImages(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <X size={10} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {pendingFiles.map((file, i) => (
              <View key={`file-${i}`} style={[styles.previewFilePill, { backgroundColor: t.surfaceSecondary }]}>
                <FileText size={12} color={t.textMuted} />
                <Text style={[styles.previewFileName, { color: t.text }]} numberOfLines={1}>{file.name}</Text>
                <TouchableOpacity onPress={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))}>
                  <X size={12} color={t.textFaint} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          {/* Attach button */}
          <TouchableOpacity style={styles.attachButton} onPress={showAttachMenu}>
            <Plus size={22} color={t.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={[styles.input, { color: t.text, backgroundColor: t.surfaceSecondary }]}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={
              channel?.dm_participant_ids
                ? `Message ${channel.dm_other_user?.full_name || 'user'}`
                : `Message #${channel?.name || 'channel'}`
            }
            placeholderTextColor={t.textFaint}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: t.primary },
              (!newMessage.trim() && pendingImages.length === 0 && pendingFiles.length === 0 || sending) && styles.sendButtonDisabled,
            ]}
            onPress={sendMessage}
            disabled={(!newMessage.trim() && pendingImages.length === 0 && pendingFiles.length === 0) || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Send size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate[50],
  },
  messagesList: {
    padding: 16,
    flexGrow: 1,
  },
  dateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  dateHeaderText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  messageRowMe: {
    flexDirection: 'row-reverse',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  avatarSpacer: {
    width: 40,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[600],
  },
  messageContent: {
    maxWidth: '80%',
  },
  messageContentMe: {
    alignItems: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  messageHeaderMe: {
    flexDirection: 'row-reverse',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[900],
    marginRight: 8,
  },
  messageTime: {
    fontSize: 11,
    color: colors.slate[400],
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  messageBubbleMe: {
    backgroundColor: colors.brand[600],
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    color: colors.slate[700],
  },
  messageTextMe: {
    color: colors.white,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 4,
    textAlign: 'center',
  },
  inputContainer: {
    paddingTop: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  attachButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: colors.slate[100],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate[900],
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
  // Attachment preview
  previewStrip: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  previewItem: {
    position: 'relative',
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
  },
  previewRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.red[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 180,
  },
  previewFileName: {
    fontSize: 12,
    flex: 1,
  },
  // Message attachment styles
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    maxWidth: 200,
  },
  fileName: {
    fontSize: 13,
    flex: 1,
  },
  // Reaction styles
  reactionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  reactionRowMe: {
    justifyContent: 'flex-end',
  },
  reactionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  reactionCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Read receipt styles
  seenIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  seenText: {
    fontSize: 11,
  },
});
