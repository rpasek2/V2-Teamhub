import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
} from 'lucide-react-native';
import { format, addDays, subDays, parseISO, isToday } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
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

const EVENT_COLORS: Record<AssignmentEventType, { bg: string; text: string }> = {
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
  return (
    <View style={styles.progressBarContainer}>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.progressPercentage}>{percentage}%</Text>
    </View>
  );
}

// Stats Dashboard Component
function StatsDashboard({ stats, assignmentCount }: { stats: ProgressStats; assignmentCount: number }) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{assignmentCount}</Text>
          <Text style={styles.statLabel}>{assignmentCount === 1 ? 'Gymnast' : 'Gymnasts'}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.completedExercises}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalExercises}</Text>
          <Text style={styles.statLabel}>Total</Text>
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
  return (
    <TouchableOpacity
      style={[styles.exerciseItem, isCompleted && styles.exerciseItemCompleted]}
      onPress={canToggle ? onToggle : undefined}
      disabled={!canToggle || toggling}
      activeOpacity={canToggle ? 0.7 : 1}
    >
      {toggling ? (
        <ActivityIndicator size="small" color={theme.light.primary} style={styles.exerciseCheckbox} />
      ) : isCompleted ? (
        <CheckCircle2 size={22} color={colors.emerald[500]} style={styles.exerciseCheckbox} />
      ) : (
        <Circle size={22} color={canToggle ? colors.slate[400] : colors.slate[300]} style={styles.exerciseCheckbox} />
      )}
      <Text style={[styles.exerciseText, isCompleted && styles.exerciseTextCompleted]}>
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
  const eventColor = EVENT_COLORS[event];
  const completedCount = completedIndices.length;
  const totalCount = exercises.length;

  return (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.eventBadge, { backgroundColor: eventColor.bg }]}>
          <Text style={[styles.eventBadgeText, { color: eventColor.text }]}>
            {EVENT_LABELS[event]}
          </Text>
        </View>
        <Text style={styles.eventProgress}>
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
  const progress = calculateProgress(assignment);
  const isComplete = progress.percentage === 100;

  // Get events that have content
  const activeEvents = EVENT_ORDER.filter((event) => {
    const content = assignment[event];
    return content && content.trim();
  });

  return (
    <View style={[styles.assignmentCard, isComplete && styles.assignmentCardComplete]}>
      <View style={styles.assignmentHeader}>
        <View style={styles.gymnastInfo}>
          <Text style={styles.gymnastName}>{assignment.gymnast_name}</Text>
          {assignment.gymnast_level && (
            <Badge label={assignment.gymnast_level} variant="neutral" size="sm" />
          )}
        </View>
        <View style={styles.headerProgress}>
          <Text style={[styles.headerProgressText, isComplete && styles.headerProgressComplete]}>
            {progress.percentage}%
          </Text>
        </View>
      </View>

      {isComplete && (
        <View style={styles.completeBanner}>
          <CheckCircle2 size={16} color={colors.emerald[600]} />
          <Text style={styles.completeBannerText}>All exercises complete!</Text>
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
          <Text style={styles.noExercisesText}>No exercises assigned</Text>
        </View>
      )}

      {assignment.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{assignment.notes}</Text>
        </View>
      )}
    </View>
  );
}

export default function AssignmentsScreen() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [togglingState, setTogglingState] = useState<{
    assignmentId: string;
    event: string;
    index: number;
  } | null>(null);

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  // Check if parents can toggle (hub setting)
  const allowParentToggle = currentHub?.settings?.allowParentToggle !== false;
  const canToggle = isStaff() || (isParent() && allowParentToggle);

  const dateString = format(currentDate, 'yyyy-MM-dd');

  const fetchAssignments = useCallback(async () => {
    if (!currentHub) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
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
        .eq('gymnast_profiles.hub_id', currentHub.id);

      // Parents only see their linked gymnasts
      if (isParent() && linkedGymnasts.length > 0) {
        const linkedIds = linkedGymnasts.map((g) => g.id);
        query = query.in('gymnast_profile_id', linkedIds);
      }

      const { data, error } = await query.order('gymnast_profiles(last_name)', { ascending: true });

      if (error) {
        console.error('Error fetching assignments:', error);
        setAssignments([]);
      } else {
        const mapped: Assignment[] = (data || []).map((a: any) => ({
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
        setAssignments(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
      setAssignments([]);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Navigator */}
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.navButton}>
          <ChevronLeft size={24} color={colors.slate[600]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
          <Calendar size={18} color={colors.slate[500]} />
          <Text style={styles.dateText}>
            {isToday(currentDate) ? 'Today' : format(currentDate, 'EEE, MMM d')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <ChevronRight size={24} color={colors.slate[600]} />
        </TouchableOpacity>
      </View>

      {/* Stats Dashboard */}
      {assignments.length > 0 && (
        <StatsDashboard stats={overallStats} assignmentCount={assignments.length} />
      )}

      {/* Assignments List */}
      <FlatList
        data={assignments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AssignmentCard
            assignment={item}
            canToggle={canToggle}
            onToggleExercise={handleToggleExercise}
            togglingState={togglingState}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <ClipboardList size={48} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyTitle}>No assignments</Text>
            <Text style={styles.emptyText}>
              No assignments for {format(currentDate, 'MMMM d, yyyy')}
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
});
