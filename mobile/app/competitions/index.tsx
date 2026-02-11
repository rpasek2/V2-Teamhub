import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Trophy, MapPin, Calendar, Users, ChevronRight } from 'lucide-react-native';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Competition {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
  gymnast_count: number;
}

type FilterTab = 'upcoming' | 'past' | 'all';

export default function CompetitionsScreen() {
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('upcoming');

  const { currentHub } = useHubStore();

  useEffect(() => {
    fetchCompetitions();
  }, [currentHub?.id]);

  const fetchCompetitions = async () => {
    if (!currentHub) {
      setCompetitions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          start_date,
          end_date,
          location,
          competition_gymnasts(count)
        `)
        .eq('hub_id', currentHub.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching competitions:', error);
        setCompetitions([]);
      } else {
        const mapped = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          start_date: c.start_date,
          end_date: c.end_date,
          location: c.location,
          gymnast_count: c.competition_gymnasts?.[0]?.count || 0,
        }));
        setCompetitions(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
      setCompetitions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCompetitions();
  };

  const filteredCompetitions = competitions.filter(comp => {
    const compDate = parseISO(comp.start_date);
    if (activeFilter === 'upcoming') return isFuture(compDate) || format(compDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (activeFilter === 'past') return isPast(compDate) && format(compDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
    return true;
  });

  const renderCompetition = ({ item }: { item: Competition }) => {
    const startDate = parseISO(item.start_date);
    const isUpcoming = isFuture(startDate) || format(startDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    return (
      <TouchableOpacity
        style={styles.competitionCard}
        activeOpacity={0.7}
        onPress={() => router.push(`/competitions/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: colors.amber[50] }]}>
            <Trophy size={20} color={colors.amber[600]} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={styles.competitionName} numberOfLines={1}>{item.name}</Text>
            <Badge
              label={isUpcoming ? 'Upcoming' : 'Past'}
              variant={isUpcoming ? 'success' : 'neutral'}
              size="sm"
            />
          </View>
          <ChevronRight size={20} color={colors.slate[400]} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={colors.slate[400]} />
            <Text style={styles.detailText}>
              {format(startDate, 'MMM d, yyyy')}
              {item.end_date !== item.start_date && ` - ${format(parseISO(item.end_date), 'MMM d, yyyy')}`}
            </Text>
          </View>

          {item.location && (
            <View style={styles.detailRow}>
              <MapPin size={16} color={colors.slate[400]} />
              <Text style={styles.detailText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Users size={16} color={colors.slate[400]} />
            <Text style={styles.detailText}>
              {item.gymnast_count} {item.gymnast_count === 1 ? 'gymnast' : 'gymnasts'}
            </Text>
          </View>
        </View>
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
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setActiveFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'upcoming' && styles.filterTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'past' && styles.filterTabActive]}
          onPress={() => setActiveFilter('past')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'past' && styles.filterTabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Competition List */}
      <FlatList
        data={filteredCompetitions}
        keyExtractor={(item) => item.id}
        renderItem={renderCompetition}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Trophy size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No competitions</Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'upcoming'
                ? 'No upcoming competitions scheduled'
                : activeFilter === 'past'
                ? 'No past competitions'
                : 'No competitions found'}
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.slate[100],
  },
  filterTabActive: {
    backgroundColor: theme.light.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[600],
  },
  filterTabTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  competitionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  competitionName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  cardDetails: {
    gap: 8,
    paddingLeft: 52,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.slate[600],
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
