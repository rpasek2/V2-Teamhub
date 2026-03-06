import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Trophy,
  MapPin,
  Calendar,
  Users,
  Clock,
  ExternalLink,
  Award,
  Medal,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Linking from 'expo-linking';

// Parse date-only strings (YYYY-MM-DD) as local dates, not UTC
const parseLocalDate = (dateStr: string) => new Date(dateStr + 'T00:00:00');
import { colors } from '../../src/constants/colors';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

// Import extracted components and types
import {
  Competition,
  Gymnast,
  Session,
  AllGymnast,
  RawRosterItem,
  GymEvent,
} from '../../src/components/competitions/types';
import { RosterTab } from '../../src/components/competitions/RosterTab';
import { SessionsTab } from '../../src/components/competitions/SessionsTab';
import { ManageRosterModal } from '../../src/components/competitions/ManageRosterModal';
import { CreateSessionModal } from '../../src/components/competitions/CreateSessionModal';
import { AssignSessionGymnastsModal } from '../../src/components/competitions/AssignSessionGymnastsModal';

type TabType = 'roster' | 'sessions';

const CHAMPIONSHIP_BADGE: Record<string, { Icon: typeof Award; label: string; bgColor: (isDark: boolean) => string; textColor: (isDark: boolean) => string }> = {
  state: { Icon: Award, label: 'State Championship', bgColor: (d) => d ? colors.blue[700] + '30' : colors.blue[100], textColor: (d) => d ? colors.blue[400] : colors.blue[700] },
  regional: { Icon: Medal, label: 'Regional Championship', bgColor: (d) => d ? colors.purple[700] + '30' : colors.purple[100], textColor: (d) => d ? colors.purple[400] : colors.purple[700] },
  national: { Icon: Trophy, label: 'National Championship', bgColor: (d) => d ? colors.amber[700] + '30' : colors.amber[100], textColor: (d) => d ? colors.amber[500] : colors.amber[700] },
};

