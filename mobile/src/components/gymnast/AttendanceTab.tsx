import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { TrendingUp, UserCheck, Clock, AlertTriangle, X } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { parseLocalDate, getStatusConfig } from './constants';
import { sharedStyles } from './sharedStyles';
import type { AttendanceStats, MonthlyTrend, AttendanceRecord } from './types';

interface Props {
  attendanceStats: AttendanceStats;
  monthlyTrends: MonthlyTrend[];
  filteredAttendanceRecords: AttendanceRecord[];
  selectedMonth: string | null;
  onSelectedMonthChange: (month: string | null) => void;
  isDark: boolean;
}

export function AttendanceTab({
  attendanceStats,
  monthlyTrends,
  filteredAttendanceRecords,
  selectedMonth,
  onSelectedMonthChange,
  isDark,
}: Props) {
  const { t } = useTheme();
  const STATUS_CONFIG = getStatusConfig(isDark);

  return (
    <View style={sharedStyles.section}>
      {/* Overall Stats */}
      <View style={styles.attendanceStatsGrid}>
        <View style={[styles.attendanceStatCard, { backgroundColor: isDark ? colors.emerald[700] + '20' : colors.emerald[50] }]}>
          <TrendingUp size={20} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
          <Text style={[styles.attendanceStatValue, { color: isDark ? colors.emerald[400] : colors.emerald[600] }]}>
            {attendanceStats.percentage}%
          </Text>
          <Text style={[styles.attendanceStatLabel, { color: t.textMuted }]}>6-Month Rate</Text>
        </View>
        <View style={[styles.attendanceStatCard, { backgroundColor: isDark ? colors.emerald[700] + '20' : colors.emerald[50] }]}>
          <UserCheck size={20} color={isDark ? colors.emerald[400] : colors.emerald[600]} />
          <Text style={[styles.attendanceStatValue, { color: t.text }]}>{attendanceStats.present}</Text>
          <Text style={[styles.attendanceStatLabel, { color: t.textMuted }]}>Present</Text>
        </View>
        <View style={[styles.attendanceStatCard, { backgroundColor: isDark ? colors.amber[700] + '20' : colors.amber[50] }]}>
          <Clock size={20} color={isDark ? colors.amber[500] : colors.amber[600]} />
          <Text style={[styles.attendanceStatValue, { color: t.text }]}>{attendanceStats.late}</Text>
          <Text style={[styles.attendanceStatLabel, { color: t.textMuted }]}>Late</Text>
        </View>
        <View style={[styles.attendanceStatCard, { backgroundColor: isDark ? colors.error[700] + '20' : colors.error[50] }]}>
          <AlertTriangle size={20} color={isDark ? colors.error[400] : colors.error[600]} />
          <Text style={[styles.attendanceStatValue, { color: t.text }]}>{attendanceStats.absent}</Text>
          <Text style={[styles.attendanceStatLabel, { color: t.textMuted }]}>Absent</Text>
        </View>
      </View>

      {/* Monthly Trends */}
      {monthlyTrends.some((m) => m.total > 0) && (
        <View style={styles.monthlyTrendsSection}>
          <View style={styles.monthlyTrendsHeader}>
            <Text style={[sharedStyles.sectionTitle, { color: t.text }]}>Monthly Breakdown</Text>
            {selectedMonth && (
              <TouchableOpacity
                style={[styles.clearFilterBtn, { backgroundColor: `${t.primary}15` }]}
                onPress={() => onSelectedMonthChange(null)}
              >
                <Text style={[styles.clearFilterText, { color: t.primary }]}>Clear</Text>
                <X size={14} color={t.primary} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.monthlyTrendsScroll}
          >
            {monthlyTrends.map((month) => {
              if (month.total === 0) return null;
              const isSelected = selectedMonth === month.key;
              const progressColor =
                month.percentage >= 90
                  ? colors.emerald[500]
                  : month.percentage >= 70
                  ? colors.amber[500]
                  : colors.error[500];

              return (
                <TouchableOpacity
                  key={month.key}
                  style={[
                    styles.monthlyTrendCard,
                    { backgroundColor: t.surface, borderColor: t.border },
                    isSelected && [styles.monthlyTrendCardSelected, { borderColor: t.primary, backgroundColor: `${t.primary}15` }],
                  ]}
                  onPress={() =>
                    onSelectedMonthChange(isSelected ? null : month.key)
                  }
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.monthlyTrendLabel,
                      { color: t.textSecondary },
                      isSelected && [styles.monthlyTrendLabelSelected, { color: t.primary }],
                    ]}
                  >
                    {month.label}
                  </Text>
                  <Text
                    style={[
                      styles.monthlyTrendPercent,
                      { color: progressColor },
                    ]}
                  >
                    {month.percentage}%
                  </Text>
                  <View style={[styles.monthlyTrendProgressBar, { backgroundColor: isDark ? colors.slate[600] : colors.slate[100] }]}>
                    <View
                      style={[
                        styles.monthlyTrendProgressFill,
                        {
                          width: `${month.percentage}%`,
                          backgroundColor: progressColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.monthlyTrendCount, { color: t.textMuted }]}>
                    {month.present}/{month.total} days
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Attendance Records */}
      <Text style={[sharedStyles.sectionTitle, { marginTop: 20 }]}>
        {selectedMonth
          ? `Records for ${monthlyTrends.find((m) => m.key === selectedMonth)?.label || selectedMonth}`
          : 'Recent Records'}
      </Text>
      {filteredAttendanceRecords.slice(0, 30).map((record) => {
        const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.present;
        return (
          <View key={record.id} style={[styles.attendanceRecordCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <View style={styles.attendanceRecordHeader}>
              <Text style={[styles.attendanceRecordDate, { color: t.text }]}>
                {format(parseLocalDate(record.attendance_date), 'EEEE, MMM d')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.statusText, { color: config.color }]}>
                  {config.label}
                </Text>
              </View>
            </View>
            {(record.check_in_time || record.check_out_time) && (
              <View style={styles.attendanceTimeRow}>
                {record.check_in_time && (
                  <Text style={[styles.attendanceTimeText, { color: t.textMuted }]}>In: {record.check_in_time}</Text>
                )}
                {record.check_out_time && (
                  <Text style={[styles.attendanceTimeText, { color: t.textMuted }]}>Out: {record.check_out_time}</Text>
                )}
              </View>
            )}
            {record.notes && (
              <Text style={[styles.attendanceNotes, { color: t.textMuted }]}>{record.notes}</Text>
            )}
          </View>
        );
      })}
      {filteredAttendanceRecords.length === 0 && (
        <View style={sharedStyles.emptyContainer}>
          <UserCheck size={48} color={t.textFaint} />
          <Text style={[sharedStyles.emptyTitle, { color: t.text }]}>No Attendance Records</Text>
          <Text style={[sharedStyles.emptyTextCenter, { color: t.textMuted }]}>
            {selectedMonth ? 'No records for this month' : 'No attendance has been recorded yet'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  attendanceStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  attendanceStatCard: {
    width: '48%',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  attendanceStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.slate[900],
    marginTop: 6,
  },
  attendanceStatLabel: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  monthlyTrendsSection: {
    marginTop: 20,
  },
  monthlyTrendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: colors.brand[50],
    borderRadius: 16,
  },
  clearFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brand[600],
  },
  monthlyTrendsScroll: {
    gap: 10,
    paddingRight: 16,
  },
  monthlyTrendCard: {
    width: 110,
    padding: 12,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    alignItems: 'center',
  },
  monthlyTrendCardSelected: {
    borderColor: colors.brand[500],
    backgroundColor: colors.brand[50],
  },
  monthlyTrendLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[600],
    marginBottom: 4,
  },
  monthlyTrendLabelSelected: {
    color: colors.brand[700],
  },
  monthlyTrendPercent: {
    fontSize: 22,
    fontWeight: '700',
  },
  monthlyTrendProgressBar: {
    width: '100%',
    height: 4,
    backgroundColor: colors.slate[100],
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  monthlyTrendProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  monthlyTrendCount: {
    fontSize: 11,
    color: colors.slate[500],
  },
  attendanceRecordCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  attendanceRecordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceRecordDate: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  attendanceTimeRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  attendanceTimeText: {
    fontSize: 12,
    color: colors.slate[500],
  },
  attendanceNotes: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 6,
    fontStyle: 'italic',
  },
});
