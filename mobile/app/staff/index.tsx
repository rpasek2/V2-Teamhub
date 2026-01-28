import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Search, Mail, Phone, CheckSquare, Calendar, Clock } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface StaffMember {
  user_id: string;
  role: string;
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  staff_profile?: {
    id: string;
    title: string | null;
    bio: string | null;
    phone: string | null;
    email: string | null;
    hire_date: string | null;
    status: string;
  } | null;
  pending_time_off: number;
  pending_tasks: number;
}

type RoleFilter = 'all' | 'owner' | 'director' | 'admin' | 'coach';

const ROLE_FILTERS: { key: RoleFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'owner', label: 'Owners' },
  { key: 'director', label: 'Directors' },
  { key: 'admin', label: 'Admins' },
  { key: 'coach', label: 'Coaches' },
];

export default function StaffScreen() {
  const router = useRouter();
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

  const { currentHub, currentMember } = useHubStore();
  const currentRole = currentMember?.role;

  // Check if user is staff
  const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

  useEffect(() => {
    if (currentHub?.id) {
      fetchStaffMembers();
    }
  }, [currentHub?.id]);

  const fetchStaffMembers = async () => {
    if (!currentHub) {
      setStaffMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch hub members with staff roles
      const { data: membersData, error: membersError } = await supabase
        .from('hub_members')
        .select(`
          user_id,
          role,
          profile:profiles(id, full_name, email, avatar_url)
        `)
        .eq('hub_id', currentHub.id)
        .in('role', ['owner', 'director', 'admin', 'coach']);

      if (membersError) {
        console.error('Error fetching staff members:', membersError);
        setStaffMembers([]);
        setLoading(false);
        return;
      }

      const userIds = membersData?.map((m) => m.user_id) || [];

      if (userIds.length === 0) {
        setStaffMembers([]);
        setLoading(false);
        return;
      }

      // Run remaining queries in parallel
      const [staffProfilesResult, timeOffResult, tasksResult] = await Promise.all([
        supabase
          .from('staff_profiles')
          .select('id, user_id, title, bio, phone, email, hire_date, status')
          .eq('hub_id', currentHub.id)
          .in('user_id', userIds),
        supabase
          .from('staff_time_off')
          .select('staff_user_id')
          .eq('hub_id', currentHub.id)
          .eq('status', 'pending'),
        supabase
          .from('staff_tasks')
          .select('staff_user_id')
          .eq('hub_id', currentHub.id)
          .in('status', ['pending', 'in_progress']),
      ]);

      const staffProfiles = staffProfilesResult.data;
      const timeOffCounts = timeOffResult.data;
      const taskCounts = tasksResult.data;

      // Combine data
      const combined: StaffMember[] = (membersData || []).map((member) => {
        const staffProfile = staffProfiles?.find((sp) => sp.user_id === member.user_id);
        const pendingTimeOff =
          timeOffCounts?.filter((t) => t.staff_user_id === member.user_id).length || 0;
        const pendingTasks =
          taskCounts?.filter((t) => t.staff_user_id === member.user_id).length || 0;

        // Profile comes from a join and could be an array or single object
        const profileData = Array.isArray(member.profile) ? member.profile[0] : member.profile;

        return {
          user_id: member.user_id,
          role: member.role,
          profile: profileData as StaffMember['profile'],
          staff_profile: staffProfile || null,
          pending_time_off: pendingTimeOff,
          pending_tasks: pendingTasks,
        };
      });

      // Sort: owners first, then by name
      combined.sort((a, b) => {
        const roleOrder = ['owner', 'director', 'admin', 'coach'];
        const aIndex = roleOrder.indexOf(a.role);
        const bIndex = roleOrder.indexOf(b.role);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
      });

      setStaffMembers(combined);
    } catch (err) {
      console.error('Error:', err);
      setStaffMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStaffMembers();
  };

  // Filter staff members
  const filteredStaff = useMemo(() => {
    return staffMembers.filter((member) => {
      const matchesSearch =
        searchQuery === '' ||
        member.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.staff_profile?.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || member.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [staffMembers, searchQuery, roleFilter]);

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'owner':
        return { bg: colors.amber[100], text: colors.amber[700] };
      case 'director':
        return { bg: colors.purple[100], text: colors.purple[700] };
      case 'admin':
        return { bg: colors.blue[100], text: colors.blue[700] };
      case 'coach':
        return { bg: colors.success[100], text: colors.success[700] };
      default:
        return { bg: colors.slate[100], text: colors.slate[600] };
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleStaffPress = (staffId: string) => {
    router.push(`/staff/${staffId}` as any);
  };

  if (!isStaff) {
    return (
      <View style={styles.permissionContainer}>
        <Users size={48} color={colors.slate[300]} />
        <Text style={styles.permissionText}>You don't have permission to view this page.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={18} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search staff..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Role Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {ROLE_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.filterButton, roleFilter === filter.key && styles.filterButtonActive]}
              onPress={() => setRoleFilter(filter.key)}
            >
              <Text
                style={[styles.filterButtonText, roleFilter === filter.key && styles.filterButtonTextActive]}
              >
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Staff List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {filteredStaff.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Users size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No staff members found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || roleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Staff profiles will appear here'}
            </Text>
          </View>
        ) : (
          filteredStaff.map((member) => {
            const roleBadge = getRoleBadgeStyle(member.role);
            const contactEmail = member.staff_profile?.email || member.profile?.email;
            const contactPhone = member.staff_profile?.phone;

            return (
              <TouchableOpacity
                key={member.user_id}
                style={styles.staffCard}
                onPress={() => handleStaffPress(member.user_id)}
                activeOpacity={0.7}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  {/* Avatar */}
                  {member.profile?.avatar_url ? (
                    <Image source={{ uri: member.profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(member.profile?.full_name || '??')}
                      </Text>
                    </View>
                  )}

                  {/* Name & Role */}
                  <View style={styles.headerInfo}>
                    <Text style={styles.staffName} numberOfLines={1}>
                      {member.profile?.full_name || 'Unknown'}
                    </Text>
                    {member.staff_profile?.title && (
                      <Text style={styles.staffTitle} numberOfLines={1}>
                        {member.staff_profile.title}
                      </Text>
                    )}
                    <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                      <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Contact Info */}
                <View style={styles.contactSection}>
                  {contactEmail && (
                    <View style={styles.contactRow}>
                      <Mail size={14} color={colors.slate[400]} />
                      <Text style={styles.contactText} numberOfLines={1}>
                        {contactEmail}
                      </Text>
                    </View>
                  )}
                  {contactPhone && (
                    <View style={styles.contactRow}>
                      <Phone size={14} color={colors.slate[400]} />
                      <Text style={styles.contactText}>{contactPhone}</Text>
                    </View>
                  )}
                </View>

                {/* Status Badges */}
                <View style={styles.statusSection}>
                  {member.pending_tasks > 0 && (
                    <View style={styles.statusBadge}>
                      <CheckSquare size={14} color={colors.amber[500]} />
                      <Text style={styles.statusText}>
                        {member.pending_tasks} task{member.pending_tasks !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {member.pending_time_off > 0 && (
                    <View style={styles.statusBadge}>
                      <Calendar size={14} color={colors.blue[500]} />
                      <Text style={styles.statusText}>
                        {member.pending_time_off} request{member.pending_time_off !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                  {member.pending_tasks === 0 && member.pending_time_off === 0 && (
                    <View style={styles.statusBadge}>
                      <Clock size={14} color={colors.slate[400]} />
                      <Text style={[styles.statusText, { color: colors.slate[400] }]}>
                        No pending items
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    color: colors.slate[400],
    marginTop: 16,
    textAlign: 'center',
  },

  // Search
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate[900],
  },

  // Filters
  filterContainer: {
    backgroundColor: colors.white,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  filterScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
  },
  filterButtonActive: {
    backgroundColor: theme.light.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[600],
  },
  filterButtonTextActive: {
    color: colors.white,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },

  // Staff Card
  staffCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.brand[700],
  },
  headerInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 2,
  },
  staffTitle: {
    fontSize: 14,
    color: colors.slate[500],
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Contact
  contactSection: {
    gap: 6,
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 14,
    color: colors.slate[600],
    flex: 1,
  },

  // Status
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.slate[600],
  },
});
