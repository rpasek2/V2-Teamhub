import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Users,
  ChevronDown,
  ChevronRight,
  UserPlus,
} from 'lucide-react-native';
import { colors, theme } from '../../../src/constants/colors';
import { GymEvent, Gymnast, EVENT_LABELS, getEventsForGender } from './types';

interface RosterTabProps {
  roster: Gymnast[];
  isStaff: boolean;
  hubLevels: string[];
  onToggleEvent: (gymnastProfileId: string, event: GymEvent, currentEvents: GymEvent[]) => void;
  onManageRoster: () => void;
}

export function RosterTab({
  roster,
  isStaff,
  hubLevels,
  onToggleEvent,
  onManageRoster,
}: RosterTabProps) {
  const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

  // Group roster by level
  const rosterByLevel = useMemo(() => {
    const grouped: Record<string, Gymnast[]> = {};

    roster.forEach((gymnast) => {
      const level = gymnast.gymnast_profiles?.level || 'Unassigned';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(gymnast);
    });

    // Sort levels based on hub settings order
    const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
    const unlistedLevels = Object.keys(grouped).filter(
      (l) => !hubLevels.includes(l) && l !== 'Unassigned'
    );
    const orderedKeys = [...sortedLevels, ...unlistedLevels];
    if (grouped['Unassigned']) orderedKeys.push('Unassigned');

    const result: Record<string, Gymnast[]> = {};
    orderedKeys.forEach((level) => {
      // Sort gymnasts alphabetically
      result[level] = grouped[level].sort((a, b) =>
        (a.gymnast_profiles?.last_name || '').localeCompare(
          b.gymnast_profiles?.last_name || ''
        )
      );
    });

    return result;
  }, [roster, hubLevels]);

  const toggleLevelCollapse = (level: string) => {
    setCollapsedLevels((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(level)) {
        newSet.delete(level);
      } else {
        newSet.add(level);
      }
      return newSet;
    });
  };

  return (
    <View style={styles.rosterContainer}>
      {/* Manage Roster Button (Staff only) */}
      {isStaff && (
        <TouchableOpacity
          style={styles.manageRosterButton}
          onPress={onManageRoster}
        >
          <UserPlus size={18} color={theme.light.primary} />
          <Text style={styles.manageRosterButtonText}>Manage Roster</Text>
        </TouchableOpacity>
      )}

      {/* Staff hint */}
      {isStaff && roster.length > 0 && (
        <Text style={styles.staffHint}>Tap event badges to toggle</Text>
      )}

      {roster.length === 0 ? (
        <View style={styles.emptySection}>
          <Users size={40} color={colors.slate[300]} />
          <Text style={styles.emptySectionTitle}>No gymnasts assigned</Text>
          <Text style={styles.emptySectionText}>
            {isStaff
              ? 'Tap "Manage Roster" to add gymnasts.'
              : 'Gymnasts will appear here once assigned to this competition.'}
          </Text>
        </View>
      ) : (
        Object.entries(rosterByLevel).map(([level, gymnasts]) => (
          <View key={level} style={styles.levelSection}>
            <TouchableOpacity
              style={styles.levelHeader}
              onPress={() => toggleLevelCollapse(level)}
            >
              {collapsedLevels.has(level) ? (
                <ChevronRight size={18} color={colors.slate[400]} />
              ) : (
                <ChevronDown size={18} color={colors.slate[400]} />
              )}
              <Text style={styles.levelTitle}>{level}</Text>
              <View style={styles.levelCount}>
                <Text style={styles.levelCountText}>{gymnasts.length}</Text>
              </View>
            </TouchableOpacity>

            {!collapsedLevels.has(level) && (
              <View style={styles.gymnastsList}>
                {gymnasts.map((gymnast) => {
                  const availableEvents = getEventsForGender(
                    gymnast.gymnast_profiles?.gender || null
                  );
                  return (
                    <View key={gymnast.gymnast_profile_id} style={styles.gymnastRow}>
                      <View style={styles.gymnastInfo}>
                        <View style={styles.gymnastAvatar}>
                          <Text style={styles.gymnastAvatarText}>
                            {gymnast.gymnast_profiles?.first_name?.[0] || ''}
                            {gymnast.gymnast_profiles?.last_name?.[0] || ''}
                          </Text>
                        </View>
                        <Text style={styles.gymnastName}>
                          {gymnast.gymnast_profiles?.first_name}{' '}
                          {gymnast.gymnast_profiles?.last_name}
                        </Text>
                      </View>
                      <View style={styles.eventsContainer}>
                        {availableEvents.map((event) => {
                          const isActive = gymnast.events.includes(event);
                          return isStaff ? (
                            <TouchableOpacity
                              key={event}
                              style={[
                                styles.eventBadge,
                                isActive && styles.eventBadgeActive,
                              ]}
                              onPress={() =>
                                onToggleEvent(
                                  gymnast.gymnast_profile_id,
                                  event,
                                  gymnast.events
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.eventBadgeText,
                                  isActive && styles.eventBadgeTextActive,
                                ]}
                              >
                                {EVENT_LABELS[event]}
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View
                              key={event}
                              style={[
                                styles.eventBadge,
                                isActive && styles.eventBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.eventBadgeText,
                                  isActive && styles.eventBadgeTextActive,
                                ]}
                              >
                                {EVENT_LABELS[event]}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rosterContainer: {
    padding: 16,
    gap: 12,
  },

  // Manage Roster Button
  manageRosterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.light.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 8,
  },
  manageRosterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.light.primary,
  },
  staffHint: {
    fontSize: 12,
    color: colors.slate[500],
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // Empty state
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  emptySectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 12,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    marginTop: 4,
  },

  // Level section
  levelSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  levelTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  levelCount: {
    backgroundColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },

  // Gymnast row
  gymnastsList: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  gymnastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  gymnastInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  gymnastAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymnastAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brand[700],
  },
  gymnastName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
    flex: 1,
  },
  eventsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  eventBadge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.slate[100],
  },
  eventBadgeActive: {
    backgroundColor: theme.light.primary,
  },
  eventBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.slate[400],
  },
  eventBadgeTextActive: {
    color: colors.white,
  },
});
