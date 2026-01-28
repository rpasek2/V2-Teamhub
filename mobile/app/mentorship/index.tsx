import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import {
  Heart,
  Search,
  X,
  Plus,
  Star,
  Cake,
  Trophy,
  ArrowRight,
  Calendar,
  Users,
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';

interface GymnastProfile {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  date_of_birth: string | null;
}

interface LittleWithCompetition {
  id: string;
  gymnast: GymnastProfile;
  next_competition?: { name: string; start_date: string } | null;
}

interface GroupedPairing {
  big_gymnast_id: string;
  big_gymnast: GymnastProfile;
  big_next_competition?: { name: string; start_date: string } | null;
  littles: LittleWithCompetition[];
  status: 'active' | 'inactive';
  notes: string | null;
}

interface MentorshipEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
}

type MobileTab = 'pairings' | 'events';

export default function MentorshipScreen() {
  const [pairings, setPairings] = useState<GroupedPairing[]>([]);
  const [events, setEvents] = useState<MentorshipEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<MobileTab>('pairings');
  const [showPastEvents, setShowPastEvents] = useState(false);

  const { currentHub, currentMember, linkedGymnasts, hasPermission, getPermissionScope } = useHubStore();
  const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentMember?.role || '');
  const mentorshipScope = getPermissionScope('mentorship');

  useEffect(() => {
    if (currentHub?.id) {
      fetchData();
    }
  }, [currentHub?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchPairings(), fetchEvents()]);
    setLoading(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const fetchPairings = async () => {
    if (!currentHub?.id) return;

    try {
      const { data: pairingsData, error: pairingsError } = await supabase
        .from('mentorship_pairs')
        .select(`
          *,
          big_gymnast:gymnast_profiles!mentorship_pairs_big_gymnast_id_fkey(*),
          little_gymnast:gymnast_profiles!mentorship_pairs_little_gymnast_id_fkey(*)
        `)
        .eq('hub_id', currentHub.id)
        .order('created_at', { ascending: false });

      if (pairingsError) {
        console.error('Error fetching pairings:', pairingsError);
        return;
      }

      // Get gymnast IDs for competition lookup
      const gymnastIds = new Set<string>();
      pairingsData?.forEach((p) => {
        gymnastIds.add(p.big_gymnast_id);
        gymnastIds.add(p.little_gymnast_id);
      });

      const today = new Date().toISOString().split('T')[0];

      // Fetch upcoming competitions
      const { data: competitionData } = await supabase
        .from('competition_gymnasts')
        .select(`
          gymnast_profile_id,
          competitions!inner(id, name, start_date)
        `)
        .in('gymnast_profile_id', Array.from(gymnastIds))
        .gte('competitions.start_date', today)
        .order('competitions(start_date)', { ascending: true });

      // Build next competition map
      const nextCompetitionMap = new Map<string, { name: string; start_date: string }>();
      competitionData?.forEach((cg: any) => {
        const comp = cg.competitions;
        if (comp && !nextCompetitionMap.has(cg.gymnast_profile_id)) {
          nextCompetitionMap.set(cg.gymnast_profile_id, {
            name: comp.name,
            start_date: comp.start_date,
          });
        }
      });

      // Group pairings by Big gymnast
      const groupedMap = new Map<string, GroupedPairing>();

      (pairingsData || []).forEach((p: any) => {
        const bigId = p.big_gymnast_id;

        if (!groupedMap.has(bigId)) {
          groupedMap.set(bigId, {
            big_gymnast_id: bigId,
            big_gymnast: p.big_gymnast as GymnastProfile,
            big_next_competition: nextCompetitionMap.get(bigId) || null,
            littles: [],
            status: p.status,
            notes: p.notes,
          });
        }

        const group = groupedMap.get(bigId)!;
        group.littles.push({
          id: p.id,
          gymnast: p.little_gymnast as GymnastProfile,
          next_competition: nextCompetitionMap.get(p.little_gymnast_id) || null,
        });
      });

      // Sort by level order from hub settings
      const levelOrder = (currentHub?.settings?.levels as string[]) || [];
      const sortedPairings = Array.from(groupedMap.values()).sort((a, b) => {
        const levelA = a.big_gymnast?.level || '';
        const levelB = b.big_gymnast?.level || '';
        const indexA = levelOrder.indexOf(levelA);
        const indexB = levelOrder.indexOf(levelB);
        const orderA = indexA === -1 ? levelOrder.length : indexA;
        const orderB = indexB === -1 ? levelOrder.length : indexB;
        return orderA - orderB;
      });

      setPairings(sortedPairings);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchEvents = async () => {
    if (!currentHub?.id) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, description, start_time, end_time, location')
        .eq('hub_id', currentHub.id)
        .eq('type', 'mentorship')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Filter pairings based on permission scope
  const visiblePairings = useMemo(() => {
    if (mentorshipScope === 'none') return [];
    if (mentorshipScope === 'own') {
      const linkedIds = linkedGymnasts.map((g) => g.id);
      return pairings.filter((group) => {
        const bigIsLinked = linkedIds.includes(group.big_gymnast_id);
        const anyLittleIsLinked = group.littles.some((l) =>
          linkedIds.includes(l.gymnast.id)
        );
        return bigIsLinked || anyLittleIsLinked;
      });
    }
    return pairings;
  }, [pairings, mentorshipScope, linkedGymnasts]);

  // Filter by search
  const filteredPairings = useMemo(() => {
    if (!searchQuery) return visiblePairings;

    const query = searchQuery.toLowerCase();
    return visiblePairings.filter((group) => {
      const bigName = `${group.big_gymnast?.first_name} ${group.big_gymnast?.last_name}`.toLowerCase();
      const littleNames = group.littles.map(
        (l) => `${l.gymnast?.first_name} ${l.gymnast?.last_name}`.toLowerCase()
      );
      return bigName.includes(query) || littleNames.some((name) => name.includes(query));
    });
  }, [visiblePairings, searchQuery]);

  // Split events into upcoming and past
  const now = new Date().toISOString();
  const upcomingEvents = events.filter((e) => e.start_time >= now);
  const pastEvents = events.filter((e) => e.start_time < now).reverse();

  const handleDeletePairing = async (pairingId: string, gymnastName: string) => {
    Alert.alert(
      'Remove Little',
      `Remove ${gymnastName} from this pairing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('mentorship_pairs')
              .delete()
              .eq('id', pairingId);

            if (!error) {
              fetchPairings();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.pink[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pairings' && styles.tabActive]}
          onPress={() => setActiveTab('pairings')}
        >
          <Users size={18} color={activeTab === 'pairings' ? colors.pink[600] : colors.slate[500]} />
          <Text style={[styles.tabText, activeTab === 'pairings' && styles.tabTextActive]}>
            Pairings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Calendar size={18} color={activeTab === 'events' ? colors.pink[600] : colors.slate[500]} />
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
            Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Pairings Tab */}
      {activeTab === 'pairings' && (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color={colors.slate[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name..."
                placeholderTextColor={colors.slate[400]}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.slate[400]} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.listContainer}
            contentContainerStyle={styles.listContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          >
            {filteredPairings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Heart size={48} color={colors.slate[300]} />
                <Text style={styles.emptyTitle}>No pairings found</Text>
                <Text style={styles.emptyText}>
                  {visiblePairings.length === 0
                    ? 'No Big/Little pairings have been created yet.'
                    : 'No pairings match your search.'}
                </Text>
              </View>
            ) : (
              filteredPairings.map((group) => (
                <PairingCard
                  key={group.big_gymnast_id}
                  groupedPairing={group}
                  onDeleteLittle={isStaff ? handleDeletePairing : undefined}
                />
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {upcomingEvents.length === 0 && pastEvents.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No events</Text>
              <Text style={styles.emptyText}>
                No mentorship events have been scheduled yet.
              </Text>
            </View>
          ) : (
            <>
              {/* Upcoming Events */}
              {upcomingEvents.length > 0 && (
                <View style={styles.eventsSection}>
                  <Text style={styles.eventsSectionTitle}>Upcoming Events</Text>
                  {upcomingEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </View>
              )}

              {upcomingEvents.length === 0 && (
                <View style={styles.noUpcomingContainer}>
                  <Text style={styles.noUpcomingText}>No upcoming events</Text>
                </View>
              )}

              {/* Past Events */}
              {pastEvents.length > 0 && (
                <View style={styles.eventsSection}>
                  <TouchableOpacity
                    style={styles.pastEventsToggle}
                    onPress={() => setShowPastEvents(!showPastEvents)}
                  >
                    <View style={styles.toggleLine} />
                    <Text style={styles.pastEventsToggleText}>
                      {showPastEvents ? 'Hide' : 'Show'} Past Events ({pastEvents.length})
                    </Text>
                    {showPastEvents ? (
                      <ChevronUp size={16} color={colors.slate[400]} />
                    ) : (
                      <ChevronDown size={16} color={colors.slate[400]} />
                    )}
                    <View style={styles.toggleLine} />
                  </TouchableOpacity>

                  {showPastEvents && (
                    <View style={styles.pastEventsContainer}>
                      {pastEvents.map((event) => (
                        <EventCard key={event.id} event={event} isPast />
                      ))}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// Pairing Card Component
function PairingCard({
  groupedPairing,
  onDeleteLittle,
}: {
  groupedPairing: GroupedPairing;
  onDeleteLittle?: (pairingId: string, gymnastName: string) => void;
}) {
  const { big_gymnast, big_next_competition, littles, notes } = groupedPairing;

  const formatBirthday = (dob: string | null) => {
    if (!dob) return null;
    return format(parseISO(dob), 'MMM d');
  };

  const formatCompDate = (date: string | null | undefined) => {
    if (!date) return null;
    return format(parseISO(date), 'MMM d');
  };

  return (
    <View style={styles.pairingCard}>
      <View style={styles.pairingContent}>
        {/* Big Section */}
        <View style={styles.bigSection}>
          <View style={styles.roleBadge}>
            <Star size={10} color={colors.white} />
            <Text style={styles.roleBadgeText}>BIG</Text>
          </View>
          <Text style={styles.gymnastName}>
            {big_gymnast?.first_name} {big_gymnast?.last_name}
          </Text>
          <Text style={styles.gymnastLevel}>{big_gymnast?.level}</Text>
          <View style={styles.gymnastMeta}>
            {big_gymnast?.date_of_birth && (
              <View style={styles.metaItem}>
                <Cake size={10} color={colors.purple[600]} />
                <Text style={[styles.metaText, { color: colors.purple[600] }]}>
                  {formatBirthday(big_gymnast.date_of_birth)}
                </Text>
              </View>
            )}
            {big_next_competition && (
              <View style={styles.metaItem}>
                <Trophy size={10} color={colors.purple[600]} />
                <Text style={[styles.metaText, { color: colors.purple[600] }]}>
                  {formatCompDate(big_next_competition.start_date)}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <ArrowRight size={14} color={colors.white} />
        </View>

        {/* Littles Section */}
        <View style={styles.littlesSection}>
          <View style={styles.littlesBadgeContainer}>
            <View style={styles.littleBadge}>
              <Heart size={10} color={colors.white} />
              <Text style={styles.littleBadgeText}>
                LITTLE{littles.length > 1 ? 'S' : ''}
              </Text>
            </View>
            {littles.length > 1 && (
              <Text style={styles.littlesCount}>({littles.length})</Text>
            )}
          </View>

          {littles.map((little) => (
            <TouchableOpacity
              key={little.id}
              style={styles.littleChip}
              activeOpacity={onDeleteLittle ? 0.7 : 1}
              onLongPress={() =>
                onDeleteLittle &&
                onDeleteLittle(
                  little.id,
                  `${little.gymnast.first_name} ${little.gymnast.last_name}`
                )
              }
            >
              <Text style={styles.littleName}>
                {little.gymnast?.first_name} {little.gymnast?.last_name}
              </Text>
              <Text style={styles.littleLevel}>{little.gymnast?.level}</Text>
              <View style={styles.littleMeta}>
                {little.gymnast?.date_of_birth && (
                  <View style={styles.metaItem}>
                    <Cake size={9} color={colors.pink[600]} />
                    <Text style={[styles.metaText, { color: colors.pink[600], fontSize: 9 }]}>
                      {formatBirthday(little.gymnast.date_of_birth)}
                    </Text>
                  </View>
                )}
                {little.next_competition && (
                  <View style={styles.metaItem}>
                    <Trophy size={9} color={colors.pink[600]} />
                    <Text style={[styles.metaText, { color: colors.pink[600], fontSize: 9 }]}>
                      {formatCompDate(little.next_competition.start_date)}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesText} numberOfLines={2}>
            {notes}
          </Text>
        </View>
      )}
    </View>
  );
}

// Event Card Component
function EventCard({ event, isPast }: { event: MentorshipEvent; isPast?: boolean }) {
  const startDate = parseISO(event.start_time);
  const endDate = parseISO(event.end_time);
  const isSameDay = format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd');

  return (
    <View style={[styles.eventCard, isPast && styles.eventCardPast]}>
      <View style={styles.eventDateBadge}>
        <Text style={styles.eventMonth}>{format(startDate, 'MMM')}</Text>
        <Text style={styles.eventDay}>{format(startDate, 'd')}</Text>
      </View>
      <View style={styles.eventContent}>
        <Text style={[styles.eventTitle, isPast && styles.eventTitlePast]}>{event.title}</Text>
        <View style={styles.eventMeta}>
          <Clock size={12} color={colors.slate[400]} />
          <Text style={styles.eventMetaText}>
            {format(startDate, 'h:mm a')}
            {isSameDay ? ` - ${format(endDate, 'h:mm a')}` : ''}
          </Text>
        </View>
        {event.location && (
          <View style={styles.eventMeta}>
            <MapPin size={12} color={colors.slate[400]} />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}
        {event.description && (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        )}
      </View>
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

  // Tab Navigation
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
    borderBottomColor: colors.pink[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: colors.pink[600],
  },

  // Search
  searchContainer: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[200],
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.slate[100],
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.slate[900],
  },

  // List
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
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

  // Pairing Card
  pairingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  pairingContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'flex-start',
  },

  // Big Section
  bigSection: {
    width: 90,
    alignItems: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.purple[600],
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gymnastName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[900],
    textAlign: 'center',
    marginTop: 6,
  },
  gymnastLevel: {
    fontSize: 11,
    color: colors.slate[600],
    marginTop: 2,
  },
  gymnastMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Arrow
  arrowContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    marginTop: 20,
    backgroundColor: colors.pink[500],
  },

  // Littles Section
  littlesSection: {
    flex: 1,
    minWidth: 0,
  },
  littlesBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 8,
  },
  littleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.pink[600],
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  littleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  littlesCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.pink[600],
  },
  littleChip: {
    backgroundColor: colors.pink[50],
    borderWidth: 1,
    borderColor: colors.pink[200],
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  littleName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[900],
  },
  littleLevel: {
    fontSize: 10,
    color: colors.slate[600],
    marginTop: 1,
  },
  littleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },

  // Notes
  notesContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.slate[50],
  },
  notesText: {
    fontSize: 11,
    color: colors.slate[500],
    textAlign: 'center',
  },

  // Events Section
  eventsSection: {
    marginBottom: 16,
  },
  eventsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 12,
  },
  noUpcomingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 16,
  },
  noUpcomingText: {
    fontSize: 14,
    color: colors.slate[400],
  },

  // Past Events Toggle
  pastEventsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  toggleLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.slate[200],
  },
  pastEventsToggleText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  pastEventsContainer: {
    opacity: 0.6,
  },

  // Event Card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  eventCardPast: {
    opacity: 0.7,
  },
  eventDateBadge: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.pink[500],
    paddingVertical: 10,
  },
  eventMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.pink[100],
    textTransform: 'uppercase',
  },
  eventDay: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    marginTop: -2,
  },
  eventContent: {
    flex: 1,
    padding: 12,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 6,
  },
  eventTitlePast: {
    color: colors.slate[600],
  },
  eventMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  eventMetaText: {
    fontSize: 12,
    color: colors.slate[500],
  },
  eventDescription: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 4,
    lineHeight: 16,
  },
});
