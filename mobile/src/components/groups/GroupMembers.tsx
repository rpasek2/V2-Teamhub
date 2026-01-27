import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Users, Shield, Search, Crown, User, UserMinus } from 'lucide-react-native';
import { colors, theme } from '../../constants/colors';
import { supabase } from '../../services/supabase';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface GroupMember {
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
    email: string;
  };
}

interface GroupMembersProps {
  groupId: string;
  isAdmin: boolean;
  currentUserId: string;
  onMemberCountChange?: (count: number) => void;
}

export function GroupMembers({ groupId, isAdmin, currentUserId, onMemberCountChange }: GroupMembersProps) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [groupId]);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, role, joined_at, profiles(full_name, avatar_url, email)')
        .eq('group_id', groupId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers((data as any) || []);
      if (onMemberCountChange) {
        onMemberCountChange(data?.length || 0);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePromoteToAdmin = async (userId: string) => {
    if (!isAdmin) return;
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: 'admin' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: 'admin' } : m)));
    } catch (err) {
      console.error('Error promoting member:', err);
      Alert.alert('Error', 'Failed to promote member');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemoteToMember = async (userId: string) => {
    if (!isAdmin) return;
    setActionLoading(userId);
    try {
      const { error } = await supabase
        .from('group_members')
        .update({ role: 'member' })
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: 'member' } : m)));
    } catch (err) {
      console.error('Error demoting member:', err);
      Alert.alert('Error', 'Failed to remove admin role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!isAdmin || userId === currentUserId) return;

    Alert.alert(
      'Remove Member',
      `Are you sure you want to remove ${memberName} from the group?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('group_id', groupId)
                .eq('user_id', userId);

              if (error) throw error;
              setMembers((prev) => prev.filter((m) => m.user_id !== userId));
              if (onMemberCountChange) {
                onMemberCountChange(members.length - 1);
              }
            } catch (err) {
              console.error('Error removing member:', err);
              Alert.alert('Error', 'Failed to remove member');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const filteredMembers = members.filter(
    (member) =>
      member.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const admins = filteredMembers.filter((m) => m.role === 'admin');
  const regularMembers = filteredMembers.filter((m) => m.role === 'member');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  const renderMember = (member: GroupMember) => {
    const isCurrentUser = member.user_id === currentUserId;
    const isLoading = actionLoading === member.user_id;

    return (
      <View key={member.user_id} style={styles.memberRow}>
        {/* Avatar */}
        <View style={styles.avatar}>
          {member.profiles?.avatar_url ? (
            <Image source={{ uri: member.profiles.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {member.profiles?.full_name?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {member.profiles?.full_name || 'Unknown User'}
            </Text>
            {isCurrentUser && (
              <View style={styles.youBadge}>
                <Text style={styles.youBadgeText}>You</Text>
              </View>
            )}
            {member.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Shield size={10} color={colors.amber[700]} />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <Text style={styles.memberEmail} numberOfLines={1}>
            {member.profiles?.email}
          </Text>
          <Text style={styles.memberJoined}>Joined {formatTime(member.joined_at)}</Text>
        </View>

        {/* Actions for admins */}
        {isAdmin && !isCurrentUser && (
          <View style={styles.actions}>
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.slate[400]} />
            ) : (
              <>
                {member.role === 'member' ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handlePromoteToAdmin(member.user_id)}
                  >
                    <Shield size={18} color={colors.amber[500]} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDemoteToMember(member.user_id)}
                  >
                    <User size={18} color={colors.slate[500]} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() =>
                    handleRemoveMember(member.user_id, member.profiles?.full_name || 'this member')
                  }
                >
                  <UserMinus size={18} color={colors.error[500]} />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Users size={20} color={colors.white} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Group Members</Text>
          <Text style={styles.headerCount}>
            {members.length} member{members.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.slate[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search members..."
          placeholderTextColor={colors.slate[400]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Admins Section */}
      {admins.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Crown size={14} color={colors.amber[700]} />
            <Text style={styles.sectionTitle}>Admins</Text>
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{admins.length}</Text>
            </View>
          </View>
          {admins.map(renderMember)}
        </View>
      )}

      {/* Regular Members Section */}
      {regularMembers.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={14} color={colors.slate[600]} />
            <Text style={styles.sectionTitle}>Members</Text>
            <View style={styles.sectionCountGray}>
              <Text style={styles.sectionCountTextGray}>{regularMembers.length}</Text>
            </View>
          </View>
          {regularMembers.map(renderMember)}
        </View>
      )}

      {/* Empty state */}
      {filteredMembers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No members found</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    margin: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.purple[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  headerCount: {
    fontSize: 13,
    color: colors.slate[500],
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.slate[900],
  },
  section: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.amber[50],
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.amber[700],
    flex: 1,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.amber[100],
    borderRadius: 12,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber[700],
  },
  sectionCountGray: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
  },
  sectionCountTextGray: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[600],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[50],
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.brand[100],
    borderRadius: 10,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand[700],
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.amber[100],
    borderRadius: 10,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.amber[700],
  },
  memberEmail: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  memberJoined: {
    fontSize: 11,
    color: colors.slate[400],
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
  },
});
