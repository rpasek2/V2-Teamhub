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
import { Trophy, MapPin, Calendar, Users, ChevronRight, Award, Medal } from 'lucide-react-native';
import { format, parseISO, isPast, isFuture } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
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
  championship_type: 'state' | 'regional' | 'national' | 'unsanctioned' | null;
}

const CHAMPIONSHIP_BADGE: Record<string, { Icon: typeof Award; label: string; bgColor: (isDark: boolean) => string; textColor: (isDark: boolean) => string }> = {
  state: { Icon: Award, label: 'State', bgColor: (d) => d ? colors.blue[700] + '30' : colors.blue[100], textColor: (d) => d ? colors.blue[400] : colors.blue[700] },
  regional: { Icon: Medal, label: 'Regional', bgColor: (d) => d ? colors.purple[700] + '30' : colors.purple[100], textColor: (d) => d ? colors.purple[400] : colors.purple[700] },
  national: { Icon: Trophy, label: 'National', bgColor: (d) => d ? colors.amber[700] + '30' : colors.amber[100], textColor: (d) => d ? colors.amber[500] : colors.amber[700] },
};

type FilterTab = 'upcoming' | 'past' | 'all';

export default function CompetitionsScreen() {
  const { t, isDark } = useTheme();
  const router = useRouter();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('upcoming');

  const currentHub = useHubStore((state) => state.currentHub);

  useEffect(() => {
    fetchCompetitions();
  }, [currentHub?.id]);

  const fetchCompetitions = async () => {
    if (!currentHub) {
      setCompetitions([]);
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select(`
          id,
          name,
          start_date,
          end_date,
          location,
          championship_type,
          competition_gymnasts(count)
        `)
        .eq('hub_id', currentHub.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching competitions:', error);
        setError('Failed to load data. Pull to refresh.');
        setCompetitions([]);
      } else {
        const mapped = (data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          start_date: c.start_date,
          end_date: c.end_date,
          location: c.location,
          championship_type: c.championship_type,
          gymnast_count: c.competition_gymnasts?.[0]?.count || 0,
        }));
        setCompetitions(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load data. Pull to refresh.');
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
    const endDate = parseISO(comp.end_date);
    if (activeFilter === 'upcoming') return isFuture(endDate) || format(endDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
    if (activeFilter === 'past') return isPast(endDate) && format(endDate, 'yyyy-MM-dd') !== format(new Date(), 'yyyy-MM-dd');
    return true;
  });

  const renderCompetition = ({ item }: { item: Competition }) => {
    const endDate = parseISO(item.end_date);
    const isUpcoming = isFuture(endDate) || format(endDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

    return (
      <TouchableOpacity
        style={[styles.competitionCard, { backgroundColor: t.surface, borderColor: t.border }]}
        activeOpacity={0.7}
        onPress={() => router.push(`/competitions/${item.id}` as any)}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: isDark ? colors.amber[700] + '20' : colors.amber[50] }]}>
            <Trophy size={20} color={isDark ? colors.amber[500] : colors.amber[600]} />
          </View>
          <View style={styles.cardHeaderInfo}>
            <Text style={[styles.competitionName, { color: t.text }]} numberOfLines={1}>{item.name}</Text>
            <View style={styles.badgeRow}>
              {item.championship_type && CHAMPIONSHIP_BADGE[item.championship_type] && (() => {
                const badge = CHAMPIONSHIP_BADGE[item.championship_type!];
                const BadgeIcon = badge.Icon;
                return (
                  <View style={[styles.championshipBadge, { backgroundColor: badge.bgColor(isDark) }]}>
                    <BadgeIcon size={10} color={badge.textColor(isDark)} />
                    <Text style={[styles.championshipBadgeText, { color: badge.textColor(isDark) }]}>{badge.label}</Text>
                  </View>
                );
              })()}
              <Badge
                label={isUpcoming ? 'Upcoming' : 'Past'}
                variant={isUpcoming ? 'success' : 'neutral'}
                size="sm"
              />
            </View>
          </View>
          <ChevronRight size={20} color={t.textFaint} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Calendar size={16} color={t.textFaint} />
            <Text style={[styles.detailText, { color: t.textSecondary }]}>
              {format(parseISO(item.start_date), 'MMM d, yyyy')}
              {item.end_date !== item.start_date && ` - ${format(parseISO(item.end_date), 'MMM d, yyyy')}`}
            </Text>
          </View>

          {item.location && (
            <View style={styles.detailRow}>
              <MapPin size={16} color={t.textFaint} />
              <Text style={[styles.detailText, { color: t.textSecondary }]} numberOfLines={1}>{item.location}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <Users size={16} color={t.textFaint} />
            <Text style={[styles.detailText, { color: t.textSecondary }]}>
              {item.gymnast_count} {item.gymnast_count === 1 ? 'gymnast' : 'gymnasts'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
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
      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: t.surfaceSecondary }, activeFilter === 'upcoming' && { backgroundColor: t.primary }]}
          onPress={() => setActiveFilter('upcoming')}
        >
          <Text style={[styles.filterTabText, { color: t.textSecondary }, activeFilter === 'upcoming' && styles.filterTabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: t.surfaceSecondary }, activeFilter === 'past' && { backgroundColor: t.primary }]}
          onPress={() => setActiveFilter('past')}
        >
          <Text style={[styles.filterTabText, { color: t.textSecondary }, activeFilter === 'past' && styles.filterTabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, { backgroundColor: t.surfaceSecondary }, activeFilter === 'all' && { backgroundColor: t.primary }]}
          onPress={() => setActiveFilter('all')}
        >
          <Text style={[styles.filterTabText, { color: t.textSecondary }, activeFilter === 'all' && styles.filterTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={{ marginHorizontal: 16, marginTop: 12, padding: 12, backgroundColor: isDark ? colors.error[700] + '20' : '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: isDark ? colors.error[700] + '40' : '#FECACA' }}>
          <Text style={{ color: isDark ? colors.error[400] : '#DC2626', fontSize: 14 }}>{error}</Text>
        </View>
      )}

      {/* Competition List */}
      <FlatList
        data={filteredCompetitions}
        keyExtractor={(item) => item.id}
        renderItem={renderCompetition}
        contentContainerStyle={styles.listContent}
        windowSize={10}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Trophy size={48} color={t.textFaint} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>No competitions</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
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
    backgroundColor: colors.brand[600],
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  championshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  championshipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
