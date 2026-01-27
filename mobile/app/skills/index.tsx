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
import { Target, ChevronRight } from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface SkillSummary {
  gymnast_id: string;
  gymnast_name: string;
  gymnast_level: string | null;
  total_skills: number;
  compete_ready: number;
  in_progress: number;
}

export default function SkillsScreen() {
  const [skillSummaries, setSkillSummaries] = useState<SkillSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  useEffect(() => {
    fetchSkillSummaries();
  }, [currentHub?.id]);

  const fetchSkillSummaries = async () => {
    if (!currentHub) {
      setSkillSummaries([]);
      setLoading(false);
      return;
    }

    try {
      // Get gymnasts based on role
      let gymnastQuery = supabase
        .from('gymnast_profiles')
        .select('id, first_name, last_name, level')
        .eq('hub_id', currentHub.id);

      if (isParent() && linkedGymnasts.length > 0) {
        const linkedIds = linkedGymnasts.map(g => g.id);
        gymnastQuery = gymnastQuery.in('id', linkedIds);
      }

      const { data: gymnasts, error: gymnastError } = await gymnastQuery;

      if (gymnastError) {
        console.error('Error fetching gymnasts:', gymnastError);
        setSkillSummaries([]);
        return;
      }

      // Get skill counts for each gymnast
      const summaries: SkillSummary[] = [];

      for (const gymnast of gymnasts || []) {
        const { data: skills } = await supabase
          .from('gymnast_skills')
          .select('status')
          .eq('gymnast_profile_id', gymnast.id);

        const skillList = skills || [];
        summaries.push({
          gymnast_id: gymnast.id,
          gymnast_name: `${gymnast.first_name} ${gymnast.last_name}`,
          gymnast_level: gymnast.level,
          total_skills: skillList.length,
          compete_ready: skillList.filter(s => s.status === 'compete_ready').length,
          in_progress: skillList.filter(s => s.status === 'in_progress').length,
        });
      }

      // Sort by level then name
      const levels = currentHub.settings?.levels || [];
      summaries.sort((a, b) => {
        const aIdx = a.gymnast_level ? levels.indexOf(a.gymnast_level) : 999;
        const bIdx = b.gymnast_level ? levels.indexOf(b.gymnast_level) : 999;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.gymnast_name.localeCompare(b.gymnast_name);
      });

      setSkillSummaries(summaries);
    } catch (err) {
      console.error('Error:', err);
      setSkillSummaries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSkillSummaries();
  };

  const getProgressPercentage = (item: SkillSummary) => {
    if (item.total_skills === 0) return 0;
    return Math.round((item.compete_ready / item.total_skills) * 100);
  };

  const renderGymnast = ({ item }: { item: SkillSummary }) => (
    <TouchableOpacity style={styles.gymnastCard} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.gymnastInfo}>
          <Text style={styles.gymnastName}>{item.gymnast_name}</Text>
          {item.gymnast_level && (
            <Badge label={item.gymnast_level} variant="neutral" size="sm" />
          )}
        </View>
        <ChevronRight size={20} color={colors.slate[400]} />
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${getProgressPercentage(item)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {getProgressPercentage(item)}% ready
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.emerald[500] }]} />
          <Text style={styles.statText}>{item.compete_ready} compete ready</Text>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.blue[500] }]} />
          <Text style={styles.statText}>{item.in_progress} in progress</Text>
        </View>
      </View>
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
        <FlatList
          data={skillSummaries}
          keyExtractor={(item) => item.gymnast_id}
          renderItem={renderGymnast}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Target size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No skills tracked</Text>
              <Text style={styles.emptyText}>
                Start tracking gymnast skills to see progress here
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  gymnastCard: {
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gymnastInfo: {
    flex: 1,
    gap: 6,
  },
  gymnastName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  progressSection: {
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.emerald[500],
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    color: colors.slate[600],
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statText: {
    fontSize: 13,
    color: colors.slate[600],
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
