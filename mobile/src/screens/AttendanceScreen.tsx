import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  LogOut,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react-native';
import { format, parseISO, addDays, subDays } from 'date-fns';
import { colors, theme } from '../constants/colors';
import { supabase } from '../services/supabase';
import { useHubStore } from '../stores/hubStore';
import { useAuthStore } from '../stores/authStore';

type AttendanceStatus = 'present' | 'late' | 'left_early' | 'absent';

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  schedule_group: string | null;
}

interface PracticeSchedule {
  id: string;
  level: string;
  schedule_group: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AttendanceRecord {
  id: string;
  gymnast_profile_id: string;
  status: AttendanceStatus;
}

interface GymnastWithAttendance extends GymnastProfile {
  attendance?: AttendanceRecord;
  expected_start?: string;
  expected_end?: string;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
  present: { label: 'Present', color: colors.emerald[700], bgColor: colors.emerald[100], icon: Check },
  late: { label: 'Late', color: colors.amber[700], bgColor: colors.amber[100], icon: Clock },
  left_early: { label: 'Left Early', color: colors.blue[700], bgColor: colors.blue[100], icon: LogOut },
  absent: { label: 'Absent', color: colors.error[700], bgColor: colors.error[100], icon: X },
};

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AttendanceScreen() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [practiceSchedules, setPracticeSchedules] = useState<PracticeSchedule[]>([]);
  const [gymnasts, setGymnasts] = useState<GymnastProfile[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);
  const { user } = useAuthStore();

  const canManage = isStaff();
  const selectedDayOfWeek = parseISO(selectedDate).getDay();

  useEffect(() => {
    fetchData();
  }, [currentHub?.id]);

  useEffect(() => {
    if (currentHub?.id) {
      fetchAttendance();
    }
  }, [currentHub?.id, selectedDate]);

  const fetchData = async () => {
    if (!currentHub) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const [schedulesResult, gymnastsResult] = await Promise.all([
      supabase
        .from('practice_schedules')
        .select('*')
        .eq('hub_id', currentHub.id),
      supabase
        .from('gymnast_profiles')
        .select('id, first_name, last_name, level, schedule_group')
        .eq('hub_id', currentHub.id)
        .order('last_name'),
    ]);

    if (schedulesResult.data) {
      setPracticeSchedules(schedulesResult.data);
    }

    if (gymnastsResult.data) {
      setGymnasts(gymnastsResult.data);
      const levels = new Set(gymnastsResult.data.map((g) => g.level).filter(Boolean) as string[]);
      setExpandedLevels(levels);
    }

    await fetchAttendance();
    setLoading(false);
  };

  const fetchAttendance = async () => {
    if (!currentHub) return;

    const { data } = await supabase
      .from('attendance_records')
      .select('id, gymnast_profile_id, status')
      .eq('hub_id', currentHub.id)
      .eq('attendance_date', selectedDate);

    if (data) {
      setAttendanceRecords(data);
    }
  };

  const gymnastsWithPractice = useMemo(() => {
    const result: GymnastWithAttendance[] = [];
    const todaysSchedules = practiceSchedules.filter((s) => s.day_of_week === selectedDayOfWeek);

    const relevantGymnasts = isParent() && linkedGymnasts.length > 0
      ? gymnasts.filter((g) => linkedGymnasts.some((lg) => lg.id === g.id))
      : gymnasts;

    for (const gymnast of relevantGymnasts) {
      if (!gymnast.level) continue;

      const schedule = todaysSchedules.find(
        (s) => s.level === gymnast.level && s.schedule_group === (gymnast.schedule_group || 'A')
      );

      if (schedule) {
        const attendance = attendanceRecords.find((a) => a.gymnast_profile_id === gymnast.id);
        result.push({
          ...gymnast,
          attendance,
          expected_start: schedule.start_time,
          expected_end: schedule.end_time,
        });
      }
    }

    return result;
  }, [gymnasts, practiceSchedules, attendanceRecords, selectedDayOfWeek, isParent, linkedGymnasts]);

