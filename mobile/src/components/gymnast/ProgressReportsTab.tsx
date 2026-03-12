import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { format } from 'date-fns';
import { colors } from '../../constants/colors';
import { useTheme } from '../../hooks/useTheme';
import { supabase } from '../../services/supabase';
import { useHubStore } from '../../stores/hubStore';

interface ProgressReport {
  id: string;
  title: string;
  date_range_start: string;
  date_range_end: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
}

interface ProgressReportsTabProps {
  gymnastProfileId: string;
}

export function ProgressReportsTab({ gymnastProfileId }: ProgressReportsTabProps) {
  const { t } = useTheme();
  const currentHub = useHubStore((s) => s.currentHub);
  const isParent = useHubStore((s) => s.isParent);
  const [reports, setReports] = useState<ProgressReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentHub?.id) fetchReports();
  }, [gymnastProfileId, currentHub?.id]);

  const fetchReports = async () => {
    if (!currentHub?.id) return;
    setLoading(true);

    let query = supabase
      .from('progress_reports')
      .select('id, title, date_range_start, date_range_end, status, published_at, created_at')
      .eq('hub_id', currentHub.id)
      .eq('gymnast_profile_id', gymnastProfileId)
      .order('created_at', { ascending: false });

    if (isParent()) {
      query = query.eq('status', 'published');
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching progress reports:', error);
    } else {
      setReports((data || []) as ProgressReport[]);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FileText size={40} color={t.textFaint} />
        <Text style={[styles.emptyTitle, { color: t.text }]}>No progress reports</Text>
        <Text style={[styles.emptyText, { color: t.textMuted }]}>
          {isParent()
            ? 'No progress reports have been shared yet.'
            : 'No progress reports have been created for this gymnast yet.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {reports.map((report) => (
        <TouchableOpacity
          key={report.id}
          style={[styles.reportCard, { backgroundColor: t.surface, borderColor: t.border }]}
          activeOpacity={0.7}
          onPress={() => router.push(`/progress-reports/${report.id}` as never)}
        >
          <View style={[styles.reportIcon, { backgroundColor: `${t.primary}15` }]}>
            <FileText size={20} color={t.primary} />
          </View>
          <View style={styles.reportInfo}>
            <View style={styles.titleRow}>
              <Text style={[styles.reportTitle, { color: t.text }]} numberOfLines={1}>{report.title}</Text>
              {!isParent() && (
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: report.status === 'published' ? `${colors.emerald[500]}15` : `${colors.amber[500]}15` }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: report.status === 'published' ? colors.emerald[600] : colors.amber[600] }
                  ]}>
                    {report.status === 'published' ? 'Published' : 'Draft'}
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.reportDate, { color: t.textMuted }]}>
              {format(new Date(report.date_range_start + 'T00:00:00'), 'MMM d')} — {format(new Date(report.date_range_end + 'T00:00:00'), 'MMM d, yyyy')}
            </Text>
          </View>
          <ChevronRight size={18} color={t.textFaint} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  reportDate: {
    fontSize: 13,
    marginTop: 2,
  },
});
