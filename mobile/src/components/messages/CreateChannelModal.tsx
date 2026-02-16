import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { X, Hash, Lock } from 'lucide-react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { useHubStore } from '../../stores/hubStore';
import { useAuthStore } from '../../stores/authStore';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChannelCreated?: () => void;
}

export function CreateChannelModal({ isOpen, onClose, onChannelCreated }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  const currentHub = useHubStore((state) => state.currentHub);
  const user = useAuthStore((state) => state.user);

  const handleClose = () => {
    setName('');
    setDescription('');
    setIsPrivate(false);
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Channel name is required');
      return;
    }

    if (!currentHub || !user) {
      Alert.alert('Error', 'Unable to create channel');
      return;
    }

    setCreating(true);

    try {
      // Create the channel
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .insert({
          hub_id: currentHub.id,
          name: name.trim(),
          description: description.trim() || null,
          type: isPrivate ? 'private' : 'public',
          created_by: user.id,
        })
        .select('id')
        .single();

      if (channelError) throw channelError;

      // Add the creator as a member
      const { error: memberError } = await supabase.from('channel_members').insert({
        channel_id: channel.id,
        user_id: user.id,
        last_read_at: new Date().toISOString(),
      });

      if (memberError) {
        console.error('Error adding creator as member:', memberError);
      }

      handleClose();
      onChannelCreated?.();

      // Navigate to the new channel
      router.push(`/chat/${channel.id}`);
    } catch (err) {
      console.error('Error creating channel:', err);
      Alert.alert('Error', 'Failed to create channel');
    } finally {
      setCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Channel</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={creating || !name.trim()}
            style={[styles.createButton, (!name.trim() || creating) && styles.createButtonDisabled]}
          >
            {creating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.createButtonText}>Create</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Channel Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Channel Name</Text>
            <View style={styles.inputContainer}>
              <Hash size={20} color={colors.slate[400]} />
              <TextInput
                style={styles.input}
                placeholder="e.g. announcements"
                placeholderTextColor={colors.slate[400]}
                value={name}
                onChangeText={setName}
                autoFocus
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What's this channel about?"
              placeholderTextColor={colors.slate[400]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Privacy Toggle */}
          <View style={styles.toggleField}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, isPrivate && styles.toggleIconPrivate]}>
                {isPrivate ? (
                  <Lock size={20} color={colors.amber[600]} />
                ) : (
                  <Hash size={20} color={colors.brand[600]} />
                )}
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>
                  {isPrivate ? 'Private Channel' : 'Public Channel'}
                </Text>
                <Text style={styles.toggleDescription}>
                  {isPrivate
                    ? 'Only invited members can view and join'
                    : 'Anyone in the hub can view and join'}
                </Text>
              </View>
            </View>
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.slate[200], true: colors.brand[400] }}
              thumbColor={isPrivate ? colors.brand[600] : colors.slate[50]}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  createButton: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.slate[900],
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  toggleField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleIconPrivate: {
    backgroundColor: colors.amber[50],
  },
  toggleText: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 2,
  },
  toggleDescription: {
    fontSize: 13,
    color: colors.slate[500],
  },
});
