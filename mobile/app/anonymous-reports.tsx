import React, { useState, useEffect } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { ShieldAlert, Trash2, ArrowLeft } from 'lucide-react-native';
import { colors, theme } from '../src/constants/colors';
import { supabase } from '../src/services/supabase';
import { useHubStore } from '../src/stores/hubStore';
import { format, parseISO } from 'date-fns';

interface AnonymousReport {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

export default function AnonymousReportsScreen() {
  const [reports, setReports] = useState<AnonymousReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnonymousReport | null>(null);

  const { currentHub, currentMember } = useHubStore();
  const isOwner = currentMember?.role === 'owner';

  useEffect(() => {
    if (!isOwner) {
      router.back();
      return;
    }
    fetchReports();
  }, [isOwner]);

  const fetchReports = async () => {
    if (!currentHub) return;

    try {
      const { data, error } = await supabase
        .from('anonymous_reports')
        .select('*')
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reports:', error);
      } else {
        setReports(data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const markAsRead = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('anonymous_reports')
        .update({ read_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) {
        console.error('Error marking report as read:', error);
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, read_at: new Date().toISOString() } : r
          )
        );
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const deleteReport = async (reportId: string) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('anonymous_reports')
                .delete()
                .eq('id', reportId);

              if (error) {
                console.error('Error deleting report:', error);
              } else {
                setReports((prev) => prev.filter((r) => r.id !== reportId));
                if (selectedReport?.id === reportId) {
                  setSelectedReport(null);
                }
              }
            } catch (err) {
              console.error('Error:', err);
            }
          },
        },
      ]
    );
  };

  const handleSelectReport = (report: AnonymousReport) => {
    setSelectedReport(report);
    if (!report.read_at) {
      markAsRead(report.id);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return '';
    }
  };

  const renderReport = ({ item }: { item: AnonymousReport }) => (
    <TouchableOpacity
      style={[
        styles.reportItem,
        !item.read_at && styles.unreadReport,
        selectedReport?.id === item.id && styles.selectedReport,
      ]}
      onPress={() => handleSelectReport(item)}
      activeOpacity={0.7}
    >
      <View style={styles.reportHeader}>
        {!item.read_at && <View style={styles.unreadDot} />}
        <Text style={styles.reportDate}>{formatDate(item.created_at)}</Text>
      </View>
      <Text style={styles.reportPreview} numberOfLines={2}>
        {item.message}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            title: 'Anonymous Reports',
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()}>
                <ArrowLeft size={24} color={colors.slate[700]} />
              </TouchableOpacity>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Anonymous Reports',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={24} color={colors.slate[700]} />
            </TouchableOpacity>
          ),
        }}
      />

      {selectedReport ? (
        // Report Detail View
        <View style={styles.detailContainer}>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              onPress={() => setSelectedReport(null)}
              style={styles.backToList}
            >
              <ArrowLeft size={20} color={colors.purple[600]} />
              <Text style={styles.backToListText}>Back to list</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteReport(selectedReport.id)}
              style={styles.deleteButton}
            >
              <Trash2 size={20} color={colors.error[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.detailContent}>
            <View style={styles.detailMeta}>
              <ShieldAlert size={20} color={colors.purple[600]} />
              <Text style={styles.detailDate}>
                {formatDate(selectedReport.created_at)}
              </Text>
            </View>
            <Text style={styles.detailMessage}>{selectedReport.message}</Text>
          </View>
        </View>
      ) : (
        // Reports List View
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <ShieldAlert size={48} color={colors.purple[400]} />
              </View>
              <Text style={styles.emptyTitle}>No anonymous reports</Text>
              <Text style={styles.emptyText}>
                When members submit anonymous reports, they'll appear here.
              </Text>
            </View>
          }
          ListHeaderComponent={
            reports.length > 0 ? (
              <View style={styles.listHeader}>
                <Text style={styles.listHeaderText}>
                  {reports.length} report{reports.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  listContent: {
    flexGrow: 1,
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  listHeaderText: {
    fontSize: 14,
    color: colors.slate[500],
  },
  reportItem: {
    padding: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  unreadReport: {
    backgroundColor: colors.purple[50],
  },
  selectedReport: {
    backgroundColor: colors.white,
    borderLeftWidth: 3,
    borderLeftColor: colors.purple[500],
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.purple[500],
    marginRight: 8,
  },
  reportDate: {
    fontSize: 12,
    color: colors.slate[500],
  },
  reportPreview: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.purple[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.slate[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  detailContainer: {
    flex: 1,
    backgroundColor: colors.white,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  backToList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToListText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.purple[600],
  },
  deleteButton: {
    padding: 8,
  },
  detailContent: {
    padding: 16,
  },
  detailMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  detailDate: {
    fontSize: 14,
    color: colors.slate[600],
  },
  detailMessage: {
    fontSize: 16,
    color: colors.slate[900],
    lineHeight: 24,
  },
});
