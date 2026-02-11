import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BarChart3, Trophy, ChevronDown, ChevronRight, X } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore, type ChampionshipType } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { getQualifyingLevels } from '../../src/lib/qualifyingScores';
import { QualifyingBadges } from '../../src/components/scores/QualifyingBadge';

interface Competition {
  id: string;
  name: string;
  start_date: string;
  championship_type: ChampionshipType;
}

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female';
}

interface CompetitionScore {
  id: string;
  gymnast_profile_id: string;
  event: string;
  score: number | null;
  placement: number | null;
}

type GymEvent = 'vault' | 'bars' | 'beam' | 'floor' | 'pommel' | 'rings' | 'pbars' | 'highbar';

const WAG_EVENTS: GymEvent[] = ['vault', 'bars', 'beam', 'floor'];
const MAG_EVENTS: GymEvent[] = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

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

const EVENT_FULL_NAMES: Record<string, string> = {
  vault: 'Vault',
  bars: 'Uneven Bars',
  beam: 'Balance Beam',
  floor: 'Floor Exercise',
  pommel: 'Pommel Horse',
  rings: 'Still Rings',
  pbars: 'Parallel Bars',
  highbar: 'High Bar',
};

interface LevelSection {
  title: string;
  data: GymnastWithScores[];
  teamScores: Record<string, number | null>;
  teamTotal: number | null;
}

interface GymnastWithScores {
  gymnast: GymnastProfile;
  scores: Record<string, { score: number | null; placement: number | null }>;
  allAround: number | null;
}

interface EditingScore {
  gymnastId: string;
  gymnastName: string;
  gymnastLevel: string | null;
  event: GymEvent;
  currentScore: number | null;
  currentPlacement: number | null;
}