export default function CompetitionDetailsScreen() {
  const { t, isDark } = useTheme();
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const currentHub = useHubStore((state) => state.currentHub);
  const canEdit = useHubStore((state) => state.canEdit);

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [roster, setRoster] = useState<Gymnast[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('roster');

  // Manage roster modal state
  const [isManageRosterModalOpen, setIsManageRosterModalOpen] = useState(false);
  const [allGymnasts, setAllGymnasts] = useState<AllGymnast[]>([]);
  const [selectedGymnastIds, setSelectedGymnastIds] = useState<Set<string>>(new Set());
  const [savingRoster, setSavingRoster] = useState(false);

  // Session modals state
  const [isCreateSessionModalOpen, setIsCreateSessionModalOpen] = useState(false);
  const [isAssignGymnastsModalOpen, setIsAssignGymnastsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const hubLevels = currentHub?.settings?.levels || [];

  useEffect(() => {
    if (competitionId) {
      fetchData();
    }
  }, [competitionId]);

  const fetchData = async () => {
    await Promise.all([
      fetchCompetitionDetails(),
      fetchRoster(),
      fetchSessions(),
    ]);
    setLoading(false);
    setRefreshing(false);
  };

  const fetchCompetitionDetails = async () => {
    if (!competitionId) return;

    const { data, error } = await supabase
      .from('competitions')
      .select('id, hub_id, name, start_date, end_date, location, championship_type')
      .eq('id', competitionId)
      .single();

    if (error) {
      console.error('Error fetching competition:', error);
    } else {
      setCompetition(data);
    }
  };

  const fetchRoster = async () => {
    if (!competitionId) return;

    const { data, error } = await supabase
      .from('competition_gymnasts')
      .select(`
        gymnast_profile_id,
        events,
        gymnast_profiles(id, first_name, last_name, level, gender)
      `)
      .eq('competition_id', competitionId);

    if (error) {
      console.error('Error fetching roster:', error);
    } else if (data) {
      const mapped = (data as RawRosterItem[]).map((d) => ({
        gymnast_profile_id: d.gymnast_profile_id,
        events: (d.events || []) as GymEvent[],
        gymnast_profiles: Array.isArray(d.gymnast_profiles)
          ? d.gymnast_profiles[0]
          : d.gymnast_profiles,
      }));
      setRoster(mapped as Gymnast[]);
    }
  };

  const fetchSessions = async () => {
    if (!competitionId) return;

    const { data, error } = await supabase
      .from('competition_sessions')
      .select(`
        id, name, date, warmup_time, awards_time,
        session_coaches(
          user_id,
          profiles(full_name)
        ),
        session_gymnasts(
          gymnast_profile_id,
          gymnast_profiles(first_name, last_name, level)
        )
      `)
      .eq('competition_id', competitionId)
      .order('date', { ascending: true })
      .order('warmup_time', { ascending: true });

    if (error) {
      console.error('Error fetching sessions:', error);
    } else {
      setSessions((data as unknown as Session[]) || []);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Toggle event for a gymnast (staff only)
  const toggleEvent = async (gymnastProfileId: string, event: GymEvent, currentEvents: GymEvent[]) => {
    if (!canEdit() || !competitionId) return;

    const newEvents = currentEvents.includes(event)
      ? currentEvents.filter((e) => e !== event)
      : [...currentEvents, event];

    // Optimistic update
    setRoster((prev) =>
      prev.map((g) =>
        g.gymnast_profile_id === gymnastProfileId ? { ...g, events: newEvents } : g
      )
    );

    const { error } = await supabase
      .from('competition_gymnasts')
      .update({ events: newEvents })
      .eq('competition_id', competitionId)
      .eq('gymnast_profile_id', gymnastProfileId);

    if (error) {
      console.error('Error updating events:', error);
      // Revert on error
      setRoster((prev) =>
        prev.map((g) =>
          g.gymnast_profile_id === gymnastProfileId ? { ...g, events: currentEvents } : g
        )
      );
      Alert.alert('Error', 'Failed to update events');
    }
  };

  // Fetch all gymnasts for manage roster modal
  const fetchAllGymnasts = async () => {
    if (!currentHub) return;

    const { data, error } = await supabase
      .from('gymnast_profiles')
      .select('id, first_name, last_name, level, gender')
      .eq('hub_id', currentHub.id)
      .order('last_name');

    if (error) {
      console.error('Error fetching all gymnasts:', error);
    } else {
      setAllGymnasts(data || []);
    }
  };

  // Open manage roster modal
  const handleOpenManageRoster = async () => {
    await fetchAllGymnasts();
    // Pre-select gymnasts already in roster
    setSelectedGymnastIds(new Set(roster.map((g) => g.gymnast_profile_id)));
    setIsManageRosterModalOpen(true);
  };

  // Toggle gymnast selection in modal
  const toggleGymnastSelection = (gymnastId: string) => {
    setSelectedGymnastIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(gymnastId)) {
        newSet.delete(gymnastId);
      } else {
        newSet.add(gymnastId);
      }
      return newSet;
    });
  };

  // Save roster changes
  const handleSaveRoster = async () => {
    if (!competitionId) return;

    setSavingRoster(true);

    const currentIds = new Set(roster.map((g) => g.gymnast_profile_id));
    const toAdd = [...selectedGymnastIds].filter((id) => !currentIds.has(id));
    const toRemove = [...currentIds].filter((id) => !selectedGymnastIds.has(id));

    try {
      // Remove gymnasts
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('competition_gymnasts')
          .delete()
          .eq('competition_id', competitionId)
          .in('gymnast_profile_id', toRemove);

        if (removeError) throw removeError;
      }

      // Add gymnasts
      if (toAdd.length > 0) {
        const inserts = toAdd.map((gymnastId) => ({
          competition_id: competitionId,
          gymnast_profile_id: gymnastId,
          events: [],
        }));

        const { error: addError } = await supabase
          .from('competition_gymnasts')
          .insert(inserts);

        if (addError) throw addError;
      }

      // Refresh roster
      await fetchRoster();
      setIsManageRosterModalOpen(false);
    } catch (error) {
      console.error('Error saving roster:', error);
      Alert.alert('Error', 'Failed to update roster');
    } finally {
      setSavingRoster(false);
    }
  };

  // Session modal handlers
  const handleOpenCreateSession = () => {
    setIsCreateSessionModalOpen(true);
  };

  const handleCloseCreateSession = () => {
    setIsCreateSessionModalOpen(false);
  };

  const handleSessionCreated = () => {
    fetchSessions();
  };

  const handleOpenAssignGymnasts = (session: Session) => {
    setSelectedSession(session);
    setIsAssignGymnastsModalOpen(true);
  };

  const handleCloseAssignGymnasts = () => {
    setSelectedSession(null);
    setIsAssignGymnastsModalOpen(false);
  };

  const handleGymnastsAssigned = () => {
    fetchSessions();
  };

  const openMaps = (location: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.primary} />
      </View>
    );
  }

  if (!competition) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: t.background }]}>
        <Trophy size={48} color={t.textFaint} />
        <Text style={[styles.emptyTitle, { color: t.text }]}>Competition not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: t.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <View style={[styles.headerIcon, { backgroundColor: isDark ? colors.amber[700] + '20' : colors.amber[50] }]}>
          <Trophy size={24} color={isDark ? colors.amber[500] : colors.amber[600]} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.competitionName, { color: t.text }]}>{competition.name}</Text>
          {competition.championship_type && CHAMPIONSHIP_BADGE[competition.championship_type] && (() => {
            const badge = CHAMPIONSHIP_BADGE[competition.championship_type!];
            const BadgeIcon = badge.Icon;
            return (
              <View style={[styles.championshipBadge, { backgroundColor: badge.bgColor(isDark) }]}>
                <BadgeIcon size={12} color={badge.textColor(isDark)} />
                <Text style={[styles.championshipBadgeText, { color: badge.textColor(isDark) }]}>{badge.label}</Text>
              </View>
            );
          })()}
          <View style={styles.headerDetails}>
            <View style={styles.detailRow}>
              <Calendar size={14} color={t.textFaint} />
              <Text style={[styles.detailText, { color: t.textSecondary }]}>
                {format(parseLocalDate(competition.start_date), 'MMM d')}
                {competition.end_date !== competition.start_date &&
                  ` - ${format(parseLocalDate(competition.end_date), 'MMM d')}`}
                {`, ${format(parseLocalDate(competition.start_date), 'yyyy')}`}
              </Text>
            </View>
            {competition.location && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => openMaps(competition.location!)}
              >
                <MapPin size={14} color={t.textFaint} />
                <Text style={[styles.detailText, styles.linkText, { color: t.primary }]} numberOfLines={1}>
                  {competition.location}
                </Text>
                <ExternalLink size={12} color={t.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabContainer, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roster' && styles.tabActive, activeTab === 'roster' && { borderBottomColor: t.primary }]}
          onPress={() => setActiveTab('roster')}
        >
          <Users size={16} color={activeTab === 'roster' ? t.primary : t.textMuted} />
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === 'roster' && { color: t.primary }]}>
            Roster
          </Text>
          <View style={[styles.tabBadge, { backgroundColor: t.surfaceSecondary }]}>
            <Text style={[styles.tabBadgeText, { color: t.textSecondary }]}>{roster.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive, activeTab === 'sessions' && { borderBottomColor: t.primary }]}
          onPress={() => setActiveTab('sessions')}
        >
          <Clock size={16} color={activeTab === 'sessions' ? t.primary : t.textMuted} />
          <Text style={[styles.tabText, { color: t.textMuted }, activeTab === 'sessions' && { color: t.primary }]}>
            Sessions
          </Text>
          {sessions.length > 0 && (
            <View style={[styles.tabBadge, { backgroundColor: t.surfaceSecondary }]}>
              <Text style={[styles.tabBadgeText, { color: t.textSecondary }]}>{sessions.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={t.textMuted} />
        }
      >
        {activeTab === 'roster' && (
          <RosterTab
            roster={roster}
            isStaff={canEdit()}
            hubLevels={hubLevels}
            onToggleEvent={toggleEvent}
            onManageRoster={handleOpenManageRoster}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            hubLevels={hubLevels}
            isStaff={canEdit()}
            onAddSession={handleOpenCreateSession}
            onManageSessionGymnasts={handleOpenAssignGymnasts}
          />
        )}
      </ScrollView>

      {/* Manage Roster Modal */}
      <ManageRosterModal
        visible={isManageRosterModalOpen}
        onClose={() => setIsManageRosterModalOpen(false)}
        allGymnasts={allGymnasts}
        selectedIds={selectedGymnastIds}
        onToggleSelection={toggleGymnastSelection}
        onSave={handleSaveRoster}
        saving={savingRoster}
        hubLevels={hubLevels}
      />

      {/* Create Session Modal */}
      {competition && currentHub && (
        <CreateSessionModal
          visible={isCreateSessionModalOpen}
          onClose={handleCloseCreateSession}
          onSessionCreated={handleSessionCreated}
          competitionId={competition.id}
          hubId={currentHub.id}
          defaultDate={new Date(competition.start_date)}
        />
      )}

      {/* Assign Gymnasts to Session Modal */}
      {selectedSession && (
        <AssignSessionGymnastsModal
          visible={isAssignGymnastsModalOpen}
          onClose={handleCloseAssignGymnasts}
          onGymnastsAssigned={handleGymnastsAssigned}
          sessionId={selectedSession.id}
          sessionName={selectedSession.name}
          competitionId={competitionId!}
          currentGymnastIds={selectedSession.session_gymnasts?.map(g => g.gymnast_profile_id) || []}
          hubLevels={hubLevels}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.slate[50],
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.amber[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  competitionName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
    marginBottom: 8,
  },
  headerDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: colors.slate[600],
  },
  linkText: {
    color: colors.brand[600],
    flex: 1,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.brand[600],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: colors.brand[600],
  },
  tabBadge: {
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.slate[600],
  },

  // Content
  content: {
    flex: 1,
  },
  championshipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  championshipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
