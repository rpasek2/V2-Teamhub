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
import { router } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { MobileTabGuard } from '../../src/components/ui';

interface ProgressReport {
  id: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  status: string;
  created_at: string;
  gymnast_profiles?: { first_name: string; last_name: string; level: string | null }[];
}

export default function ProgressReportsScreen() {
  const { t, isDark } = useTheme();
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const currentHub = useHubStore((state) => state.currentHub);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (currentHub?.id) fetchReports();
  }, [currentHub?.id]);

  const fetchReports = async () => {
    if (!currentHub?.id || !user?.id) return;
    setLoading(true);

    // Fetch published reports for gymnasts linked to this user
    const { data: linkedGymnasts } = await supabase
      .from('gymnast_profiles')
      .select('id')
      .eq('hub_id', currentHub.id)
      .eq('user_id', user.id);

    const gymnastIds = (linkedGymnasts || []).map(g => g.id);

    if (gymnastIds.length === 0) {
      setReports([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('progress_reports')
      .select('id, title, date_range_start, date_range_end, status, created_at, gymnast_profiles!gymnast_profile_id(first_name, last_name, level)')
      .eq('hub_id', currentHub.id)
      .eq('status', 'published')
      .in('gymnast_profile_id', gymnastIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reports:', error);
    } else {
      setReports((data || []) as ProgressReport[]);
    }
    setLoading(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports().finally(() => setRefreshing(false));
  };

  if (loading) {
    return (
      <MobileTabGuard tabId="progress_reports">
        <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.primary} />
        </View>
      </MobileTabGuard>
    );
  }

  return (
    <MobileTabGuard tabId="progress_reports">
    <View style={[styles.container, { backgroundColor: t.background }]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FileText size={48} color={t.textFaint} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>No progress reports</Text>
            <Text style={[styles.emptyText, { color: t.textMuted }]}>
              No progress reports have been shared yet.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const gymnast = Array.isArray(item.gymnast_profiles)
            ? item.gymnast_profiles[0]
            : item.gymnast_profiles;

          return (
            <TouchableOpacity
              style={[styles.reportCard, { backgroundColor: t.surface, borderColor: t.border }]}
              activeOpacity={0.7}
              onPress={() => router.push(`/progress-reports/${item.id}` as any)}
            >
              <View style={[styles.reportIcon, { backgroundColor: `${t.primary}15` }]}>
                <FileText size={20} color={t.primary} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={[styles.reportTitle, { color: t.text }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.reportMeta, { color: t.textMuted }]}>
                  {gymnast ? `${gymnast.first_name} ${gymnast.last_name}` : ''} · {gymnast?.level || ''}
                </Text>
                <Text style={[styles.reportDate, { color: t.textFaint }]}>
                  {format(new Date(item.date_range_start + 'T00:00:00'), 'MMM d')} — {format(new Date(item.date_range_end + 'T00:00:00'), 'MMM d, yyyy')}
                </Text>
              </View>
              <ChevronRight size={20} color={t.textFaint} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
    </MobileTabGuard>
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${colors.brand[600]}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
  },
  reportMeta: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  reportDate: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
});
