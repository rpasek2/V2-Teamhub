import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Target, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { getEventLabel, getSkillStatusColors, SKILL_STATUS_LABELS } from './constants';
import { sharedStyles } from './sharedStyles';
import type { SkillSummary, DetailedSkill } from './types';

interface Props {
  skillSummary: SkillSummary[];
  detailedSkills: DetailedSkill[];
  expandedSkillEvents: Set<string>;
  canEditData: boolean;
  isDark: boolean;
  onCycleStatus: (skill: DetailedSkill) => void;
  onToggleExpand: (event: string) => void;
}

export function SkillsTab({
  skillSummary,
  detailedSkills,
  expandedSkillEvents,
  canEditData,
  isDark,
  onCycleStatus,
  onToggleExpand,
}: Props) {
  const { t } = useTheme();
  const SKILL_STATUS_COLORS = getSkillStatusColors(isDark);

  return (
    <View style={sharedStyles.section}>
      <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Skills by Event</Text>
      {canEditData && (
        <Text style={[styles.skillEditHint, { color: t.textMuted }]}>Tap a skill to change its status</Text>
      )}
      {skillSummary.map((summary) => {
        const isExpanded = expandedSkillEvents.has(summary.event);
        const eventSkills = detailedSkills.filter(s => s.event === summary.event);

        return (
          <View key={summary.event} style={[styles.skillEventCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <TouchableOpacity
              style={styles.skillEventHeader}
              onPress={() => onToggleExpand(summary.event)}
              activeOpacity={0.7}
            >
              <Text style={[styles.skillEventName, { color: t.text }]}>{getEventLabel(summary.event)}</Text>
              <View style={styles.skillEventMeta}>
                <Text style={[styles.skillEventCount, { color: t.textMuted }]}>
                  {summary.compete_ready} / {summary.total} ready
                </Text>
                {isExpanded ? (
                  <ChevronUp size={18} color={t.textFaint} />
                ) : (
                  <ChevronDown size={18} color={t.textFaint} />
                )}
              </View>
            </TouchableOpacity>
            <View style={[sharedStyles.progressBar, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
              <View
                style={[
                  sharedStyles.progressFill,
                  {
                    width: summary.total > 0
                      ? `${(summary.compete_ready / summary.total) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>

            {isExpanded && eventSkills.length > 0 && (
              <View style={[styles.skillsList, { borderTopColor: t.borderSubtle }]}>
                {eventSkills.map((skill) => {
                  const statusKey = String(skill.status || 'null');
                  const statusConfig = SKILL_STATUS_COLORS[statusKey] || SKILL_STATUS_COLORS['null'];
                  const statusLabel = SKILL_STATUS_LABELS[statusKey] || 'Not Started';

                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[styles.skillItem, { borderBottomColor: t.borderSubtle }]}
                      onPress={() => onCycleStatus(skill)}
                      disabled={!canEditData}
                      activeOpacity={canEditData ? 0.7 : 1}
                    >
                      <Text style={[styles.skillName, { color: t.text }]} numberOfLines={1}>
                        {skill.name}
                      </Text>
                      <View style={[styles.skillStatusBadge, { backgroundColor: statusConfig.bg }]}>
                        <Text style={[styles.skillStatusText, { color: statusConfig.text }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
      {skillSummary.length === 0 && (
        <View style={sharedStyles.emptyContainer}>
          <Target size={48} color={t.textFaint} />
          <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Skills Tracked</Text>
          <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
            Skills will appear here once they are added to this gymnast
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skillEditHint: {
    fontSize: 12,
    color: colors.slate[500],
    marginBottom: 12,
    fontStyle: 'italic',
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
  skillEventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillEventCount: {
    fontSize: 14,
    color: colors.slate[500],
  },
  skillsList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingTop: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  skillName: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[800],
    marginRight: 10,
  },
  skillStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  skillStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
