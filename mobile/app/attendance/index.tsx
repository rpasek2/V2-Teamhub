import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { CheckSquare, Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react-native';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { Badge } from '../../src/components/ui';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface AttendanceRecord {
  id: string;
  gymnast_name: string;
  gymnast_level: string | null;
  date: string;
  status: 'present' | 'late' | 'left_early' | 'absent';
  check_in_time: string | null;
  check_out_time: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  present: { label: 'Present', color: colors.emerald[700], bgColor: colors.emerald[100] },
  late: { label: 'Late', color: colors.amber[700], bgColor: colors.amber[100] },
  left_early: { label: 'Left Early', color: colors.orange[700], bgColor: colors.orange[100] },
  absent: { label: 'Absent', color: colors.error[700], bgColor: colors.error[100] },
};

export default function AttendanceScreen() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const { currentHub, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const isParent = useHubStore((state) => state.isParent);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });

  useEffect(() => {
    fetchAttendance();
  }, [currentHub?.id, currentWeek]);

  const fetchAttendance = async () => {
    if (!currentHub) {
      setRecords([]);
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('attendance_records')
        .select(`
          id,
          date,
          status,
          check_in_time,
          check_out_time,
          gymnast_profiles(first_name, last_name, level)
        `)
        .eq('hub_id', currentHub.id)
        .gte('date', format(weekStart, 'yyyy-MM-dd'))
        .lte('date', format(weekEnd, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      // Parents only see their linked gymnasts
      if (isParent() && linkedGymnasts.length > 0) {
        const linkedIds = linkedGymnasts.map(g => g.id);
        query = query.in('gymnast_profile_id', linkedIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching attendance:', error);
        setRecords([]);
      } else {
        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          gymnast_name: `${r.gymnast_profiles?.first_name || ''} ${r.gymnast_profiles?.last_name || ''}`.trim(),
          gymnast_level: r.gymnast_profiles?.level || null,
          date: r.date,
          status: r.status,
          check_in_time: r.check_in_time,
          check_out_time: r.check_out_time,
        }));
        setRecords(mapped);
      }
    } catch (err) {
      console.error('Error:', err);
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAttendance();
  };

  const goToPrevWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToThisWeek = () => {
    setCurrentWeek(new Date());
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    try {
      return format(parseISO(`2000-01-01T${time}`), 'h:mm a');
    } catch {
      return time;
    }
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.present;

    return (
      <View style={styles.recordCard}>
        <View style={styles.cardHeader}>
          <View style={styles.gymnastInfo}>
            <Text style={styles.gymnastName}>{item.gymnast_name}</Text>
            {item.gymnast_level && (
              <Badge label={item.gymnast_level} variant="neutral" size="sm" />
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Calendar size={14} color={colors.slate[400]} />
            <Text style={styles.detailText}>
              {format(parseISO(item.date), 'EEEE, MMM d')}
            </Text>
          </View>

          {(item.check_in_time || item.check_out_time) && (
            <View style={styles.detailRow}>
              <Clock size={14} color={colors.slate[400]} />
              <Text style={styles.detailText}>
                {item.check_in_time ? formatTime(item.check_in_time) : '—'}
                {' → '}
                {item.check_out_time ? formatTime(item.check_out_time) : '—'}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Group records by date
  const groupedByDate = records.reduce((acc, record) => {
    const date = record.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
        {/* Week Navigator */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={goToPrevWeek} style={styles.navButton}>
            <ChevronLeft size={24} color={colors.slate[600]} />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToThisWeek} style={styles.weekDisplay}>
            <Text style={styles.weekText}>
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goToNextWeek} style={styles.navButton}>
            <ChevronRight size={24} color={colors.slate[600]} />
          </TouchableOpacity>
        </View>

        {/* Records List */}
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          renderItem={renderRecord}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <CheckSquare size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No attendance records</Text>
              <Text style={styles.emptyText}>
                No attendance recorded for this week
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
  weekNav: {
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
  weekDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  weekText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  recordCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  gymnastInfo: {
    flex: 1,
    gap: 4,
  },
  gymnastName: {
    fontSize: 16,
    fontWeight: '600',
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
  cardDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: colors.slate[600],
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
