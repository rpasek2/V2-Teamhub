import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  Calendar,
  Target,
  LayoutGrid,
} from 'lucide-react-native';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

// Assignment event types
type AssignmentEventType = 'vault' | 'bars' | 'beam' | 'floor' | 'strength' | 'flexibility' | 'conditioning';

const EVENT_ORDER: AssignmentEventType[] = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

const EVENT_LABELS: Record<AssignmentEventType, string> = {
  vault: 'Vault',
  bars: 'Bars',
  beam: 'Beam',
  floor: 'Floor',
  strength: 'Strength',
  flexibility: 'Flexibility',
  conditioning: 'Conditioning',
};

const getEventColors = (dark: boolean): Record<AssignmentEventType, { bg: string; text: string }> => dark ? {
  vault: { bg: colors.purple[700] + '30', text: colors.purple[400] },
  bars: { bg: colors.blue[700] + '30', text: colors.blue[400] },
  beam: { bg: colors.rose[700] + '30', text: colors.rose[400] },
  floor: { bg: colors.emerald[700] + '30', text: colors.emerald[400] },
  strength: { bg: colors.amber[700] + '30', text: colors.amber[500] },
  flexibility: { bg: colors.cyan[700] + '30', text: colors.cyan[400] },
  conditioning: { bg: colors.orange[700] + '30', text: colors.orange[400] },
} : {
  vault: { bg: colors.purple[100], text: colors.purple[700] },
  bars: { bg: colors.blue[100], text: colors.blue[700] },
  beam: { bg: colors.rose[100], text: colors.rose[700] },
  floor: { bg: colors.emerald[100], text: colors.emerald[700] },
  strength: { bg: colors.amber[100], text: colors.amber[700] },
  flexibility: { bg: colors.cyan[100], text: colors.cyan[700] },
  conditioning: { bg: colors.orange[100], text: colors.orange[700] },
};

interface Assignment {
  id: string;
  gymnast_profile_id: string;
  gymnast_name: string;
  gymnast_level: string | null;
  date: string;
  vault: string | null;
  bars: string | null;
  beam: string | null;
  floor: string | null;
  strength: string | null;
  flexibility: string | null;
  conditioning: string | null;
  completed_items: Record<string, number[]>;
  notes: string | null;
}

interface SideStation {
  id: string;
  content: string;
}

interface MainStation {
  id: string;
  content: string;
  side_stations: SideStation[];
}

interface StationAssignment {
  id: string;
  hub_id: string;
  date: string;
  level: string;
  event: AssignmentEventType;
  stations: MainStation[];
}

const LEVEL_ORDER = [
  'Pre-Team', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5',
  'Level 6', 'Level 7', 'Level 8', 'Level 9', 'Level 10',
];

interface ProgressStats {
  totalExercises: number;
  completedExercises: number;
  percentage: number;
}

// Calculate progress for an assignment
function calculateProgress(assignment: Assignment): ProgressStats {
  let total = 0;
  let completed = 0;

  EVENT_ORDER.forEach((event) => {
    const content = assignment[event];
    if (content && content.trim()) {
      const exercises = content.split('\n').filter((line) => line.trim());
      total += exercises.length;
      completed += (assignment.completed_items?.[event] || []).length;
    }
  });

  return {
    totalExercises: total,
    completedExercises: completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Calculate overall stats for all assignments
function calculateOverallStats(assignments: Assignment[]): ProgressStats {
  let total = 0;
  let completed = 0;

  assignments.forEach((assignment) => {
    const progress = calculateProgress(assignment);
    total += progress.totalExercises;
    completed += progress.completedExercises;
  });

  return {
    totalExercises: total,
    completedExercises: completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

// Progress Bar Component
function ProgressBar({ percentage }: { percentage: number }) {
  const { t } = useTheme();
  return (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBarBg, { backgroundColor: t.surfaceSecondary }]}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={[styles.progressPercentage, { color: t.textSecondary }]}>{percentage}%</Text>
    </View>
  );
}

// Stats Dashboard Component
function StatsDashboard({ stats, assignmentCount }: { stats: ProgressStats; assignmentCount: number }) {
  const { t } = useTheme();
  return (
    <View style={[styles.statsContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.text }]}>{assignmentCount}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>{assignmentCount === 1 ? 'Gymnast' : 'Gymnasts'}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.text }]}>{stats.completedExercises}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Completed</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: t.text }]}>{stats.totalExercises}</Text>
          <Text style={[styles.statLabel, { color: t.textMuted }]}>Total</Text>
        </View>
      </View>
      <ProgressBar percentage={stats.percentage} />
    </View>
  );
}

