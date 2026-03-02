import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { FileText, Target, UserCheck, ClipboardList, Trophy, MessageSquare } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';

const getSkillStatusConfig = (isDark: boolean): Record<string, { label: string; icon: string; color: string; bg: string }> => ({
  mastered: { label: 'Mastered', icon: '★', color: isDark ? colors.amber[500] : colors.amber[600], bg: isDark ? colors.amber[700] + '30' : colors.amber[50] },
  achieved: { label: 'Achieved', icon: '✓', color: isDark ? colors.success[500] : colors.success[600], bg: isDark ? colors.success[700] + '30' : colors.success[50] },
  learning: { label: 'Learning', icon: '◐', color: colors.amber[500], bg: isDark ? colors.amber[700] + '30' : colors.amber[50] },
  none: { label: 'Not Started', icon: '', color: isDark ? colors.slate[400] : colors.slate[500], bg: isDark ? colors.slate[700] + '30' : colors.slate[100] },
  injured: { label: 'Injured', icon: '⚠', color: isDark ? colors.error[400] : colors.error[600], bg: isDark ? colors.error[700] + '30' : colors.error[50] },
});

export default function ReportDetailScreen() {
  const { t, isDark } = useTheme();
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const SKILL_STATUS_CONFIG = getSkillStatusConfig(isDark);

  useEffect(() => {
    if (reportId) fetchReport();
  }, [reportId]);

  const fetchReport = async () => {
    const { data, error } = await supabase
      .from('progress_reports')
      .select('*')
      .eq('id', reportId)
      .single();

    if (error) {
      console.error('Error fetching report:', error);
    } else {
      setReport(data);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <Text style={[styles.errorText, { color: t.textMuted }]}>Report not found</Text>
      </View>
    );
  }

  const data = report.report_data;
  const sections = data.included_sections || [];

  return (
    <ScrollView style={[styles.container, { backgroundColor: t.background }]} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: t.primary }]}>
        <View style={styles.headerRow}>
          <FileText size={22} color={colors.white} />
          <Text style={styles.headerTitle}>{report.title}</Text>
        </View>
        <Text style={[styles.headerGymnast, { color: 'rgba(255,255,255,0.8)' }]}>
          {data.gymnast?.first_name} {data.gymnast?.last_name} · {data.gymnast?.level || 'No Level'}
        </Text>
        <Text style={[styles.headerDate, { color: 'rgba(255,255,255,0.6)' }]}>
          {format(new Date(report.date_range_start + 'T00:00:00'), 'MMM d, yyyy')} — {format(new Date(report.date_range_end + 'T00:00:00'), 'MMM d, yyyy')}
        </Text>
      </View>

      {/* Skills Section */}
      {sections.includes('skills') && data.skills && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={t.primary} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Skills Progress</Text>
          </View>
          {Object.entries(data.skills).map(([event, counts]: [string, any]) => (
            <View key={event} style={[styles.eventCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.eventName, { color: t.text }]}>{event}</Text>
              <View style={styles.statusRow}>
                {(['mastered', 'achieved', 'learning', 'none', 'injured'] as string[]).map(status => {
                  const count = counts[status] || 0;
                  if (count === 0 && status === 'injured') return null;
                  const config = SKILL_STATUS_CONFIG[status];
                  return (
                    <View key={status} style={[styles.statusBadge, { backgroundColor: config.bg }]}>
                      <Text style={[styles.statusText, { color: config.color }]}>
                        {config.icon ? `${config.icon} ` : ''}{config.label}: {count}
                      </Text>
                    </View>
                  );
                })}
              </View>
              {data.skill_comments?.[event] && (
                <View style={[styles.commentBox, { backgroundColor: t.surfaceSecondary }]}>
                  <MessageSquare size={14} color={t.textFaint} />
                  <Text style={[styles.commentText, { color: t.textSecondary }]}>{data.skill_comments[event]}</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Attendance Section */}
      {sections.includes('attendance') && data.attendance && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <UserCheck size={18} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Attendance</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: t.text }]}>{data.attendance.percentage}%</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Rate</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.emerald[700] + '20' : colors.emerald[50], borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: isDark ? colors.emerald[400] : colors.emerald[600] }]}>{data.attendance.present}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Present</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50], borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: isDark ? colors.error[400] : colors.error[600] }]}>{data.attendance.absent}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Absent</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.amber[700] + '20' : colors.amber[50], borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: isDark ? colors.amber[500] : colors.amber[600] }]}>{data.attendance.late}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Late</Text>
            </View>
          </View>
        </View>
      )}

      {/* Assignments Section */}
      {sections.includes('assignments') && data.assignments && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardList size={18} color={isDark ? colors.indigo[500] : colors.indigo[600]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Assignments</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: t.text }]}>{data.assignments.total_assignments}</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Total</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? colors.indigo[700] + '20' : colors.indigo[50], borderColor: t.border }]}>
              <Text style={[styles.statValue, { color: isDark ? colors.indigo[500] : colors.indigo[600] }]}>{data.assignments.completion_rate}%</Text>
              <Text style={[styles.statLabel, { color: t.textMuted }]}>Completion</Text>
            </View>
          </View>
        </View>
      )}

      {/* Scores Section */}
      {sections.includes('scores') && data.scores && data.scores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Trophy size={18} color={isDark ? colors.amber[500] : colors.amber[600]} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Competition Scores</Text>
          </View>
          {data.scores.map((comp: any, i: number) => (
            <View key={i} style={[styles.scoreCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={styles.scoreHeader}>
                <Text style={[styles.scoreName, { color: t.text }]}>{comp.competition_name}</Text>
                <Text style={[styles.scoreDate, { color: t.textMuted }]}>
                  {format(new Date(comp.date + 'T00:00:00'), 'MMM d, yyyy')}
                </Text>
              </View>
              <View style={styles.scoresRow}>
                {Object.entries(comp.events).map(([event, score]: [string, any]) => (
                  <View key={event} style={styles.scoreItem}>
                    <Text style={[styles.scoreEvent, { color: t.textMuted }]}>{event}</Text>
                    <Text style={[styles.scoreValue, { color: t.text }]}>{score > 0 ? score.toFixed(2) : '—'}</Text>
                  </View>
                ))}
                {comp.all_around && (
                  <View style={[styles.scoreItem, styles.scoreItemAA, { borderLeftColor: t.borderSubtle }]}>
                    <Text style={[styles.scoreEvent, { color: t.textMuted }]}>AA</Text>
                    <Text style={[styles.scoreValue, { color: t.primary }]}>{comp.all_around.toFixed(2)}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Coach Notes */}
      {report.coach_notes && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MessageSquare size={18} color={t.textSecondary} />
            <Text style={[styles.sectionTitle, { color: t.text }]}>Coach Notes</Text>
          </View>
          <View style={[styles.notesCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.notesText, { color: t.textSecondary }]}>{report.coach_notes}</Text>
          </View>
        </View>
      )}
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: colors.brand[500],
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    flex: 1,
  },
  headerGymnast: {
    fontSize: 14,
    color: colors.brand[100],
  },
  headerDate: {
    fontSize: 12,
    color: colors.brand[200],
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
  },
  eventCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  eventName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  commentBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 10,
    backgroundColor: colors.slate[50],
    borderRadius: 8,
    padding: 10,
  },
  commentText: {
    fontSize: 13,
    color: colors.slate[600],
    flex: 1,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
  },
  statLabel: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
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
    marginBottom: 10,
  },
  scoreName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
    flex: 1,
  },
  scoreDate: {
    fontSize: 12,
    color: colors.slate[500],
  },
  scoresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  scoreItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreItemAA: {
    borderLeftWidth: 1,
    borderLeftColor: colors.slate[200],
    paddingLeft: 8,
  },
  scoreEvent: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.slate[500],
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  scoreValueAA: {
    color: colors.brand[600],
  },
  notesCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  notesText: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
});
