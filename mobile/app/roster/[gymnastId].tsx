import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  User,
  Calendar,
  Target,
  BarChart3,
  Award,
  Phone,
  Mail,
  Heart,
} from 'lucide-react-native';
import { format, parseISO, differenceInYears } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface Guardian {
  name?: string;
  email?: string;
  phone?: string;
  relationship?: string;
}

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
  date_of_birth: string | null;
  schedule_group: string | null;
  guardian_1: Guardian | null;
  guardian_2: Guardian | null;
}

interface RecentScore {
  id: string;
  event: string;
  score: number;
  competition_name: string;
  competition_date: string;
}

interface SkillSummary {
  event: string;
  total: number;
  compete_ready: number;
}

type Tab = 'overview' | 'skills' | 'scores';

export default function GymnastProfileScreen() {
  const { gymnastId } = useLocalSearchParams<{ gymnastId: string }>();
  const [gymnast, setGymnast] = useState<GymnastProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
  const [skillSummary, setSkillSummary] = useState<SkillSummary[]>([]);

  const { currentHub } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);

  const WAG_EVENTS = ['vault', 'bars', 'beam', 'floor'];
  const MAG_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

  useEffect(() => {
    if (gymnastId) {
      fetchGymnastData();
    }
  }, [gymnastId]);

  const fetchGymnastData = async () => {
    if (!gymnastId || !currentHub) return;

    try {
      // Fetch gymnast profile
      const { data: gymnastData, error: gymnastError } = await supabase
        .from('gymnast_profiles')
        .select('*')
        .eq('id', gymnastId)
        .single();

      if (gymnastError) throw gymnastError;
      setGymnast(gymnastData);

      // Fetch recent scores
      const { data: scoresData } = await supabase
        .from('competition_scores')
        .select(`
          id,
          event,
          score,
          competitions(name, start_date)
        `)
        .eq('gymnast_profile_id', gymnastId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (scoresData) {
        const mapped = scoresData.map((s: any) => ({
          id: s.id,
          event: s.event,
          score: s.score,
          competition_name: s.competitions?.name || 'Unknown',
          competition_date: s.competitions?.start_date || '',
        }));
        setRecentScores(mapped);
      }

      // Fetch skill summary
      const events = gymnastData?.gender === 'Female' ? WAG_EVENTS : MAG_EVENTS;
      const { data: skillsData } = await supabase
        .from('gymnast_skills')
        .select('event, status')
        .eq('gymnast_profile_id', gymnastId);

      if (skillsData) {
        const summary = events.map(event => {
          const eventSkills = skillsData.filter(s => s.event === event);
          return {
            event,
            total: eventSkills.length,
            compete_ready: eventSkills.filter(s => s.status === 'compete_ready').length,
          };
        });
        setSkillSummary(summary);
      }
    } catch (err) {
      console.error('Error fetching gymnast data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchGymnastData();
  };

  const getAge = (dob: string | null) => {
    if (!dob) return null;
    try {
      return differenceInYears(new Date(), parseISO(dob));
    } catch {
      return null;
    }
  };

  const getEventLabel = (event: string) => {
    const labels: Record<string, string> = {
      vault: 'VT',
      bars: 'UB',
      beam: 'BB',
      floor: 'FX',
      pommel: 'PH',
      rings: 'SR',
      pbars: 'PB',
      highbar: 'HB',
    };
    return labels[event] || event;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!gymnast) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Gymnast not found</Text>
      </View>
    );
  }

  const age = getAge(gymnast.date_of_birth);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: gymnast.gender === 'Female' ? colors.pink[100] : colors.blue[100] },
          ]}
        >
          <Text
            style={[
              styles.avatarText,
              { color: gymnast.gender === 'Female' ? colors.pink[600] : colors.blue[600] },
            ]}
          >
            {gymnast.first_name[0]}{gymnast.last_name[0]}
          </Text>
        </View>
        <Text style={styles.gymnastName}>
          {gymnast.first_name} {gymnast.last_name}
        </Text>
        <View style={styles.badgeRow}>
          {gymnast.level && <Badge label={gymnast.level} variant="primary" />}
          {age && <Badge label={`${age} years old`} variant="neutral" />}
          <Badge label={gymnast.gender} variant="neutral" />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'overview' && styles.tabActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'skills' && styles.tabActive]}
          onPress={() => setActiveTab('skills')}
        >
          <Text style={[styles.tabText, activeTab === 'skills' && styles.tabTextActive]}>
            Skills
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'scores' && styles.tabActive]}
          onPress={() => setActiveTab('scores')}
        >
          <Text style={[styles.tabText, activeTab === 'scores' && styles.tabTextActive]}>
            Scores
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'overview' && (
          <>
            {/* Quick Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Target size={20} color={colors.brand[600]} />
                <Text style={styles.statValue}>
                  {skillSummary.reduce((sum, s) => sum + s.compete_ready, 0)}
                </Text>
                <Text style={styles.statLabel}>Skills Ready</Text>
              </View>
              <View style={styles.statCard}>
                <BarChart3 size={20} color={colors.amber[600]} />
                <Text style={styles.statValue}>{recentScores.length}</Text>
                <Text style={styles.statLabel}>Recent Scores</Text>
              </View>
            </View>

            {/* Guardian Info - Staff Only */}
            {isStaff() && (gymnast.guardian_1 || gymnast.guardian_2) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Guardian Information</Text>
                <View style={styles.card}>
                  {gymnast.guardian_1?.name && (
                    <View style={styles.guardianItem}>
                      <Text style={styles.guardianName}>
                        {gymnast.guardian_1.name}
                        {gymnast.guardian_1.relationship && (
                          <Text style={styles.guardianRelation}> ({gymnast.guardian_1.relationship})</Text>
                        )}
                      </Text>
                      {gymnast.guardian_1.phone && (
                        <View style={styles.contactRow}>
                          <Phone size={14} color={colors.slate[400]} />
                          <Text style={styles.contactText}>{gymnast.guardian_1.phone}</Text>
                        </View>
                      )}
                      {gymnast.guardian_1.email && (
                        <View style={styles.contactRow}>
                          <Mail size={14} color={colors.slate[400]} />
                          <Text style={styles.contactText}>{gymnast.guardian_1.email}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {gymnast.guardian_2?.name && (
                    <View style={[styles.guardianItem, { marginTop: 16 }]}>
                      <Text style={styles.guardianName}>{gymnast.guardians.g2_name}</Text>
                      {gymnast.guardians.g2_phone && (
                        <View style={styles.contactRow}>
                          <Phone size={14} color={colors.slate[400]} />
                          <Text style={styles.contactText}>{gymnast.guardians.g2_phone}</Text>
                        </View>
                      )}
                      {gymnast.guardians.g2_email && (
                        <View style={styles.contactRow}>
                          <Mail size={14} color={colors.slate[400]} />
                          <Text style={styles.contactText}>{gymnast.guardians.g2_email}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )}
          </>
        )}

        {activeTab === 'skills' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills by Event</Text>
            {skillSummary.map((summary) => (
              <View key={summary.event} style={styles.skillEventCard}>
                <View style={styles.skillEventHeader}>
                  <Text style={styles.skillEventName}>{getEventLabel(summary.event)}</Text>
                  <Text style={styles.skillEventCount}>
                    {summary.compete_ready} / {summary.total} ready
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: summary.total > 0
                          ? `${(summary.compete_ready / summary.total) * 100}%`
                          : '0%',
                      },
                    ]}
                  />
                </View>
              </View>
            ))}
            {skillSummary.length === 0 && (
              <Text style={styles.emptyText}>No skills tracked yet</Text>
            )}
          </View>
        )}

        {activeTab === 'scores' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Competition Scores</Text>
            {recentScores.map((score) => (
              <View key={score.id} style={styles.scoreCard}>
                <View style={styles.scoreHeader}>
                  <Badge label={getEventLabel(score.event)} variant="neutral" size="sm" />
                  <Text style={styles.scoreValue}>{score.score.toFixed(3)}</Text>
                </View>
                <Text style={styles.scoreCompetition}>{score.competition_name}</Text>
                {score.competition_date && (
                  <Text style={styles.scoreDate}>
                    {format(parseISO(score.competition_date), 'MMM d, yyyy')}
                  </Text>
                )}
              </View>
            ))}
            {recentScores.length === 0 && (
              <Text style={styles.emptyText}>No scores recorded yet</Text>
            )}
          </View>
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
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
  errorText: {
    fontSize: 16,
    color: colors.slate[500],
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  gymnastName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.light.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: theme.light.primary,
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.slate[900],
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  guardianItem: {},
  guardianName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    color: colors.slate[600],
  },
  skillEventCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  skillEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  skillEventName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  skillEventCount: {
    fontSize: 14,
    color: colors.slate[500],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.slate[100],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.emerald[500],
    borderRadius: 3,
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
    marginBottom: 6,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
  },
  scoreCompetition: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  scoreDate: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[400],
    textAlign: 'center',
    paddingVertical: 20,
  },
});