// Exercise Item Component
function ExerciseItem({
  exercise,
  isCompleted,
  onToggle,
  canToggle,
  toggling,
}: {
  exercise: string;
  isCompleted: boolean;
  onToggle: () => void;
  canToggle: boolean;
  toggling: boolean;
}) {
  const { t, isDark } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.exerciseItem, isCompleted && { backgroundColor: isDark ? colors.emerald[700] + '15' : colors.emerald[50] }]}
      onPress={canToggle ? onToggle : undefined}
      disabled={!canToggle || toggling}
      activeOpacity={canToggle ? 0.7 : 1}
    >
      {toggling ? (
        <ActivityIndicator size="small" color={t.primary} style={styles.exerciseCheckbox} />
      ) : isCompleted ? (
        <CheckCircle2 size={22} color={isDark ? colors.emerald[400] : colors.emerald[500]} style={styles.exerciseCheckbox} />
      ) : (
        <Circle size={22} color={t.textFaint} style={styles.exerciseCheckbox} />
      )}
      <Text style={[styles.exerciseText, { color: t.textSecondary }, isCompleted && { color: t.textFaint, textDecorationLine: 'line-through' as const }]}>
        {exercise}
      </Text>
    </TouchableOpacity>
  );
}

// Event Card Component
function EventCard({
  event,
  exercises,
  completedIndices,
  canToggle,
  onToggleExercise,
  togglingIndex,
}: {
  event: AssignmentEventType;
  exercises: string[];
  completedIndices: number[];
  canToggle: boolean;
  onToggleExercise: (index: number) => void;
  togglingIndex: number | null;
}) {
  const { t, isDark } = useTheme();
  const eventColor = getEventColors(isDark)[event];
  const completedCount = completedIndices.length;
  const totalCount = exercises.length;

  return (
    <View style={[styles.eventCard, { backgroundColor: t.background }]}>
      <View style={styles.eventHeader}>
        <View style={[styles.eventBadge, { backgroundColor: eventColor.bg }]}>
          <Text style={[styles.eventBadgeText, { color: eventColor.text }]}>
            {EVENT_LABELS[event]}
          </Text>
        </View>
        <Text style={[styles.eventProgress, { color: t.textMuted }]}>
          {completedCount}/{totalCount}
        </Text>
      </View>
      <View style={styles.exercisesList}>
        {exercises.map((exercise, index) => (
          <ExerciseItem
            key={index}
            exercise={exercise}
            isCompleted={completedIndices.includes(index)}
            onToggle={() => onToggleExercise(index)}
            canToggle={canToggle}
            toggling={togglingIndex === index}
          />
        ))}
      </View>
    </View>
  );
}

