import React from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import {
  Target,
  Calendar,
  CheckCircle,
  Plus,
  X,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { Badge } from '../ui';
import { parseLocalDate, getEventLabel } from './constants';
import { sharedStyles } from './sharedStyles';
import type { Goal, Subgoal } from './types';

interface Props {
  goals: Goal[];
  expandedGoals: Set<string>;
  newSubgoalTitle: Record<string, string>;
  setNewSubgoalTitle: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  canAddGoals: boolean;
  canEditData: boolean;
  onAddGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goalId: string) => void;
  onToggleGoalComplete: (goal: Goal) => void;
  onToggleGoalExpanded: (goalId: string) => void;
  onAddSubgoal: (goalId: string) => void;
  onToggleSubgoalComplete: (subgoal: Subgoal) => void;
  onDeleteSubgoal: (subgoalId: string) => void;
}

export function GoalsTab({
  goals,
  expandedGoals,
  newSubgoalTitle,
  setNewSubgoalTitle,
  canAddGoals,
  canEditData,
  onAddGoal,
  onEditGoal,
  onDeleteGoal,
  onToggleGoalComplete,
  onToggleGoalExpanded,
  onAddSubgoal,
  onToggleSubgoalComplete,
  onDeleteSubgoal,
}: Props) {
  const { t, isDark } = useTheme();

  return (
    <View style={sharedStyles.section}>
      {/* Add Goal Button - Staff or gymnast can add */}
      {canAddGoals && (
        <TouchableOpacity style={[styles.addButton, { backgroundColor: t.primary }]} onPress={onAddGoal}>
          <Plus size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Add Goal</Text>
        </TouchableOpacity>
      )}

      {goals.length > 0 ? (
        goals.map((goal) => {
          const isExpanded = expandedGoals.has(goal.id);
          const completedSubgoals = goal.subgoals?.filter(s => s.completed_at).length || 0;
          const totalSubgoals = goal.subgoals?.length || 0;
          const progress = totalSubgoals > 0 ? (completedSubgoals / totalSubgoals) * 100 : 0;

          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <TouchableOpacity
                style={styles.goalHeader}
                onPress={() => onToggleGoalExpanded(goal.id)}
                activeOpacity={0.7}
              >
                <TouchableOpacity
                  style={[
                    styles.goalCheckbox,
                    { borderColor: isDark ? colors.slate[500] : colors.slate[300] },
                    goal.completed_at && styles.goalCheckboxChecked,
                  ]}
                  onPress={() => onToggleGoalComplete(goal)}
                >
                  {goal.completed_at && <CheckCircle size={16} color={colors.white} />}
                </TouchableOpacity>
                <View style={styles.goalContent}>
                  <View style={styles.goalTitleRow}>
                    <Text
                      style={[
                        styles.goalTitle,
                        { color: t.text },
                        goal.completed_at && { textDecorationLine: 'line-through' as const, color: t.textFaint },
                      ]}
                      numberOfLines={1}
                    >
                      {goal.title}
                    </Text>
                    {goal.event && (
                      <Badge label={getEventLabel(goal.event)} variant="neutral" size="sm" />
                    )}
                  </View>
                  {goal.target_date && (
                    <View style={styles.goalDateRow}>
                      <Calendar size={12} color={t.textFaint} />
                      <Text style={[styles.goalDateText, { color: t.textMuted }]}>
                        {format(parseLocalDate(goal.target_date), 'MMM d, yyyy')}
                      </Text>
                    </View>
                  )}
                  {totalSubgoals > 0 && (
                    <View style={styles.goalProgressRow}>
                      <View style={[sharedStyles.progressBarSmall, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
                        <View
                          style={[
                            sharedStyles.progressFill,
                            {
                              width: `${progress}%`,
                              backgroundColor: progress === 100 ? colors.success[500] : t.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.goalProgressText, { color: t.textMuted }]}>
                        {completedSubgoals}/{totalSubgoals}
                      </Text>
                    </View>
                  )}
                </View>
                {isExpanded ? (
                  <ChevronUp size={20} color={t.textFaint} />
                ) : (
                  <ChevronDown size={20} color={t.textFaint} />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={[styles.goalExpanded, { borderTopColor: t.borderSubtle }]}>
                  {goal.description && (
                    <Text style={[styles.goalDescription, { color: t.textSecondary }]}>{goal.description}</Text>
                  )}

                  {/* Subgoals */}
                  {goal.subgoals && goal.subgoals.length > 0 && (
                    <View style={styles.subgoalsList}>
                      <Text style={[styles.subgoalsTitle, { color: t.textMuted }]}>Milestones</Text>
                      {goal.subgoals.map((subgoal) => (
                        <View key={subgoal.id} style={[styles.subgoalItem, { borderBottomColor: t.borderSubtle }]}>
                          <TouchableOpacity
                            style={[
                              styles.subgoalCheckbox,
                              { borderColor: isDark ? colors.slate[500] : colors.slate[300] },
                              subgoal.completed_at && [styles.subgoalCheckboxChecked, { backgroundColor: t.primary, borderColor: t.primary }],
                            ]}
                            onPress={() => onToggleSubgoalComplete(subgoal)}
                          >
                            {subgoal.completed_at && <CheckCircle size={12} color={colors.white} />}
                          </TouchableOpacity>
                          <Text
                            style={[
                              styles.subgoalTitle,
                              { color: t.textSecondary },
                              subgoal.completed_at && { textDecorationLine: 'line-through' as const, color: t.textFaint },
                            ]}
                            numberOfLines={1}
                          >
                            {subgoal.title}
                          </Text>
                          {canEditData && (
                            <TouchableOpacity
                              style={styles.subgoalDeleteBtn}
                              onPress={() => onDeleteSubgoal(subgoal.id)}
                            >
                              <X size={14} color={t.textFaint} />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add Subgoal Input */}
                  {canEditData && (
                    <View style={styles.addSubgoalRow}>
                      <TextInput
                        style={[styles.addSubgoalInput, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50], borderColor: t.border, color: t.text }]}
                        placeholder="Add milestone..."
                        placeholderTextColor={t.textFaint}
                        value={newSubgoalTitle[goal.id] || ''}
                        onChangeText={(text) =>
                          setNewSubgoalTitle(prev => ({ ...prev, [goal.id]: text }))
                        }
                        onSubmitEditing={() => onAddSubgoal(goal.id)}
                      />
                      <TouchableOpacity
                        style={[styles.addSubgoalBtn, { backgroundColor: `${t.primary}15` }]}
                        onPress={() => onAddSubgoal(goal.id)}
                      >
                        <Plus size={16} color={t.primary} />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Goal Actions */}
                  {canEditData && (
                    <View style={[styles.goalActions, { borderTopColor: t.borderSubtle }]}>
                      <TouchableOpacity
                        style={[styles.goalActionBtn, { backgroundColor: isDark ? colors.slate[700] : colors.slate[50] }]}
                        onPress={() => onEditGoal(goal)}
                      >
                        <Edit2 size={14} color={t.textSecondary} />
                        <Text style={[styles.goalActionText, { color: t.textSecondary }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.goalActionBtn, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50] }]}
                        onPress={() => onDeleteGoal(goal.id)}
                      >
                        <Trash2 size={14} color={isDark ? colors.error[400] : colors.error[600]} />
                        <Text style={[styles.goalActionText, { color: isDark ? colors.error[400] : colors.error[600] }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })
      ) : (
        <View style={sharedStyles.emptyContainer}>
          <Target size={48} color={t.textFaint} />
          <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Goals Set</Text>
          <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
            Set goals to track progress and achievements
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand[600],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
  goalCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  goalCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalCheckboxChecked: {
    backgroundColor: colors.success[500],
    borderColor: colors.success[500],
  },
  goalContent: {
    flex: 1,
  },
  goalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  goalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  goalDateText: {
    fontSize: 12,
    color: colors.slate[500],
  },
  goalProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  goalProgressText: {
    fontSize: 12,
    color: colors.slate[500],
    fontWeight: '500',
  },
  goalExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  goalDescription: {
    fontSize: 14,
    color: colors.slate[600],
    marginTop: 12,
    lineHeight: 20,
  },
  subgoalsList: {
    marginTop: 14,
  },
  subgoalsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  subgoalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  subgoalCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  subgoalCheckboxChecked: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  subgoalTitle: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[700],
  },
  subgoalDeleteBtn: {
    padding: 4,
  },
  addSubgoalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  addSubgoalInput: {
    flex: 1,
    height: 40,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.slate[900],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  addSubgoalBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  goalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: colors.slate[50],
  },
  goalActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[600],
  },
});