export default function ScoresScreen() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [selectedCompetition, setSelectedCompetition] = useState<Competition | null>(null);
  const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
  const [scores, setScores] = useState<CompetitionScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoresLoading, setScoresLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [activeGender, setActiveGender] = useState<'Female' | 'Male'>('Female');
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  // Edit modal state
  const [editingScore, setEditingScore] = useState<EditingScore | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [placementInput, setPlacementInput] = useState('');
  const [saving, setSaving] = useState(false);

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);
  const { user } = useAuthStore();

  const events: GymEvent[] = activeGender === 'Female' ? WAG_EVENTS : MAG_EVENTS;
  const levels: string[] = currentHub?.settings?.levels || [];
  const maxScore = activeGender === 'Female' ? 10.0 : 16.0;

  useEffect(() => {
    fetchCompetitions();
  }, [currentHub?.id]);

  useEffect(() => {
    if (selectedCompetition) {
      fetchScoresAndGymnasts();
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
        .select('id, name, start_date, championship_type')
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

  const fetchScoresAndGymnasts = async () => {
    if (!selectedCompetition) return;

    setScoresLoading(true);
    try {
      // Fetch gymnasts assigned to this competition
      const { data: gymnastData, error: gymnastError } = await supabase
        .from('competition_gymnasts')
        .select(`
          gymnast_profile_id,
          gymnast_profiles(id, first_name, last_name, level, gender)
        `)
        .eq('competition_id', selectedCompetition.id);

      if (gymnastError) {
        console.error('Error fetching gymnasts:', gymnastError);
      } else {
        const mappedGymnasts: GymnastProfile[] = (gymnastData || [])
          .map((cg: any) => cg.gymnast_profiles)
          .filter((g: any) => g != null);
        setGymnasts(mappedGymnasts);
      }

      // Fetch scores
      const { data: scoreData, error: scoreError } = await supabase
        .from('competition_scores')
        .select('id, gymnast_profile_id, event, score, placement')
        .eq('competition_id', selectedCompetition.id);

      if (scoreError) {
        console.error('Error fetching scores:', scoreError);
        setScores([]);
      } else {
        setScores(scoreData || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setScoresLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScoresAndGymnasts();
  };

  // Check if there are gymnasts of each gender
  const hasGender = (gender: 'Female' | 'Male') => {
    return gymnasts.some((g) => g.gender === gender);
  };

  // Get gymnasts filtered by gender
  const filteredGymnasts = useMemo(() => {
    let result = gymnasts.filter((g) => g.gender === activeGender);

    // For parents, filter to only linked gymnasts
    if (isParent() && !isStaff() && linkedGymnasts.length > 0) {
      const linkedIds = linkedGymnasts.map((lg) => lg.id);
      result = result.filter((g) => linkedIds.includes(g.id));
    }

    return result;
  }, [gymnasts, activeGender, isParent, isStaff, linkedGymnasts]);

  // Get score for a gymnast and event
  const getScore = (gymnastId: string, event: string) => {
    return scores.find((s) => s.gymnast_profile_id === gymnastId && s.event === event);
  };

  // Open edit modal
  const handleEditScore = (
    gymnast: GymnastProfile,
    event: GymEvent,
    currentScore: number | null,
    currentPlacement: number | null
  ) => {
    if (!isStaff()) return;

    setEditingScore({
      gymnastId: gymnast.id,
      gymnastName: `${gymnast.first_name} ${gymnast.last_name}`,
      gymnastLevel: gymnast.level,
      event,
      currentScore,
      currentPlacement,
    });
    setScoreInput(currentScore?.toString() || '');
    setPlacementInput(currentPlacement?.toString() || '');
  };

  // Save score
  const handleSaveScore = async () => {
    if (!editingScore || !selectedCompetition) return;

    const scoreNum = scoreInput ? parseFloat(scoreInput) : null;
    const placementNum = placementInput ? parseInt(placementInput, 10) : null;

    // Validate score
    if (scoreNum !== null) {
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) {
        Alert.alert('Invalid Score', `Score must be between 0 and ${maxScore.toFixed(3)}`);
        return;
      }
    }

    // Validate placement
    if (placementNum !== null) {
      if (isNaN(placementNum) || placementNum < 1) {
        Alert.alert('Invalid Placement', 'Placement must be a positive number');
        return;
      }
    }

    setSaving(true);
    try {
      // Check if a score record exists
      const { data: existingData } = await supabase
        .from('competition_scores')
        .select('id')
        .eq('competition_id', selectedCompetition.id)
        .eq('gymnast_profile_id', editingScore.gymnastId)
        .eq('event', editingScore.event);

      const existing = existingData && existingData.length > 0 ? existingData[0] : null;

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('competition_scores')
          .update({
            score: scoreNum,
            placement: placementNum,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else if (scoreNum !== null || placementNum !== null) {
        // Insert new
        const { error } = await supabase.from('competition_scores').insert({
          competition_id: selectedCompetition.id,
          gymnast_profile_id: editingScore.gymnastId,
          event: editingScore.event,
          score: scoreNum,
          placement: placementNum,
          gymnast_level: editingScore.gymnastLevel,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      // Refresh scores
      await fetchScoresAndGymnasts();
      setEditingScore(null);
    } catch (err) {
      console.error('Error saving score:', err);
      Alert.alert('Error', 'Failed to save score. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Group gymnasts by level and calculate scores
  const sections: LevelSection[] = useMemo(() => {
    const grouped: Record<string, GymnastProfile[]> = {};

    filteredGymnasts.forEach((gymnast) => {
      const level = gymnast.level || 'Unassigned';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(gymnast);
    });

    // Sort levels based on hub settings order
    const sortedLevels = levels.filter((l) => grouped[l]);
    const unlistedLevels = Object.keys(grouped).filter(
      (l) => !levels.includes(l) && l !== 'Unassigned'
    );
    const orderedKeys = [...sortedLevels, ...unlistedLevels];
    if (grouped['Unassigned']) orderedKeys.push('Unassigned');

    return orderedKeys.map((level) => {
      const levelGymnasts = grouped[level].sort((a, b) =>
        (a.last_name || '').localeCompare(b.last_name || '')
      );

      // Calculate team scores (top 3 per event)
      const teamScores: Record<string, number | null> = {};
      let teamTotal = 0;

      events.forEach((event) => {
        const eventScores = levelGymnasts
          .map((g) => {
            const score = getScore(g.id, event);
            return score?.score != null ? Number(score.score) : null;
          })
          .filter((s): s is number => s !== null)
          .sort((a, b) => b - a);

        const topScores = eventScores.slice(0, 3);
        const total = topScores.reduce((sum, s) => sum + s, 0);
        teamScores[event] = topScores.length > 0 ? total : null;

        if (total > 0) {
          teamTotal += total;
        }
      });

      // Map gymnasts with their scores
      const data: GymnastWithScores[] = levelGymnasts.map((gymnast) => {
        const gymnastScores: Record<string, { score: number | null; placement: number | null }> = {};
        let allAroundTotal = 0;
        let hasAllScores = true;

        events.forEach((event) => {
          const score = getScore(gymnast.id, event);
          gymnastScores[event] = {
            score: score?.score ?? null,
            placement: score?.placement ?? null,
          };
          if (score?.score != null) {
            allAroundTotal += Number(score.score);
          } else {
            hasAllScores = false;
          }
        });

        return {
          gymnast,
          scores: gymnastScores,
          allAround: hasAllScores ? allAroundTotal : null,
        };
      });

      return {
        title: level,
        data,
        teamScores,
        teamTotal: teamTotal > 0 ? teamTotal : null,
      };
    });
  }, [filteredGymnasts, scores, events, levels]);

  const toggleLevel = (level: string) => {
    setExpandedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  const formatScore = (score: number | null | undefined): string => {
    if (score == null) return '-';
    return score.toFixed(3);
  };

  const formatPlacement = (placement: number | null | undefined): string => {
    if (placement == null) return '';
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = placement % 100;
    return placement + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  };

  const canEdit = isStaff();

  const qualifyingScores = currentHub?.settings?.qualifyingScores;

  const renderGymnastRow = ({ item }: { item: GymnastWithScores }) => (
    <View style={styles.gymnastRow}>
      <Text style={styles.gymnastName} numberOfLines={1}>
        {item.gymnast.first_name} {item.gymnast.last_name}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scoresScroll}>
        <View style={styles.scoresRow}>
          {events.map((event) => {
            const scoreData = item.scores[event];
            const eventQualifyingLevels = scoreData?.score != null
              ? getQualifyingLevels(
                  scoreData.score,
                  item.gymnast.level,
                  item.gymnast.gender,
                  'individual_event',
                  qualifyingScores,
                  selectedCompetition?.championship_type ?? null
                )
              : [];
            return (
              <TouchableOpacity
                key={event}
                style={[styles.scoreCell, canEdit && styles.scoreCellEditable]}
                onPress={() =>
                  handleEditScore(item.gymnast, event, scoreData?.score, scoreData?.placement)
                }
                disabled={!canEdit}
                activeOpacity={canEdit ? 0.6 : 1}
              >
                <Text style={styles.eventLabel}>{EVENT_LABELS[event]}</Text>
                <View style={styles.scoreWithBadge}>
                  <Text style={styles.scoreValue}>{formatScore(scoreData?.score)}</Text>
                  <QualifyingBadges levels={eventQualifyingLevels} size="sm" />
                </View>
                {scoreData?.placement ? (
                  <Text style={styles.placementBadge}>{formatPlacement(scoreData.placement)}</Text>
                ) : null}
              </TouchableOpacity>
            );
          })}
          <View style={[styles.scoreCell, styles.allAroundCell]}>
            <Text style={styles.eventLabel}>AA</Text>
            <View style={styles.scoreWithBadge}>
              <Text style={[styles.scoreValue, styles.allAroundValue]}>
                {formatScore(item.allAround)}
              </Text>
              {item.allAround != null && (
                <QualifyingBadges
                  levels={getQualifyingLevels(
                    item.allAround,
                    item.gymnast.level,
                    item.gymnast.gender,
                    'all_around',
                    qualifyingScores,
                    selectedCompetition?.championship_type ?? null
                  )}
                  size="sm"
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );

  const renderSectionHeader = ({ section }: { section: LevelSection }) => {
    const isExpanded = expandedLevels.has(section.title);

    return (
      <View>
        {/* Level Header */}
        <TouchableOpacity
          style={styles.levelHeader}
          onPress={() => toggleLevel(section.title)}
          activeOpacity={0.7}
        >
          <View style={styles.levelHeaderLeft}>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.slate[600]} />
            ) : (
              <ChevronRight size={20} color={colors.slate[600]} />
            )}
            <Text style={styles.levelTitle}>{section.title}</Text>
            <Badge label={`${section.data.length}`} variant="neutral" size="sm" />
          </View>
          <Text style={styles.levelTotal}>Team: {formatScore(section.teamTotal)}</Text>
        </TouchableOpacity>

        {/* Team Scores Row */}
        {isExpanded && (
          <View style={styles.teamScoresRow}>
            <Text style={styles.teamLabel}>TEAM</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.scoresScroll}
            >
              <View style={styles.scoresRow}>
                {events.map((event) => (
                  <View key={event} style={styles.teamScoreCell}>
                    <Text style={styles.eventLabel}>{EVENT_LABELS[event]}</Text>
                    <Text style={styles.teamScoreValue}>
                      {formatScore(section.teamScores[event])}
                    </Text>
                  </View>
                ))}
                <View style={[styles.teamScoreCell, styles.allAroundCell]}>
                  <Text style={styles.eventLabel}>AA</Text>
                  <Text style={[styles.teamScoreValue, styles.teamAllAroundValue]}>
                    {formatScore(section.teamTotal)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  // Expand all levels by default when data loads
  useEffect(() => {
    if (sections.length > 0 && expandedLevels.size === 0) {
      setExpandedLevels(new Set(sections.map((s) => s.title)));
    }
  }, [sections]);

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
      <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPicker(!showPicker)}>
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

      {/* Gender Toggle */}
      <View style={styles.genderToggle}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            activeGender === 'Female' && styles.genderButtonActive,
            !hasGender('Female') && styles.genderButtonDisabled,
          ]}
          onPress={() => setActiveGender('Female')}
          disabled={!hasGender('Female')}
        >
          <Text
            style={[
              styles.genderButtonText,
              activeGender === 'Female' && styles.genderButtonTextActive,
            ]}
          >
            Women's
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.genderButton,
            activeGender === 'Male' && styles.genderButtonActive,
            !hasGender('Male') && styles.genderButtonDisabled,
          ]}
          onPress={() => setActiveGender('Male')}
          disabled={!hasGender('Male')}
        >
          <Text
            style={[
              styles.genderButtonText,
              activeGender === 'Male' && styles.genderButtonTextActive,
            ]}
          >
            Men's
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scores List */}
      {scoresLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.light.primary} />
        </View>
      ) : (
        <SectionList
          sections={sections.map((section) => ({
            ...section,
            data: expandedLevels.has(section.title) ? section.data : [],
          }))}
          keyExtractor={(item) => item.gymnast.id}
          renderItem={renderGymnastRow}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <BarChart3 size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No scores</Text>
              <Text style={styles.emptyText}>
                {selectedCompetition
                  ? 'No gymnasts assigned to this competition yet'
                  : 'Select a competition to view scores'}
              </Text>
            </View>
          }
        />
      )}

      {/* Legend */}
      {sections.length > 0 && (
        <View style={styles.legend}>
          <Text style={styles.legendText}>
            {canEdit ? 'Tap a score to edit • ' : ''}Team scores show top 3 per event
          </Text>
        </View>
      )}

      {/* Edit Score Modal */}
      <Modal
        visible={editingScore !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingScore(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditingScore(null)} style={styles.modalCloseButton}>
              <X size={24} color={colors.slate[600]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Score</Text>
            <TouchableOpacity
              onPress={handleSaveScore}
              disabled={saving}
              style={[styles.modalSaveButton, saving && styles.modalSaveButtonDisabled]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.modalSaveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View style={styles.modalContent}>
            {/* Gymnast Info */}
            <View style={styles.modalGymnastInfo}>
              <Text style={styles.modalGymnastName}>{editingScore?.gymnastName}</Text>
              <Text style={styles.modalEventName}>
                {editingScore?.event ? EVENT_FULL_NAMES[editingScore.event] : ''}
              </Text>
            </View>

            {/* Score Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Score</Text>
              <TextInput
                style={styles.input}
                value={scoreInput}
                onChangeText={setScoreInput}
                placeholder="0.000"
                placeholderTextColor={colors.slate[400]}
                keyboardType="decimal-pad"
                autoFocus
              />
              <Text style={styles.inputHint}>Max: {maxScore.toFixed(3)}</Text>
            </View>

            {/* Placement Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Placement (Optional)</Text>
              <TextInput
                style={styles.input}
                value={placementInput}
                onChangeText={setPlacementInput}
                placeholder="e.g., 1"
                placeholderTextColor={colors.slate[400]}
                keyboardType="number-pad"
              />
              <Text style={styles.inputHint}>Leave blank if unknown</Text>
            </View>

            {/* Clear Button */}
            {(editingScore?.currentScore !== null || editingScore?.currentPlacement !== null) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setScoreInput('');
                  setPlacementInput('');
                }}
              >
                <Text style={styles.clearButtonText}>Clear Score</Text>
              </TouchableOpacity>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  genderToggle: {
    flexDirection: 'row',
    backgroundColor: colors.slate[100],
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 4,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  genderButtonActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  genderButtonDisabled: {
    opacity: 0.5,
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  genderButtonTextActive: {
    color: colors.slate[900],
  },
  listContent: {
    paddingBottom: 16,
    flexGrow: 1,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.slate[100],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  levelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  levelTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.light.primary,
  },
  teamScoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand[50],
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.brand[100],
  },
  teamLabel: {
    width: 80,
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand[700],
  },
  scoresScroll: {
    flex: 1,
  },
  scoresRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  teamScoreCell: {
    width: 56,
    alignItems: 'center',
  },
  teamScoreValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brand[700],
  },
  teamAllAroundValue: {
    color: colors.brand[800],
  },
  gymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingLeft: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  gymnastName: {
    width: 80,
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[900],
  },
  scoreCell: {
    width: 56,
    alignItems: 'center',
    paddingVertical: 4,
  },
  scoreCellEditable: {
    borderRadius: 6,
  },
  eventLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.slate[400],
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[900],
  },
  scoreWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  placementBadge: {
    fontSize: 10,
    color: colors.amber[600],
    fontWeight: '600',
    marginTop: 2,
  },
  allAroundCell: {
    width: 72,
    borderLeftWidth: 1,
    borderLeftColor: colors.slate[200],
    paddingLeft: 8,
    marginLeft: 4,
  },
  allAroundValue: {
    fontWeight: '600',
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
  legend: {
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  legendText: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: 'center',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  modalCloseButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  modalSaveButton: {
    backgroundColor: theme.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalSaveButtonDisabled: {
    opacity: 0.6,
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  modalContent: {
    padding: 16,
  },
  modalGymnastInfo: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  modalGymnastName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 4,
  },
  modalEventName: {
    fontSize: 14,
    color: colors.slate[500],
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: colors.slate[900],
  },
  inputHint: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
  },
  clearButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.error[600],
    fontWeight: '500',
  },
});