// Station Card Component — displays stations for a level+event
function StationEventCard({ station }: { station: StationAssignment }) {
  const { t, isDark } = useTheme();
  const eventColor = getEventColors(isDark)[station.event];

  return (
    <View style={stationStyles.eventSection}>
      <View style={[stationStyles.eventBadge, { backgroundColor: eventColor.bg }]}>
        <Text style={[stationStyles.eventBadgeText, { color: eventColor.text }]}>
          {EVENT_LABELS[station.event]}
        </Text>
        <Text style={[stationStyles.stationCount, { color: eventColor.text }]}>
          {station.stations.length} station{station.stations.length !== 1 ? 's' : ''}
        </Text>
      </View>
      {station.stations.map((main, idx) => (
        <View key={main.id} style={[stationStyles.mainStation, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={stationStyles.stationHeader}>
            <View style={[stationStyles.stationNumber, { backgroundColor: isDark ? colors.slate[500] : colors.slate[600] }]}>
              <Text style={stationStyles.stationNumberText}>{idx + 1}</Text>
            </View>
            <Text style={[stationStyles.stationLabel, { color: t.textMuted }]}>Station {idx + 1}</Text>
          </View>
          <Text style={[stationStyles.stationContent, { color: t.textSecondary }]}>{main.content}</Text>
          {main.side_stations && main.side_stations.length > 0 && (
            <View style={[stationStyles.sideStationsContainer, { borderTopColor: t.borderSubtle }]}>
              {main.side_stations.map((side, sIdx) => (
                <View key={side.id} style={[stationStyles.sideStation, { backgroundColor: isDark ? colors.amber[700] + '15' : colors.amber[50], borderColor: isDark ? colors.amber[700] + '30' : colors.amber[200] }]}>
                  <Text style={[stationStyles.sideStationLabel, { color: isDark ? colors.amber[500] : colors.amber[700] }]}>Side {sIdx + 1}</Text>
                  <Text style={[stationStyles.sideStationContent, { color: t.textSecondary }]}>{side.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

// Station Card for a full level — groups all events for that level
function LevelStationCard({ level, stations }: { level: string; stations: StationAssignment[] }) {
  const { t, isDark } = useTheme();
  return (
    <View style={[stationStyles.card, { backgroundColor: isDark ? colors.amber[700] + '15' : colors.amber[50], borderColor: isDark ? colors.amber[700] + '30' : colors.amber[200] }]}>
      <View style={stationStyles.cardHeader}>
        <LayoutGrid size={18} color={isDark ? colors.amber[500] : colors.amber[600]} />
        <Text style={[stationStyles.cardTitle, { color: t.text }]}>Stations — {level}</Text>
      </View>
      {stations.map((s) => (
        <StationEventCard key={s.id} station={s} />
      ))}
    </View>
  );
}

// Assignment Card Component
function AssignmentCard({
  assignment,
  canToggle,
  onToggleExercise,
  togglingState,
}: {
  assignment: Assignment;
  canToggle: boolean;
  onToggleExercise: (assignmentId: string, event: AssignmentEventType, index: number) => void;
  togglingState: { assignmentId: string; event: string; index: number } | null;
}) {
  const { t, isDark } = useTheme();
  const progress = calculateProgress(assignment);
  const isComplete = progress.percentage === 100;

  // Get events that have content
  const activeEvents = EVENT_ORDER.filter((event) => {
    const content = assignment[event];
    return content && content.trim();
  });

  return (
    <View style={[styles.assignmentCard, { backgroundColor: t.surface, borderColor: t.border }, isComplete && { borderColor: isDark ? colors.emerald[700] : colors.emerald[200], backgroundColor: isDark ? colors.emerald[700] + '10' : colors.emerald[50] }]}>
      <View style={styles.assignmentHeader}>
        <View style={styles.gymnastInfo}>
          <Text style={[styles.gymnastName, { color: t.text }]}>{assignment.gymnast_name}</Text>
          {assignment.gymnast_level && (
            <Badge label={assignment.gymnast_level} variant="neutral" size="sm" />
          )}
        </View>
        <View style={[styles.headerProgress, { backgroundColor: t.surfaceSecondary }]}>
          <Text style={[styles.headerProgressText, { color: t.textSecondary }, isComplete && { color: isDark ? colors.emerald[400] : colors.emerald[600] }]}>
            {progress.percentage}%
          </Text>
        </View>
      </View>

      {isComplete && (
        <View style={[styles.completeBanner, { backgroundColor: isDark ? colors.emerald[700] + '20' : colors.emerald[100] }]}>
          <CheckCircle2 size={16} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
          <Text style={[styles.completeBannerText, { color: isDark ? colors.emerald[400] : colors.emerald[700] }]}>All exercises complete!</Text>
        </View>
      )}

      {activeEvents.length > 0 ? (
        <View style={styles.eventsContainer}>
          {activeEvents.map((event) => {
            const content = assignment[event];
            const exercises = content!.split('\n').filter((line) => line.trim());
            const completedIndices = assignment.completed_items?.[event] || [];
            const isToggling =
              togglingState?.assignmentId === assignment.id && togglingState?.event === event;

            return (
              <EventCard
                key={event}
                event={event}
                exercises={exercises}
                completedIndices={completedIndices}
                canToggle={canToggle}
                onToggleExercise={(index) => onToggleExercise(assignment.id, event, index)}
                togglingIndex={isToggling ? togglingState.index : null}
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.noExercises}>
          <Text style={[styles.noExercisesText, { color: t.textFaint }]}>No exercises assigned</Text>
        </View>
      )}

      {assignment.notes && (
        <View style={[styles.notesSection, { borderTopColor: t.border }]}>
          <Text style={[styles.notesLabel, { color: t.textMuted }]}>Notes:</Text>
          <Text style={[styles.notesText, { color: t.textSecondary }]}>{assignment.notes}</Text>
        </View>
      )}
    </View>
  );
}

export default function AssignmentsScreen() {
  const { t, isDark } = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stations, setStations] = useState<StationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [togglingState, setTogglingState] = useState<{
    assignmentId: string;
    event: string;
    index: number;
  } | null>(null);

  const currentHub = useHubStore((state) => state.currentHub);
  const linkedGymnasts = useHubStore((state) => state.linkedGymnasts);
  const isStaff = useHubStore((state) => state.isStaff);
  const canEdit = useHubStore((state) => state.canEdit);
  const isParent = useHubStore((state) => state.isParent);

  // Check if parents can toggle (hub setting)
  const allowParentToggle = currentHub?.settings?.allowParentToggle !== false;
  const canToggle = canEdit() || (isParent() && allowParentToggle);

  const dateString = format(currentDate, 'yyyy-MM-dd');

  const fetchAssignments = useCallback(async () => {
    if (!currentHub) {
      setAssignments([]);
      setStations([]);
      setLoading(false);
      return;
    }

    try {
      // Fetch gymnast assignments and stations in parallel
      const [assignmentRes, stationRes] = await Promise.all([
        supabase
          .from('gymnast_assignments')
          .select(`
            id,
            gymnast_profile_id,
            date,
            vault,
            bars,
            beam,
            floor,
            strength,
            flexibility,
            conditioning,
            completed_items,
            notes,
            gymnast_profiles!inner(
              first_name,
              last_name,
              level,
              hub_id
            )
          `)
          .eq('date', dateString)
          .eq('gymnast_profiles.hub_id', currentHub.id)
          .then(res => {
            // Apply parent filter
            if (isParent() && linkedGymnasts.length > 0) {
              // Re-query with filter — can't chain after .then
              return res;
            }
            return res;
          }),
        supabase
          .from('station_assignments')
          .select('*')
          .eq('hub_id', currentHub.id)
          .eq('date', dateString)
          .order('created_at', { ascending: true }),
      ]);

      // Handle assignments
      if (assignmentRes.error) {
        console.error('Error fetching assignments:', assignmentRes.error);
        setAssignments([]);
      } else {
        let data = assignmentRes.data || [];
        // Parent filter
        if (isParent() && linkedGymnasts.length > 0) {
          const linkedIds = new Set(linkedGymnasts.map((g) => g.id));
          data = data.filter((a: any) => linkedIds.has(a.gymnast_profile_id));
        }
        const mapped: Assignment[] = data.map((a: any) => ({
          id: a.id,
          gymnast_profile_id: a.gymnast_profile_id,
          gymnast_name: `${a.gymnast_profiles.first_name} ${a.gymnast_profiles.last_name}`,
          gymnast_level: a.gymnast_profiles.level,
          date: a.date,
          vault: a.vault,
          bars: a.bars,
          beam: a.beam,
          floor: a.floor,
          strength: a.strength,
          flexibility: a.flexibility,
          conditioning: a.conditioning,
          completed_items: a.completed_items || {},
          notes: a.notes,
        }));
        mapped.sort((a, b) => a.gymnast_name.localeCompare(b.gymnast_name));
        setAssignments(mapped);
      }

      // Handle stations
      if (stationRes.error) {
        console.error('Error fetching stations:', stationRes.error);
        setStations([]);
      } else {
        setStations((stationRes.data || []) as StationAssignment[]);
      }
    } catch (err) {
      console.error('Error:', err);
      setAssignments([]);
      setStations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentHub, dateString, isParent, linkedGymnasts]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssignments();
  };

  // Group stations by level
  const stationsByLevel = useMemo(() => {
    const groups: Record<string, StationAssignment[]> = {};
    stations.forEach((s) => {
      if (!groups[s.level]) groups[s.level] = [];
      groups[s.level].push(s);
    });
    return groups;
  }, [stations]);

  const goToPrevDay = () => {
    setCurrentDate(subDays(currentDate, 1));
  };

  const goToNextDay = () => {
    setCurrentDate(addDays(currentDate, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleToggleExercise = async (
    assignmentId: string,
    event: AssignmentEventType,
    exerciseIndex: number
  ) => {
    if (!canToggle || togglingState) return;

    const assignment = assignments.find((a) => a.id === assignmentId);
    if (!assignment) return;

    setTogglingState({ assignmentId, event, index: exerciseIndex });

    try {
      const currentCompleted = assignment.completed_items || {};
      const eventCompleted = currentCompleted[event] || [];

      const newEventCompleted = eventCompleted.includes(exerciseIndex)
        ? eventCompleted.filter((i) => i !== exerciseIndex)
        : [...eventCompleted, exerciseIndex];

      const newCompleted = { ...currentCompleted, [event]: newEventCompleted };

      const { error } = await supabase
        .from('gymnast_assignments')
        .update({ completed_items: newCompleted })
        .eq('id', assignmentId);

      if (error) {
        console.error('Error toggling exercise:', error);
      } else {
        // Update local state
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId ? { ...a, completed_items: newCompleted } : a
          )
        );
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setTogglingState(null);
    }
  };

  const overallStats = calculateOverallStats(assignments);

  // Build grouped list: levels that have stations or assignments
  const groupedByLevel = useMemo(() => {
    const groups: Record<string, Assignment[]> = {};
    assignments.forEach((a) => {
      const level = a.gymnast_level || 'Unknown';
      if (!groups[level]) groups[level] = [];
      groups[level].push(a);
    });
    return groups;
  }, [assignments]);

  const sortedLevels = useMemo(() => {
    const allLevels = new Set([
      ...Object.keys(groupedByLevel),
      ...Object.keys(stationsByLevel),
    ]);
    return Array.from(allLevels).sort((a, b) => {
      const aIdx = LEVEL_ORDER.indexOf(a);
      const bIdx = LEVEL_ORDER.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });
  }, [groupedByLevel, stationsByLevel]);

  const hasContent = assignments.length > 0 || stations.length > 0;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Date Navigator */}
      <View style={[styles.dateNav, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.navButton}>
          <ChevronLeft size={24} color={t.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
          <Calendar size={18} color={t.textMuted} />
          <Text style={[styles.dateText, { color: t.text }]}>
            {isToday(currentDate) ? 'Today' : format(currentDate, 'EEE, MMM d')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <ChevronRight size={24} color={t.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Stats Dashboard */}
      {assignments.length > 0 && (
        <StatsDashboard stats={overallStats} assignmentCount={assignments.length} />
      )}

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {!hasContent ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.slate[700] : colors.slate[100] }]}>
              <ClipboardList size={48} color={t.textFaint} />
            </View>
            <Text style={[styles.emptyTitle, { color: t.text }]}>No assignments</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No assignments for {format(currentDate, 'MMMM d, yyyy')}
            </Text>
          </View>
        ) : (
          sortedLevels.map((level) => {
            const levelStations = stationsByLevel[level] || [];
            const levelAssignments = groupedByLevel[level] || [];

            return (
              <View key={level} style={styles.levelSection}>
                {/* Level Header */}
                <View style={styles.levelHeader}>
                  <Text style={[styles.levelTitle, { color: t.text }]}>{level}</Text>
                  <View style={[styles.levelDivider, { backgroundColor: t.border }]} />
                  {levelAssignments.length > 0 && (
                    <Text style={[styles.levelCount, { color: t.textMuted }]}>
                      {levelAssignments.length} gymnast{levelAssignments.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>

                {/* Stations for this level */}
                {levelStations.length > 0 && (
                  <LevelStationCard level={level} stations={levelStations} />
                )}

                {/* Gymnast assignment cards */}
                {levelAssignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    canToggle={canToggle}
                    onToggleExercise={handleToggleExercise}
                    togglingState={togglingState}
                  />
                ))}
              </View>
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
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  navButton: {
    padding: 8,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  statsContainer: {
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
  },
  statLabel: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.slate[200],
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: colors.slate[100],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.emerald[500],
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    minWidth: 40,
    textAlign: 'right',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  assignmentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  assignmentCardComplete: {
    borderColor: colors.emerald[200],
    backgroundColor: colors.emerald[50],
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gymnastInfo: {
    flex: 1,
    gap: 4,
  },
  gymnastName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
  },
  headerProgress: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 12,
  },
  headerProgressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[600],
  },
  headerProgressComplete: {
    color: colors.emerald[600],
  },
  completeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.emerald[100],
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  completeBannerText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.emerald[700],
  },
  eventsContainer: {
    gap: 12,
  },
  eventCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    padding: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  eventBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  eventProgress: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[500],
  },
  exercisesList: {
    gap: 6,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  exerciseItemCompleted: {
    backgroundColor: colors.emerald[50],
  },
  exerciseCheckbox: {
    marginRight: 10,
  },
  exerciseText: {
    flex: 1,
    fontSize: 15,
    color: colors.slate[700],
  },
  exerciseTextCompleted: {
    color: colors.slate[400],
    textDecorationLine: 'line-through',
  },
  noExercises: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noExercisesText: {
    fontSize: 14,
    color: colors.slate[400],
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[500],
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  levelSection: {
    marginBottom: 24,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.slate[900],
  },
  levelDivider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  levelCount: {
    fontSize: 13,
    color: colors.slate[500],
  },
});

const stationStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.amber[50],
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  eventSection: {
    marginBottom: 10,
  },
  eventBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 8,
  },
  eventBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  stationCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  mainStation: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  stationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stationNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.slate[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
  stationLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
  },
  stationContent: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  sideStationsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    gap: 6,
  },
  sideStation: {
    backgroundColor: colors.amber[50],
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.amber[200],
  },
  sideStationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.amber[700],
    marginBottom: 2,
  },
  sideStationContent: {
    fontSize: 13,
    color: colors.slate[600],
    lineHeight: 18,
  },
});
