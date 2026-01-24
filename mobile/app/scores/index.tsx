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
import { BarChart3, Trophy, ChevronDown } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Competition {
  id: string;
  name: string;
  start_date: string;
}

interface Score {
  id: string;
  gymnast_name: string;
  gymnast_level: string | null;
  event: string;
  score: number;
}

const EVENT_LABELS: Record<string, string> = {
  vault: 'VT',
  bars: 'UB',
  beam: 'BB',
  floor: 'FX',
  pommel: 'PH',
  rings: 'SR',
  pbars: 'PB',
  highbar: 'HB',
  all_around: 'AA',
};

export default function ScoresScreen() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const { currentHub } = useHubStore();

  useEffect(() => {
    fetchCompetitions();
  }, [currentHub?.id]);

  useEffect(() => {
    if (selectedCompetition) {
      fetchScores();
    }
  }, [selectedCompetition?.id]);

  const fetchCompetitions = async () => {
    if (!currentHub) {
      setCompetitions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('id, name, start_date')
        .eq('hub_id', currentHub.id)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching competitions:', error);
      } else {
        setCompetitions(data || []);
        if (data && data.length > 0) {
          setSelectedCompetition(data[0]);
        }
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchScores = async () => {
    if (!selectedCompetition) return;

    setScoresLoading(true);
    try {
      const { data, error } = await supabase
        .from('competition_scores')
        .select(`
          id,
          event,
          score,
          gymnast_profiles(first_name, last_name, level)
        `)
        .eq('competition_id', selectedCompetition.id)
        .order('event');

      if (error) {
        console.error('Error fetching scores:', error);
        setScores([]);
      } else {
        const mapped = (data || []).map((s: any) => ({
          id: s.id,
          gymnast_name: `${s.gymnast_profiles?.first_name || ''} ${s.gymnast_profiles?.last_name || ''}`.trim(),
          gymnast_level: s.gymnast_profiles?.level || null,
          event: s.event,
          score: s.score,
        }));
        setScores(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
      setScores([]);
    } finally {
      setScoresLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScores();
  };

  const renderScore = ({ item }: { item: Score }) => (
    <View style={styles.scoreCard}>
      <View style={styles.scoreHeader}>
        <Text style={styles.gymnastName}>{item.gymnast_name}</Text>
        <Text style={styles.scoreValue}>{item.score.toFixed(3)}</Text>
      </View>
      <View style={styles.scoreDetails}>
        <Badge label={EVENT_LABELS[item.event] || item.event} variant="neutral" size="sm" />
        {item.gymnast_level && (
          <Badge label={item.gymnast_level} variant="primary" size="sm" />
        )}
      </View>
    </View>
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
        {/* Competition Picker */}
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowPicker(!showPicker)}
        >
          <View style={styles.pickerContent}>
            <Trophy size={20} color={colors.amber[600]} />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedCompetition?.name || 'Select Competition'}
            </Text>
          </View>
          <ChevronDown size={20} color={colors.slate[400]} />
        </TouchableOpacity>

        {showPicker && (
          <View style={styles.pickerDropdown}>
            {competitions.map((comp) => (
              <TouchableOpacity
                key={comp.id}
                style={[
                  styles.pickerOption,
                  selectedCompetition?.id === comp.id && styles.pickerOptionActive,
                ]}
                onPress={() => {
                  setSelectedCompetition(comp);
                  setShowPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedCompetition?.id === comp.id && styles.pickerOptionTextActive,
                  ]}
                >
                  {comp.name}
                </Text>
                <Text style={styles.pickerOptionDate}>
                  {format(parseISO(comp.start_date), 'MMM d, yyyy')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Scores List */}
        {scoresLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.light.primary} />
          </View>
        ) : (
          <FlatList
            data={scores}
            keyExtractor={(item) => item.id}
            renderItem={renderScore}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <BarChart3 size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No scores</Text>
                <Text style={styles.emptyText}>
                  {selectedCompetition
                    ? 'No scores recorded for this competition yet'
                    : 'Select a competition to view scores'}
                </Text>
              </View>
            }
          />
        )}
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
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  pickerText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  pickerDropdown: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    paddingLeft: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  pickerOptionActive: {
    backgroundColor: colors.brand[50],
  },
  pickerOptionText: {
    fontSize: 15,
    color: colors.slate[700],
  },
  pickerOptionTextActive: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  pickerOptionDate: {
    fontSize: 13,
    color: colors.slate[500],
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  scoreCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  gymnastName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
  },
  scoreDetails: {
    flexDirection: 'row',
    gap: 8,
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
