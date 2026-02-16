import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Search, User, ChevronRight, Phone, Mail, Users, Shield, Dumbbell, Music } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Guardian {
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
  guardian_1: Guardian | null;
}

interface HubMember {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  }[];
}

interface DisplayMember {
  id: string;
  name: string;
  email: string;
  role: string;
  type: 'hub_member' | 'gymnast_profile';
  level?: string;
  gender?: 'Male' | 'Female' | null;
  guardian_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
}

type TabType = 'All' | 'Coaches' | 'Gymnasts' | 'Parents';

const TABS: TabType[] = ['All', 'Coaches', 'Gymnasts', 'Parents'];

export default function RosterScreen() {
  const [members, setMembers] = useState<DisplayMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Gymnasts');

  const { currentHub, linkedGymnasts, currentMember } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  const levels = currentHub?.settings?.levels || [];

  useEffect(() => {
    fetchMembers();
  }, [currentHub?.id]);

  const fetchMembers = async () => {
    if (!currentHub) {
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch both hub members and gymnast profiles in parallel
      const [hubMembersResult, gymnastProfilesResult] = await Promise.all([
        supabase
          .from('hub_members')
          .select('user_id, role, profiles(full_name, email)')
          .eq('hub_id', currentHub.id),
        supabase
          .from('gymnast_profiles')
          .select('id, first_name, last_name, level, gender, guardian_1')
          .eq('hub_id', currentHub.id)
          .order('last_name', { ascending: true }),
      ]);

      const allMembers: DisplayMember[] = [];

      // Process hub members (coaches, parents, admins)
      if (hubMembersResult.data) {
        (hubMembersResult.data as HubMember[]).forEach((m) => {
          const profile = m.profiles?.[0];
          allMembers.push({
            id: m.user_id,
            name: profile?.full_name || 'Unknown',
            email: profile?.email || '',
            role: m.role,
            type: 'hub_member',
          });
        });
      }

      // Process gymnast profiles
      if (gymnastProfilesResult.data) {
        gymnastProfilesResult.data.forEach((g: GymnastProfile) => {
          // Build guardian name from either format
          let guardianName = '';
          if (g.guardian_1) {
            if (g.guardian_1.name) {
              guardianName = g.guardian_1.name;
            } else if (g.guardian_1.first_name || g.guardian_1.last_name) {
              guardianName = `${g.guardian_1.first_name || ''} ${g.guardian_1.last_name || ''}`.trim();
            }
          }

          allMembers.push({
            id: g.id,
            name: `${g.first_name} ${g.last_name}`,
            email: g.guardian_1?.email || '',
            role: 'athlete',
            type: 'gymnast_profile',
            level: g.level || undefined,
            gender: g.gender,
            guardian_name: guardianName || undefined,
            guardian_phone: g.guardian_1?.phone || undefined,
            guardian_email: g.guardian_1?.email || undefined,
          });
        });
      }

      setMembers(allMembers);
    } catch (err) {
      console.error('Error:', err);
      setMembers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Permission check for parents - only see linked gymnasts
      if (isParent() && !isStaff()) {
        if (member.type === 'gymnast_profile') {
          const isLinked = linkedGymnasts.some((g) => g.id === member.id);
          if (!isLinked) return false;
        } else {
          // Parents can only see themselves in hub_member list
          if (member.id !== currentMember?.user_id) return false;
        }
      }

      // Tab filter
      if (activeTab !== 'All') {
        if (activeTab === 'Coaches') {
          if (!['coach', 'owner', 'director', 'admin'].includes(member.role)) return false;
        } else if (activeTab === 'Gymnasts') {
          if (member.role !== 'athlete') return false;
        } else if (activeTab === 'Parents') {
          if (member.role !== 'parent') return false;
        }
      }

      // Level filter (only for gymnasts)
      if (selectedLevel && member.type === 'gymnast_profile') {
        if (member.level !== selectedLevel) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = member.name.toLowerCase().includes(query);
        const matchesEmail = member.email?.toLowerCase().includes(query);
        const matchesGuardian = member.guardian_name?.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail && !matchesGuardian) return false;
      }

      return true;
    }).sort((a, b) => {
      // Sort gymnasts by level then name
      if (a.type === 'gymnast_profile' && b.type === 'gymnast_profile') {
        const aLevelIndex = a.level ? levels.indexOf(a.level) : 999;
        const bLevelIndex = b.level ? levels.indexOf(b.level) : 999;
        if (aLevelIndex !== bLevelIndex) return aLevelIndex - bLevelIndex;
      }
      return a.name.localeCompare(b.name);
    });
  }, [members, activeTab, selectedLevel, searchQuery, isParent, isStaff, linkedGymnasts, currentMember, levels]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMembers();
  };

  const handleMemberPress = (member: DisplayMember) => {
    // Only allow navigation to gymnast profiles
    if (member.type === 'gymnast_profile') {
      // Check permission
      const canView = isStaff() || linkedGymnasts.some((g) => g.id === member.id);
      if (canView) {
        router.push(`/roster/${member.id}`);
      }
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.map((p) => p[0] || '').join('').toUpperCase().slice(0, 2);
  };

  const getRoleIcon = (role: string) => {
    if (['owner', 'director', 'admin'].includes(role)) {
      return <Shield size={14} color={colors.amber[600]} />;
    }
    if (role === 'coach') {
      return <Dumbbell size={14} color={colors.blue[600]} />;
    }
    if (role === 'parent') {
      return <Users size={14} color={colors.purple[600]} />;
    }
    return null;
  };

  const getRoleColor = (role: string, gender?: 'Male' | 'Female' | null) => {
    if (role === 'athlete') {
      return gender === 'Female' ? colors.pink[100] : colors.blue[100];
    }
    if (['owner', 'director', 'admin'].includes(role)) return colors.amber[100];
    if (role === 'coach') return colors.blue[100];
    if (role === 'parent') return colors.purple[100];
    return colors.slate[100];
  };

  const getRoleTextColor = (role: string, gender?: 'Male' | 'Female' | null) => {
    if (role === 'athlete') {
      return gender === 'Female' ? colors.pink[600] : colors.blue[600];
    }
    if (['owner', 'director', 'admin'].includes(role)) return colors.amber[600];
    if (role === 'coach') return colors.blue[600];
    if (role === 'parent') return colors.purple[600];
    return colors.slate[600];
  };

  const renderMember = ({ item }: { item: DisplayMember }) => {
    const canNavigate = item.type === 'gymnast_profile' &&
      (isStaff() || linkedGymnasts.some((g) => g.id === item.id));

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => handleMemberPress(item)}
        activeOpacity={canNavigate ? 0.7 : 1}
        disabled={!canNavigate}
      >
        <View style={[styles.avatar, { backgroundColor: getRoleColor(item.role, item.gender) }]}>
          <Text style={[styles.avatarText, { color: getRoleTextColor(item.role, item.gender) }]}>
            {getInitials(item.name)}
          </Text>
        </View>
        <View style={styles.memberInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.memberName} numberOfLines={1}>
              {item.name}
            </Text>
            {getRoleIcon(item.role)}
          </View>
          <View style={styles.detailsRow}>
            {item.level && (
              <Badge label={item.level} variant="neutral" size="sm" />
            )}
            {item.role !== 'athlete' && (
              <Badge
                label={item.role.charAt(0).toUpperCase() + item.role.slice(1)}
                variant="neutral"
                size="sm"
              />
            )}
          </View>
          {/* Show guardian info for gymnasts (staff only) */}
          {item.type === 'gymnast_profile' && isStaff() && item.guardian_name && (
            <View style={styles.guardianRow}>
              <Text style={styles.guardianName}>{item.guardian_name}</Text>
              {item.guardian_phone && (
                <View style={styles.contactItem}>
                  <Phone size={12} color={colors.slate[400]} />
                  <Text style={styles.contactText}>{item.guardian_phone}</Text>
                </View>
              )}
            </View>
          )}
          {/* Show email for non-gymnasts */}
          {item.type === 'hub_member' && item.email && (
            <View style={styles.contactItem}>
              <Mail size={12} color={colors.slate[400]} />
              <Text style={styles.contactText} numberOfLines={1}>{item.email}</Text>
            </View>
          )}
        </View>
        {canNavigate && (
          <ChevronRight size={20} color={colors.slate[400]} />
        )}
      </TouchableOpacity>
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
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { flex: 1 }]}>
            <Search size={20} color={colors.slate[400]} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members..."
              placeholderTextColor={colors.slate[400]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          {isStaff() && (
            <TouchableOpacity
              style={styles.floorMusicBtn}
              onPress={() => router.push('/roster/floor-music')}
            >
              <Music size={18} color={colors.purple[600]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Member Type Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Level Filter (only for gymnasts tab) */}
      {levels.length > 0 && activeTab === 'Gymnasts' && isStaff() && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterList}>
            <TouchableOpacity
              style={[styles.filterChip, selectedLevel === null && styles.filterChipActive]}
              onPress={() => setSelectedLevel(null)}
            >
              <Text style={[styles.filterChipText, selectedLevel === null && styles.filterChipTextActive]}>
                All Levels
              </Text>
            </TouchableOpacity>
            {levels.map((level) => (
              <TouchableOpacity
                key={level}
                style={[styles.filterChip, selectedLevel === level && styles.filterChipActive]}
                onPress={() => setSelectedLevel(level)}
              >
                <Text style={[styles.filterChipText, selectedLevel === level && styles.filterChipTextActive]}>
                  {level}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Member List */}
      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No members found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedLevel
                ? 'Try adjusting your filters'
                : 'No members in this category'}
            </Text>
          </View>
        }
      />
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
  searchContainer: {
    padding: 16,
    paddingBottom: 12,
    backgroundColor: colors.white,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floorMusicBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.purple[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.slate[900],
  },
  tabsContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tabsContent: {
    paddingHorizontal: 12,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.light.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
  filterChipTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  guardianRow: {
    marginTop: 4,
  },
  guardianName: {
    fontSize: 13,
    color: colors.slate[600],
    marginBottom: 2,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  contactText: {
    fontSize: 12,
    color: colors.slate[500],
    flex: 1,
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
});
