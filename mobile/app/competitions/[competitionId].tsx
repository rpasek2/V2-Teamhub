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
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import * as Linking from 'expo-linking';
import { colors, theme } from '../../src/constants/colors';
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
} from './components/types';
import { RosterTab } from './components/RosterTab';
import { SessionsTab } from './components/SessionsTab';
import { ManageRosterModal } from './components/ManageRosterModal';
import { CreateSessionModal } from './components/CreateSessionModal';
import { AssignSessionGymnastsModal } from './components/AssignSessionGymnastsModal';

type TabType = 'roster' | 'sessions';

export default function CompetitionDetailsScreen() {
  const { competitionId } = useLocalSearchParams<{ competitionId: string }>();
  const currentHub = useHubStore((state) => state.currentHub);
  const isStaff = useHubStore((state) => state.isStaff);

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
      .select('id, hub_id, name, start_date, end_date, location')
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
    if (!isStaff() || !competitionId) return;

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  if (!competition) {
    return (
      <View style={styles.emptyContainer}>
        <Trophy size={48} color={colors.slate[300]} />
        <Text style={styles.emptyTitle}>Competition not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Trophy size={24} color={colors.amber[600]} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.competitionName}>{competition.name}</Text>
          <View style={styles.headerDetails}>
            <View style={styles.detailRow}>
              <Calendar size={14} color={colors.slate[400]} />
              <Text style={styles.detailText}>
                {format(parseISO(competition.start_date), 'MMM d')}
                {competition.end_date !== competition.start_date &&
                  ` - ${format(parseISO(competition.end_date), 'MMM d')}`}
                {`, ${format(parseISO(competition.start_date), 'yyyy')}`}
              </Text>
            </View>
            {competition.location && (
              <TouchableOpacity
                style={styles.detailRow}
                onPress={() => openMaps(competition.location!)}
              >
                <MapPin size={14} color={colors.slate[400]} />
                <Text style={[styles.detailText, styles.linkText]} numberOfLines={1}>
                  {competition.location}
                </Text>
                <ExternalLink size={12} color={theme.light.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'roster' && styles.tabActive]}
          onPress={() => setActiveTab('roster')}
        >
          <Users size={16} color={activeTab === 'roster' ? theme.light.primary : colors.slate[500]} />
          <Text style={[styles.tabText, activeTab === 'roster' && styles.tabTextActive]}>
            Roster
          </Text>
          <View style={styles.tabBadge}>
            <Text style={styles.tabBadgeText}>{roster.length}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sessions' && styles.tabActive]}
          onPress={() => setActiveTab('sessions')}
        >
          <Clock size={16} color={activeTab === 'sessions' ? theme.light.primary : colors.slate[500]} />
          <Text style={[styles.tabText, activeTab === 'sessions' && styles.tabTextActive]}>
            Sessions
          </Text>
          {sessions.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{sessions.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'roster' && (
          <RosterTab
            roster={roster}
            isStaff={isStaff()}
            hubLevels={hubLevels}
            onToggleEvent={toggleEvent}
            onManageRoster={handleOpenManageRoster}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            sessions={sessions}
            hubLevels={hubLevels}
            isStaff={isStaff()}
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
    color: theme.light.primary,
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
    borderBottomColor: theme.light.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: theme.light.primary,
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
});