  const gymnastsByLevel = useMemo(() => {
    const grouped: Record<string, GymnastWithAttendance[]> = {};
    const levels = currentHub?.settings?.levels || [];

    for (const gymnast of gymnastsWithPractice) {
      const level = gymnast.level || 'Unknown';
      if (!grouped[level]) {
        grouped[level] = [];
      }
      grouped[level].push(gymnast);
    }

    const sortedEntries = Object.entries(grouped).sort(([a], [b]) => {
      const aIndex = levels.indexOf(a);
      const bIndex = levels.indexOf(b);
      if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return sortedEntries;
  }, [gymnastsWithPractice, currentHub?.settings?.levels]);

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

  const markAttendance = async (gymnastId: string, status: AttendanceStatus) => {
    if (!currentHub || !user) return;

    setSaving(gymnastId);

    const existing = attendanceRecords.find((a) => a.gymnast_profile_id === gymnastId);

    try {
      if (existing) {
        await supabase
          .from('attendance_records')
          .update({
            status,
            marked_by: user.id,
            marked_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('attendance_records').insert({
          hub_id: currentHub.id,
          gymnast_profile_id: gymnastId,
          attendance_date: selectedDate,
          status,
          marked_by: user.id,
          marked_at: new Date().toISOString(),
        });
      }

      await fetchAttendance();
    } catch (err) {
      console.error('Error marking attendance:', err);
      Alert.alert('Error', 'Failed to mark attendance');
    } finally {
      setSaving(null);
    }
  };

  const markAllPresent = async (level: string) => {
    if (!currentHub || !user) return;

    const levelGymnasts = gymnastsByLevel.find(([l]) => l === level)?.[1] || [];
    const unmarked = levelGymnasts.filter((g) => !g.attendance);

    if (unmarked.length === 0) return;

    setSaving(`all-${level}`);

    try {
      const records = unmarked.map((g) => ({
        hub_id: currentHub.id,
        gymnast_profile_id: g.id,
        attendance_date: selectedDate,
        status: 'present' as AttendanceStatus,
        marked_by: user.id,
        marked_at: new Date().toISOString(),
      }));

      await supabase.from('attendance_records').insert(records);
      await fetchAttendance();
    } catch (err) {
      console.error('Error marking all present:', err);
      Alert.alert('Error', 'Failed to mark all present');
    } finally {
      setSaving(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const goToPrevDay = () => {
    setSelectedDate(format(subDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const goToNextDay = () => {
    setSelectedDate(format(addDays(parseISO(selectedDate), 1), 'yyyy-MM-dd'));
  };

  const goToToday = () => {
    setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getLevelStats = (levelGymnasts: GymnastWithAttendance[]) => {
    const total = levelGymnasts.length;
    const present = levelGymnasts.filter((g) => g.attendance?.status === 'present').length;
    const late = levelGymnasts.filter((g) => g.attendance?.status === 'late').length;
    const absent = levelGymnasts.filter((g) => g.attendance?.status === 'absent').length;
    const unmarked = levelGymnasts.filter((g) => !g.attendance).length;
    return { total, present, late, absent, unmarked };
  };

  const renderGymnast = (gymnast: GymnastWithAttendance) => {
    const currentStatus = gymnast.attendance?.status;
    const isSaving = saving === gymnast.id;

    return (
      <View key={gymnast.id} style={styles.gymnastRow}>
        <View style={styles.gymnastInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {gymnast.first_name?.[0]}
              {gymnast.last_name?.[0]}
            </Text>
          </View>
          <View style={styles.gymnastDetails}>
            <Text style={styles.gymnastName}>
              {gymnast.first_name} {gymnast.last_name}
            </Text>
            {gymnast.expected_start && gymnast.expected_end && (
              <Text style={styles.gymnastTime}>
                {formatTime(gymnast.expected_start)} - {formatTime(gymnast.expected_end)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.statusButtons}>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.slate[400]} />
          ) : (
            (['present', 'late', 'left_early', 'absent'] as AttendanceStatus[]).map((status) => {
              const config = STATUS_CONFIG[status];
              const isActive = currentStatus === status;
              const Icon = config.icon;

              return (
                <TouchableOpacity
                  key={status}
                  onPress={() => canManage && markAttendance(gymnast.id, status)}
                  disabled={!canManage}
                  style={[
                    styles.statusButton,
                    isActive && { backgroundColor: config.bgColor },
                    !canManage && styles.statusButtonDisabled,
                  ]}
                >
                  <Icon size={18} color={isActive ? config.color : colors.slate[400]} />
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </View>
    );
  };

  const renderLevelSection = ({ item }: { item: [string, GymnastWithAttendance[]] }) => {
    const [level, levelGymnasts] = item;
    const isExpanded = expandedLevels.has(level);
    const stats = getLevelStats(levelGymnasts);

    return (
      <View style={styles.levelCard}>
        <TouchableOpacity
          style={styles.levelHeader}
          onPress={() => toggleLevel(level)}
          activeOpacity={0.7}
        >
          <View style={styles.levelTitleRow}>
            {isExpanded ? (
              <ChevronDown size={20} color={colors.slate[500]} />
            ) : (
              <ChevronUp size={20} color={colors.slate[500]} />
            )}
            <Text style={styles.levelTitle}>{level}</Text>
            <Text style={styles.levelCount}>({levelGymnasts.length})</Text>
          </View>

          <View style={styles.levelStats}>
            {stats.present > 0 && (
              <View style={[styles.statBadge, { backgroundColor: colors.emerald[100] }]}>
                <Text style={[styles.statBadgeText, { color: colors.emerald[700] }]}>
                  {stats.present}
                </Text>
              </View>
            )}
            {stats.late > 0 && (
              <View style={[styles.statBadge, { backgroundColor: colors.amber[100] }]}>
                <Text style={[styles.statBadgeText, { color: colors.amber[700] }]}>{stats.late}</Text>
              </View>
            )}
            {stats.absent > 0 && (
              <View style={[styles.statBadge, { backgroundColor: colors.error[100] }]}>
                <Text style={[styles.statBadgeText, { color: colors.error[700] }]}>
                  {stats.absent}
                </Text>
              </View>
            )}
            {canManage && stats.unmarked > 0 && (
              <TouchableOpacity
                style={styles.markAllButton}
                onPress={() => markAllPresent(level)}
                disabled={saving === `all-${level}`}
              >
                {saving === `all-${level}` ? (
                  <ActivityIndicator size="small" color={colors.emerald[700]} />
                ) : (
                  <Text style={styles.markAllText}>All Present</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.gymnastList}>{levelGymnasts.map(renderGymnast)}</View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.dateNav}>
        <TouchableOpacity onPress={goToPrevDay} style={styles.navButton}>
          <ChevronLeft size={24} color={colors.slate[600]} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday} style={styles.dateDisplay}>
          <Calendar size={18} color={colors.slate[500]} />
          <Text style={styles.dateText}>{format(parseISO(selectedDate), 'EEE, MMM d')}</Text>
          <Text style={styles.dayText}>{DAYS_OF_WEEK[selectedDayOfWeek]}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextDay} style={styles.navButton}>
          <ChevronRight size={24} color={colors.slate[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.summaryBar}>
        <Users size={16} color={colors.slate[500]} />
        <Text style={styles.summaryText}>
          {gymnastsWithPractice.length} gymnasts expected
        </Text>
      </View>

      {gymnastsByLevel.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={48} color={colors.slate[300]} />
          <Text style={styles.emptyTitle}>No practice scheduled</Text>
          <Text style={styles.emptyText}>
            No gymnasts have practice on {DAYS_OF_WEEK[selectedDayOfWeek]}.
          </Text>
        </View>
      ) : (
        <FlatList
          data={gymnastsByLevel}
          keyExtractor={([level]) => level}
          renderItem={renderLevelSection}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        />
      )}
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  navButton: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  dayText: {
    fontSize: 14,
    color: colors.slate[500],
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  summaryText: {
    fontSize: 14,
    color: colors.slate[600],
  },
  listContent: {
    padding: 16,
  },
  levelCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  levelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  levelCount: {
    fontSize: 14,
    color: colors.slate[500],
  },
  levelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  markAllButton: {
    backgroundColor: colors.emerald[100],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.emerald[700],
  },
  gymnastList: {
    paddingVertical: 4,
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
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.slate[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[600],
  },
  gymnastDetails: {
    flex: 1,
  },
  gymnastName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.slate[900],
  },
  gymnastTime: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate[100],
  },
  statusButtonDisabled: {
    opacity: 0.5,
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
});
