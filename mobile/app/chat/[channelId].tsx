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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { Send, Hash, User } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { useNotificationStore } from '../../src/stores/notificationStore';
import { useHubStore } from '../../src/stores/hubStore';
import { format, parseISO, isToday, isYesterday } from 'date-fns';

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
      // Scroll to bottom when keyboard opens
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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
              .select('*, profiles(full_name, email)')
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setMessages((prev) => [...prev, data]);
              // Mark as read since user is viewing
              markChannelAsRead();
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [channelId]);

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

    // If it's a DM, get the other user's info
    if (data.dm_participant_ids) {
      const otherUserId = data.dm_participant_ids.find((id: string) => id !== user.id);
      if (otherUserId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', otherUserId)
          .single();

        if (profile) {
          setChannel({
            ...data,
            dm_other_user: {
              id: profile.id,
              full_name: profile.full_name || 'Unknown',
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
      .select('*, profiles(full_name, email)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  };

  const markChannelAsRead = async () => {
    if (!channelId || !user) return;

    const now = new Date().toISOString();

    await supabase
      .from('channel_members')
      .upsert(
        {
          channel_id: channelId,
          user_id: user.id,
          last_read_at: now,
          added_at: now,
        },
        {
          onConflict: 'channel_id,user_id',
        }
      );

    // Refresh notification counts
    if (currentHub?.id && user?.id) {
      fetchNotificationCounts(currentHub.id, user.id);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelId || !user || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const { error } = await supabase.from('messages').insert([
      {
        channel_id: channelId,
        user_id: user.id,
        content: content,
      },
    ]);

    if (error) {
      console.error('Error sending message:', error);
      setNewMessage(content); // Restore message on error
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
            <View style={styles.dateHeaderLine} />
            <Text style={styles.dateHeaderText}>{formatDateHeader(item.created_at)}</Text>
            <View style={styles.dateHeaderLine} />
          </View>
        )}
        <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
          {!isMe && showHeader && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.profiles?.full_name?.[0] || '?'}
              </Text>
            </View>
          )}
          {!isMe && !showHeader && <View style={styles.avatarSpacer} />}

          <View style={[styles.messageContent, isMe && styles.messageContentMe]}>
            {showHeader && (
              <View style={[styles.messageHeader, isMe && styles.messageHeaderMe]}>
                <Text style={styles.senderName}>
                  {isMe ? 'You' : item.profiles?.full_name || 'Unknown'}
                </Text>
                <Text style={styles.messageTime}>{formatMessageTime(item.created_at)}</Text>
              </View>
            )}
            <View style={[styles.messageBubble, isMe ? styles.messageBubbleMe : styles.messageBubbleOther]}>
              <Text style={[styles.messageText, isMe && styles.messageTextMe]}>
                {item.content}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {channel?.dm_participant_ids ? (
              <User size={48} color={colors.slate[300]} />
            ) : (
              <Hash size={48} color={colors.slate[300]} />
            )}
            <Text style={styles.emptyTitle}>
              {channel?.dm_participant_ids
                ? `Start a conversation with ${channel.dm_other_user?.full_name || 'this user'}`
                : 'No messages yet'}
            </Text>
            <Text style={styles.emptyText}>
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
          },
        ]}
      >
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder={
            channel?.dm_participant_ids
              ? `Message ${channel.dm_other_user?.full_name || 'user'}`
              : `Message #${channel?.name || 'channel'}`
          }
          placeholderTextColor={colors.slate[400]}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!newMessage.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Send size={20} color={colors.white} />
          )}
        </TouchableOpacity>
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
    backgroundColor: theme.light.primary,
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
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingTop: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
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
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.slate[300],
  },
});
