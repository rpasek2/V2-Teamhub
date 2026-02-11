import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Clock,
  Calendar,
  Trophy,
  Plus,
  Users,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, theme } from '../../../src/constants/colors';
import { Session } from './types';

interface SessionsTabProps {
  sessions: Session[];
  hubLevels: string[];
  isStaff: boolean;
  onAddSession: () => void;
  onManageSessionGymnasts: (session: Session) => void;
}

export function SessionsTab({
  sessions,
  hubLevels,
  isStaff,
  onAddSession,
  onManageSessionGymnasts,
}: SessionsTabProps) {
  // Group session gymnasts by level
  const groupSessionGymnastsByLevel = (
    sessionGymnasts: Session['session_gymnasts']
  ) => {
    const grouped: Record<string, Session['session_gymnasts']> = {};

    sessionGymnasts.forEach((gymnast) => {
      const level = gymnast.gymnast_profiles?.level || 'Unassigned';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(gymnast);
    });

    // Sort levels based on hub settings
    const sortedLevels = hubLevels.filter((l: string) => grouped[l]);
    const unlistedLevels = Object.keys(grouped).filter(
      (l) => !hubLevels.includes(l) && l !== 'Unassigned'
    );
    const orderedKeys = [...sortedLevels, ...unlistedLevels];
    if (grouped['Unassigned']) orderedKeys.push('Unassigned');

    const result: Record<string, Session['session_gymnasts']> = {};
    orderedKeys.forEach((level) => {
      result[level] = grouped[level].sort((a, b) =>
        (a.gymnast_profiles?.last_name || '').localeCompare(
          b.gymnast_profiles?.last_name || ''
        )
      );
    });

    return result;
  };

  return (
    <View style={styles.sessionsContainer}>
      {/* Add Session Button (Staff only) */}
      {isStaff && (
        <TouchableOpacity
          style={styles.addSessionButton}
          onPress={onAddSession}
        >
          <Plus size={18} color={theme.light.primary} />
          <Text style={styles.addSessionButtonText}>Add Session</Text>
        </TouchableOpacity>
      )}

      {sessions.length === 0 ? (
        <View style={styles.emptySection}>
          <Clock size={40} color={colors.slate[300]} />
          <Text style={styles.emptySectionTitle}>No sessions</Text>
          <Text style={styles.emptySectionText}>
            {isStaff
              ? 'Tap "Add Session" to create a session.'
              : 'Sessions will appear here once scheduled.'}
          </Text>
        </View>
      ) : (
        sessions.map((session) => (
          <View key={session.id} style={styles.sessionCard}>
            <View style={styles.sessionHeader}>
              <View style={styles.sessionTitleRow}>
                <Text style={styles.sessionName}>{session.name}</Text>
              </View>
              <View style={styles.sessionDetails}>
                <View style={styles.sessionDetailRow}>
                  <Calendar size={14} color={colors.slate[400]} />
                  <Text style={styles.sessionDetailText}>
                    {format(parseISO(session.date), 'MMM d, yyyy')}
                  </Text>
                </View>
                {session.warmup_time && (
                  <View style={styles.sessionDetailRow}>
                    <Clock size={14} color={colors.slate[400]} />
                    <Text style={styles.sessionDetailText}>
                      Warmup: {format(parseISO(`2000-01-01T${session.warmup_time}`), 'h:mm a')}
                    </Text>
                  </View>
                )}
                {session.awards_time && (
                  <View style={styles.sessionDetailRow}>
                    <Trophy size={14} color={colors.slate[400]} />
                    <Text style={styles.sessionDetailText}>
                      Awards: {format(parseISO(`2000-01-01T${session.awards_time}`), 'h:mm a')}
                    </Text>
                  </View>
                )}
              </View>
              {session.session_coaches && session.session_coaches.length > 0 && (
                <View style={styles.coachesRow}>
                  <Text style={styles.coachesLabel}>Coaches:</Text>
                  <Text style={styles.coachesText}>
                    {session.session_coaches
                      .map((c) => c.profiles?.full_name)
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Manage Gymnasts Button (Staff only) */}
            {isStaff && (
              <TouchableOpacity
                style={styles.manageGymnastsButton}
                onPress={() => onManageSessionGymnasts(session)}
              >
                <Users size={16} color={theme.light.primary} />
                <Text style={styles.manageGymnastsButtonText}>
                  Manage Gymnasts ({session.session_gymnasts?.length || 0})
                </Text>
              </TouchableOpacity>
            )}

            {session.session_gymnasts && session.session_gymnasts.length > 0 && (
              <View style={styles.sessionGymnasts}>
                {Object.entries(
                  groupSessionGymnastsByLevel(session.session_gymnasts)
                ).map(([level, gymnasts]) => (
                  <View key={level} style={styles.sessionLevelGroup}>
                    <View style={styles.sessionLevelHeader}>
                      <Text style={styles.sessionLevelTitle}>{level}</Text>
                      <Text style={styles.sessionLevelCount}>
                        ({gymnasts.length})
                      </Text>
                    </View>
                    <View style={styles.sessionGymnastChips}>
                      {gymnasts.map((gymnast) => (
                        <View
                          key={gymnast.gymnast_profile_id}
                          style={styles.sessionGymnastChip}
                        >
                          <View style={styles.sessionGymnastAvatar}>
                            <Text style={styles.sessionGymnastAvatarText}>
                              {gymnast.gymnast_profiles?.first_name?.[0] || ''}
                              {gymnast.gymnast_profiles?.last_name?.[0] || ''}
                            </Text>
                          </View>
                          <Text
                            style={styles.sessionGymnastName}
                            numberOfLines={1}
                          >
                            {gymnast.gymnast_profiles?.first_name}{' '}
                            {gymnast.gymnast_profiles?.last_name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {!isStaff && (!session.session_gymnasts ||
              session.session_gymnasts.length === 0) && (
              <View style={styles.noGymnastsAssigned}>
                <Text style={styles.noGymnastsText}>
                  No gymnasts assigned to this session
                </Text>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionsContainer: {
    padding: 16,
    gap: 12,
  },

  // Add Session Button
  addSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: theme.light.primary,
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 4,
  },
  addSessionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.light.primary,
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

  // Sessions
  sessionCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  sessionHeader: {
    backgroundColor: colors.slate[50],
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
    gap: 8,
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  sessionDetails: {
    gap: 4,
  },
  sessionDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionDetailText: {
    fontSize: 13,
    color: colors.slate[600],
  },
  coachesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  coachesLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[500],
  },
  coachesText: {
    fontSize: 13,
    color: colors.slate[700],
    flex: 1,
  },

  // Manage Gymnasts Button
  manageGymnastsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  manageGymnastsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.light.primary,
  },

  // Session gymnasts
  sessionGymnasts: {
    padding: 14,
    gap: 12,
  },
  sessionLevelGroup: {
    gap: 8,
  },
  sessionLevelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessionLevelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[700],
  },
  sessionLevelCount: {
    fontSize: 12,
    color: colors.slate[400],
  },
  sessionGymnastChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionGymnastChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  sessionGymnastAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.brand[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionGymnastAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.brand[700],
  },
  sessionGymnastName: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[900],
  },
  noGymnastsAssigned: {
    padding: 14,
  },
  noGymnastsText: {
    fontSize: 13,
    color: colors.slate[400],
    fontStyle: 'italic',
  },
});
