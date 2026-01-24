import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Search, User, ChevronRight } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Gymnast {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
  date_of_birth: string | null;
}

export default function RosterScreen() {
  const [gymnasts, setGymnasts] = useState<Gymnast[]>([]);
  const [filteredGymnasts, setFilteredGymnasts] = useState<Gymnast[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  const levels = currentHub?.settings?.levels || [];

  useEffect(() => {
    fetchGymnasts();
  }, [currentHub?.id]);

  useEffect(() => {
    filterGymnasts();
  }, [gymnasts, searchQuery, selectedLevel]);

  const fetchGymnasts = async () => {
    if (!currentHub) {
      setGymnasts([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('gymnast_profiles')
        .select('id, first_name, last_name, level, gender, date_of_birth')
        .eq('hub_id', currentHub.id)
        .order('last_name', { ascending: true });

      // Parents only see their linked gymnasts
      if (isParent() && linkedGymnasts.length > 0) {
        const linkedIds = linkedGymnasts.map(g => g.id);
        query = query.in('id', linkedIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching gymnasts:', error);
        setGymnasts([]);
      } else {
        setGymnasts(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
      setGymnasts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterGymnasts = () => {
    let filtered = [...gymnasts];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        g =>
          g.first_name.toLowerCase().includes(query) ||
          g.last_name.toLowerCase().includes(query)
      );
    }

    // Filter by level
    if (selectedLevel) {
      filtered = filtered.filter(g => g.level === selectedLevel);
    }

    // Sort by level order then last name
    filtered.sort((a, b) => {
      const aLevelIndex = a.level ? levels.indexOf(a.level) : 999;
      const bLevelIndex = b.level ? levels.indexOf(b.level) : 999;
      if (aLevelIndex !== bLevelIndex) {
        return aLevelIndex - bLevelIndex;
      }
      return a.last_name.localeCompare(b.last_name);
    });

    setFilteredGymnasts(filtered);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGymnasts();
  };

  const handleGymnastPress = (gymnast: Gymnast) => {
    router.push(`/roster/${gymnast.id}`);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  const renderGymnast = ({ item }: { item: Gymnast }) => (
    <TouchableOpacity
      style={styles.gymnastCard}
      onPress={() => handleGymnastPress(item)}
      activeOpacity={0.7}
    >
      <View style={[styles.avatar, { backgroundColor: item.gender === 'Female' ? colors.pink[100] : colors.blue[100] }]}>
        <Text style={[styles.avatarText, { color: item.gender === 'Female' ? colors.pink[600] : colors.blue[600] }]}>
          {getInitials(item.first_name, item.last_name)}
        </Text>
      </View>
      <View style={styles.gymnastInfo}>
        <Text style={styles.gymnastName}>
          {item.first_name} {item.last_name}
        </Text>
        {item.level && (
          <Badge label={item.level} variant="neutral" size="sm" />
        )}
      </View>
      <ChevronRight size={20} color={colors.slate[400]} />
    </TouchableOpacity>
  );

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
        <View style={styles.searchBar}>
          <Search size={20} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search gymnasts..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Level Filter */}
      {levels.length > 0 && isStaff() && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[null, ...levels]}
            keyExtractor={(item) => item || 'all'}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  selectedLevel === item && styles.filterChipActive,
                ]}
                onPress={() => setSelectedLevel(item)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedLevel === item && styles.filterChipTextActive,
                  ]}
                >
                  {item || 'All'}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {/* Gymnast List */}
      <FlatList
        data={filteredGymnasts}
        keyExtractor={(item) => item.id}
        renderItem={renderGymnast}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <User size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No gymnasts found</Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedLevel
                ? 'Try adjusting your filters'
                : 'Add gymnasts to your roster to see them here'}
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
    paddingBottom: 8,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
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
  filterContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.slate[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.light.primary,
  },
  filterChipText: {
    fontSize: 14,
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
  gymnastCard: {
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
  gymnastInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  gymnastName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
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
