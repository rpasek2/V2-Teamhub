import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ClipboardList, CheckCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { parseLocalDate, ASSIGNMENT_EVENTS } from './constants';
import { sharedStyles } from './sharedStyles';
import type { Assignment, AssignmentStats } from './types';

interface Props {
  assignments: Assignment[];
  assignmentStats: AssignmentStats;
  isDark: boolean;
}

export function AssignmentsTab({
  assignments,
  assignmentStats,
  isDark,
}: Props) {
  const { t } = useTheme();

  return (
    <View style={sharedStyles.section}>
      {/* Assignment Stats Card */}
      <View style={[styles.assignmentStatsCard, { backgroundColor: `${t.primary}15`, borderColor: `${t.primary}30` }]}>
        <View style={styles.assignmentStatsHeader}>
          <ClipboardList size={20} color={t.primary} />
          <Text style={[styles.assignmentStatsTitle, { color: t.text }]}>30-Day Statistics</Text>
        </View>
        <View style={styles.assignmentQuickStats}>
          <View style={styles.assignmentQuickStat}>
            <Text style={[styles.assignmentQuickStatValue, { color: t.text }]}>{assignmentStats.totalExercises}</Text>
            <Text style={[styles.assignmentQuickStatLabel, { color: t.textMuted }]}>Assigned</Text>
          </View>
          <View style={styles.assignmentQuickStat}>
            <Text style={[styles.assignmentQuickStatValue, { color: t.primary }]}>
              {assignmentStats.totalCompleted}
            </Text>
            <Text style={[styles.assignmentQuickStatLabel, { color: t.textMuted }]}>Completed</Text>
          </View>
          <View style={styles.assignmentQuickStat}>
            <Text style={[styles.assignmentQuickStatValue, { color: isDark ? colors.purple[400] : colors.indigo[600] }]}>
              {assignmentStats.completionRate}%
            </Text>
            <Text style={[styles.assignmentQuickStatLabel, { color: t.textMuted }]}>Rate</Text>
          </View>
        </View>
        <View style={[sharedStyles.progressBar, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
          <View
            style={[
              sharedStyles.progressFill,
              { width: `${assignmentStats.completionRate}%`, backgroundColor: t.primary },
            ]}
          />
        </View>
      </View>

      {/* Recent Assignments */}
      <Text style={[sharedStyles.sectionTitle, { marginTop: 20, color: t.text }]}>Recent Assignments</Text>
      {assignments.slice(0, 10).map((assignment) => {
        let dayTotal = 0;
        let dayCompleted = 0;

        ASSIGNMENT_EVENTS.forEach(event => {
          const content = assignment[event as keyof Assignment] as string | undefined;
          if (!content || typeof content !== 'string') return;
          const exerciseCount = content.split('\n').filter(line => line.trim()).length;
          const completedCount = Math.min(
            (assignment.completed_items?.[event] || []).length,
            exerciseCount
          );
          dayTotal += exerciseCount;
          dayCompleted += completedCount;
        });

        const dayPercentage = dayTotal > 0 ? Math.round((dayCompleted / dayTotal) * 100) : 0;

        return (
          <View key={assignment.id} style={[styles.assignmentCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.assignmentCardHeader}>
              <Text style={[styles.assignmentDate, { color: t.text }]}>
                {format(parseLocalDate(assignment.date), 'EEEE, MMM d')}
              </Text>
              <View style={styles.assignmentPercentageContainer}>
                <Text style={[
                  styles.assignmentPercentage,
                  { color: dayPercentage === 100 ? colors.success[600] : dayPercentage >= 80 ? t.primary : t.textSecondary }
                ]}>
                  {dayPercentage}%
                </Text>
                {dayPercentage === 100 && (
                  <CheckCircle size={16} color={colors.success[500]} />
                )}
              </View>
            </View>
            <View style={[sharedStyles.progressBarSmall, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
              <View
                style={[
                  sharedStyles.progressFill,
                  {
                    width: `${dayPercentage}%`,
                    backgroundColor: dayPercentage === 100 ? colors.success[500] : dayPercentage >= 80 ? t.primary : t.textFaint,
                  },
                ]}
              />
            </View>
            <Text style={[styles.assignmentExerciseCount, { color: t.textMuted }]}>
              {dayCompleted} / {dayTotal} exercises
            </Text>
          </View>
        );
      })}
      {assignments.length === 0 && (
        <View style={sharedStyles.emptyContainer}>
          <ClipboardList size={48} color={t.textFaint} />
          <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Assignments Yet</Text>
          <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
            Assignment history will appear here once exercises are assigned
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  assignmentStatsCard: {
    backgroundColor: colors.brand[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.brand[200],
  },
  assignmentStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  assignmentStatsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  assignmentQuickStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  assignmentQuickStat: {
    alignItems: 'center',
  },
  assignmentQuickStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.slate[900],
  },
  assignmentQuickStatLabel: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  assignmentCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  assignmentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  assignmentDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  assignmentPercentageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  assignmentPercentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  assignmentExerciseCount: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
  },
});
