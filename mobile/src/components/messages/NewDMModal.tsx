import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { X, Search, User } from 'lucide-react-native';
import { router } from 'expo-router';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { useHubStore } from '../../stores/hubStore';
import { useAuthStore } from '../../stores/authStore';

interface NewDMModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDMCreated?: () => void;
}

interface HubMember {
  user_id: string;
  full_name: string;
  email: string;
}

export function NewDMModal({ isOpen, onClose, onDMCreated }: NewDMModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [members, setMembers] = useState<HubMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const { currentHub } = useHubStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      fetchMembers();
    }
  }, [isOpen]);

  const fetchMembers = async () => {
    if (!currentHub || !user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('hub_members')
        .select(`
          user_id,
          profile:profiles (
            full_name,
            email
          )
        `)
        .eq('hub_id', currentHub.id)
        .neq('user_id', user.id);

      if (error) {
        console.error('Error fetching members:', error);
        setMembers([]);
      } else {
        const memberList: HubMember[] = (data || []).map((m: any) => ({
          user_id: m.user_id,
          full_name: m.profile?.full_name || 'Unknown',
          email: m.profile?.email || '',
        }));
        setMembers(memberList);
      }
    } catch (err) {
      console.error('Error:', err);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const startDMWithUser = async (otherUserId: string) => {
    if (!currentHub || !user || creating) return;
    setCreating(true);

    try {
      // Call the database function to get or create the DM channel
      const { data, error } = await supabase.rpc('get_or_create_dm_channel', {
        p_hub_id: currentHub.id,
        p_user1_id: user.id,
        p_user2_id: otherUserId,
      });

      if (error) {
        console.error('Error creating DM channel:', error);
        return;
      }

      const channelId = data;
      onClose();
      onDMCreated?.();

      // Navigate to the chat screen
      router.push(`/chat/${channelId}`);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setCreating(false);
    }
  };

  const filteredMembers = members.filter(
    (m) =>
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMember = ({ item }: { item: HubMember }) => (
    <TouchableOpacity
      style={styles.memberItem}
      onPress={() => startDMWithUser(item.user_id)}
      activeOpacity={0.7}
      disabled={creating}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.full_name}</Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
    </TouchableOpacity>
  );

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>New Message</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={colors.slate[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor={colors.slate[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
        </View>

        {/* Members List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.light.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.user_id}
            renderItem={renderMember}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <User size={48} color={colors.slate[300]} />
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No members found' : 'No members available'}
                </Text>
              </View>
            }
          />
        )}

        {/* Creating indicator */}
        {creating && (
          <View style={styles.creatingOverlay}>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.creatingText}>Starting conversation...</Text>
          </View>
        )}
      </View>
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
  placeholder: {
    width: 32,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: colors.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: colors.slate[900],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand[700],
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.slate[900],
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: colors.slate[500],
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: colors.slate[400],
  },
  creatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: colors.white,
  },
});
