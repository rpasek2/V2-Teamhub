import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import {
  GraduationCap,
  Search,
  Calendar,
  User,
  DollarSign,
  Clock,
  Target,
  Star,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { format, parseISO, isPast } from 'date-fns';
import { colors, theme } from '../../src/constants/colors';
import { supabase } from '../../src/services/supabase';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';

interface CoachLessonProfile {
  id: string;
  hub_id: string;
  coach_user_id: string;
  bio: string | null;
  events: string[];
  levels: string[];
  cost_per_lesson: number;
  lesson_duration_minutes: number;
  is_active: boolean;
  coach_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface LessonPackage {
  id: string;
  coach_user_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  cost: number;
  is_active: boolean;
}

interface LessonBooking {
  id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  coach_profiles?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  lesson_packages?: LessonPackage;
}

type Tab = 'coaches' | 'my-bookings';

export default function PrivateLessonsScreen() {
  const [coaches, setCoaches] = useState<CoachLessonProfile[]>([]);
  const [coachPackages, setCoachPackages] = useState<Record<string, LessonPackage[]>>({});
  const [bookings, setBookings] = useState<LessonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('coaches');

  const currentHub = useHubStore((state) => state.currentHub);
  const currentMember = useHubStore((state) => state.currentMember);
  const user = useAuthStore((state) => state.user);
  const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentMember?.role || '');

  useEffect(() => {
    if (currentHub?.id) {
      fetchData();
    }
  }, [currentHub?.id]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchCoaches(), fetchBookings()]);
    setLoading(false);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData().finally(() => setRefreshing(false));
  };

  const fetchCoaches = async () => {
    if (!currentHub?.id) return;

    try {
      const [coachResult, packageResult] = await Promise.all([
        supabase
          .from('coach_lesson_profiles')
          .select('id, hub_id, coach_user_id, bio, events, levels, cost_per_lesson, lesson_duration_minutes, is_active, coach_profile:profiles!coach_user_id(id, full_name, avatar_url)')
          .eq('hub_id', currentHub.id)
          .eq('is_active', true)
          .order('created_at', { ascending: true }),
        supabase
          .from('lesson_packages')
          .select('id, coach_user_id, name, description, duration_minutes, cost, is_active')
          .eq('hub_id', currentHub.id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),
      ]);

      if (coachResult.error) {
        console.error('Error fetching coaches:', coachResult.error);
        return;
      }

      setCoaches((coachResult.data || []) as unknown as CoachLessonProfile[]);

      // Group packages by coach_user_id
      if (packageResult.data) {
        const packagesMap: Record<string, LessonPackage[]> = {};
        packageResult.data.forEach((pkg) => {
          if (!packagesMap[pkg.coach_user_id]) {
            packagesMap[pkg.coach_user_id] = [];
          }
          packagesMap[pkg.coach_user_id].push(pkg);
        });
        setCoachPackages(packagesMap);
      }
    } catch (err) {
      console.error('Error:', err);
    }
  };

  const fetchBookings = async () => {
    if (!currentHub?.id || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from('lesson_bookings')
        .select(`
          id, start_time, end_time, status, notes,
          coach_profiles:coach_user_id (id, full_name, avatar_url),
          lesson_packages:package_id (id, name, cost, duration_minutes)
        `)
        .eq('hub_id', currentHub.id)
        .eq('booked_by', user.id)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching bookings:', error);
        return;
      }

      setBookings((data || []) as unknown as LessonBooking[]);
    } catch (err) {
      console.error('Error:', err);
    }
  };

  // Split bookings into upcoming and past
  const upcomingBookings = bookings.filter(
    (b) => !isPast(parseISO(b.start_time)) && b.status !== 'cancelled'
  );
  const pastBookings = bookings.filter(
    (b) => isPast(parseISO(b.start_time)) || b.status === 'cancelled'
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: colors.success[100], text: colors.success[700], label: 'Confirmed' };
      case 'pending':
        return { bg: colors.amber[100], text: colors.amber[700], label: 'Pending' };
      case 'cancelled':
        return { bg: colors.error[100], text: colors.error[700], label: 'Cancelled' };
      case 'completed':
        return { bg: colors.slate[100], text: colors.slate[600], label: 'Completed' };
      default:
        return { bg: colors.slate[100], text: colors.slate[600], label: status };
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.violet[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'coaches' && styles.tabActive]}
          onPress={() => setActiveTab('coaches')}
        >
          <Search
            size={18}
            color={activeTab === 'coaches' ? colors.violet[600] : colors.slate[500]}
          />
          <Text style={[styles.tabText, activeTab === 'coaches' && styles.tabTextActive]}>
            Find Lessons
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'my-bookings' && styles.tabActive]}
          onPress={() => setActiveTab('my-bookings')}
        >
          <Calendar
            size={18}
            color={activeTab === 'my-bookings' ? colors.violet[600] : colors.slate[500]}
          />
          <Text style={[styles.tabText, activeTab === 'my-bookings' && styles.tabTextActive]}>
            My Bookings
          </Text>
        </TouchableOpacity>
      </View>

      {/* Find Lessons Tab */}
      {activeTab === 'coaches' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {coaches.length === 0 ? (
            <View style={styles.emptyContainer}>
              <GraduationCap size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No coaches available</Text>
              <Text style={styles.emptyText}>
                No coaches have set up private lessons yet.
              </Text>
            </View>
          ) : (
            coaches.map((coach) => {
              const packages = coachPackages[coach.coach_user_id] || [];
              const profileData = Array.isArray(coach.coach_profile)
                ? coach.coach_profile[0]
                : coach.coach_profile;

              return (
                <View key={coach.id} style={styles.coachCard}>
                  {/* Coach Header */}
                  <View style={styles.coachHeader}>
                    {profileData?.avatar_url ? (
                      <Image
                        source={{ uri: profileData.avatar_url }}
                        style={styles.coachAvatar}
                      />
                    ) : (
                      <View style={styles.coachAvatarPlaceholder}>
                        <User size={24} color={colors.violet[600]} />
                      </View>
                    )}
                    <View style={styles.coachInfo}>
                      <Text style={styles.coachName}>
                        {profileData?.full_name || 'Coach'}
                      </Text>
                      <View style={styles.coachMeta}>
                        <View style={styles.metaItem}>
                          <Clock size={12} color={colors.slate[400]} />
                          <Text style={styles.metaText}>
                            {coach.lesson_duration_minutes} min
                          </Text>
                        </View>
                        <View style={styles.metaItem}>
                          <DollarSign size={12} color={colors.slate[400]} />
                          <Text style={styles.metaText}>
                            ${coach.cost_per_lesson}/lesson
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Bio */}
                  {coach.bio && (
                    <Text style={styles.coachBio} numberOfLines={3}>
                      {coach.bio}
                    </Text>
                  )}

                  {/* Events & Levels */}
                  <View style={styles.tagsContainer}>
                    {coach.events.length > 0 && (
                      <View style={styles.tagRow}>
                        <Target size={14} color={colors.violet[500]} />
                        <Text style={styles.tagLabel}>Events:</Text>
                        <View style={styles.tagsWrap}>
                          {coach.events.slice(0, 4).map((event) => (
                            <View key={event} style={styles.tag}>
                              <Text style={styles.tagText}>{event}</Text>
                            </View>
                          ))}
                          {coach.events.length > 4 && (
                            <Text style={styles.moreText}>+{coach.events.length - 4}</Text>
                          )}
                        </View>
                      </View>
                    )}

                    {coach.levels.length > 0 && (
                      <View style={styles.tagRow}>
                        <Star size={14} color={colors.violet[500]} />
                        <Text style={styles.tagLabel}>Levels:</Text>
                        <View style={styles.tagsWrap}>
                          {coach.levels.slice(0, 4).map((level) => (
                            <View key={level} style={[styles.tag, styles.levelTag]}>
                              <Text style={[styles.tagText, styles.levelTagText]}>
                                {level}
                              </Text>
                            </View>
                          ))}
                          {coach.levels.length > 4 && (
                            <Text style={styles.moreText}>+{coach.levels.length - 4}</Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Packages */}
                  {packages.length > 0 && (
                    <View style={styles.packagesContainer}>
                      <Text style={styles.packagesTitle}>Lesson Options</Text>
                      {packages.map((pkg) => (
                        <View key={pkg.id} style={styles.packageItem}>
                          <View style={styles.packageInfo}>
                            <Text style={styles.packageName}>{pkg.name}</Text>
                            <Text style={styles.packageDuration}>
                              {pkg.duration_minutes} minutes
                            </Text>
                          </View>
                          <Text style={styles.packagePrice}>${pkg.cost}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Note about booking */}
                  <View style={styles.bookingNote}>
                    <Text style={styles.bookingNoteText}>
                      Contact the gym to book a private lesson
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* My Bookings Tab */}
      {activeTab === 'my-bookings' && (
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {bookings.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Calendar size={48} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No bookings</Text>
              <Text style={styles.emptyText}>
                You don't have any private lesson bookings yet.
              </Text>
            </View>
          ) : (
            <>
              {/* Upcoming */}
              {upcomingBookings.length > 0 && (
                <View style={styles.bookingsSection}>
                  <Text style={styles.sectionTitle}>Upcoming</Text>
                  {upcomingBookings.map((booking) => {
                    const status = getStatusBadge(booking.status);
                    const coachData = Array.isArray(booking.coach_profiles)
                      ? booking.coach_profiles[0]
                      : booking.coach_profiles;
                    const packageData = Array.isArray(booking.lesson_packages)
                      ? booking.lesson_packages[0]
                      : booking.lesson_packages;

                    return (
                      <View key={booking.id} style={styles.bookingCard}>
                        <View style={styles.bookingHeader}>
                          <View style={styles.bookingDateBadge}>
                            <Text style={styles.bookingMonth}>
                              {format(parseISO(booking.start_time), 'MMM')}
                            </Text>
                            <Text style={styles.bookingDay}>
                              {format(parseISO(booking.start_time), 'd')}
                            </Text>
                          </View>
                          <View style={styles.bookingInfo}>
                            <Text style={styles.bookingTime}>
                              {format(parseISO(booking.start_time), 'h:mm a')} -{' '}
                              {format(parseISO(booking.end_time), 'h:mm a')}
                            </Text>
                            <Text style={styles.bookingCoach}>
                              with {coachData?.full_name || 'Coach'}
                            </Text>
                            {packageData && (
                              <Text style={styles.bookingPackage}>
                                {packageData.name} • ${packageData.cost}
                              </Text>
                            )}
                          </View>
                          <View
                            style={[styles.statusBadge, { backgroundColor: status.bg }]}
                          >
                            <Text style={[styles.statusText, { color: status.text }]}>
                              {status.label}
                            </Text>
                          </View>
                        </View>
                        {booking.notes && (
                          <Text style={styles.bookingNotes} numberOfLines={2}>
                            {booking.notes}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Past */}
              {pastBookings.length > 0 && (
                <View style={styles.bookingsSection}>
                  <Text style={styles.sectionTitle}>Past Lessons</Text>
                  {pastBookings.slice(0, 10).map((booking) => {
                    const status = getStatusBadge(booking.status);
                    const coachData = Array.isArray(booking.coach_profiles)
                      ? booking.coach_profiles[0]
                      : booking.coach_profiles;

                    return (
                      <View
                        key={booking.id}
                        style={[styles.bookingCard, styles.bookingCardPast]}
                      >
                        <View style={styles.bookingHeader}>
                          <View
                            style={[styles.bookingDateBadge, styles.bookingDateBadgePast]}
                          >
                            <Text style={[styles.bookingMonth, styles.bookingMonthPast]}>
                              {format(parseISO(booking.start_time), 'MMM')}
                            </Text>
                            <Text style={[styles.bookingDay, styles.bookingDayPast]}>
                              {format(parseISO(booking.start_time), 'd')}
                            </Text>
                          </View>
                          <View style={styles.bookingInfo}>
                            <Text style={[styles.bookingTime, styles.bookingTimePast]}>
                              {format(parseISO(booking.start_time), 'h:mm a')}
                            </Text>
                            <Text style={styles.bookingCoach}>
                              with {coachData?.full_name || 'Coach'}
                            </Text>
                          </View>
                          <View
                            style={[styles.statusBadge, { backgroundColor: status.bg }]}
                          >
                            <Text style={[styles.statusText, { color: status.text }]}>
                              {status.label}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>
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
    borderBottomColor: colors.violet[500],
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[500],
  },
  tabTextActive: {
    color: colors.violet[600],
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

  // Coach Card
  coachCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  coachAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  coachAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.violet[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
  },
  coachName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.slate[900],
  },
  coachMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  coachBio: {
    fontSize: 14,
    color: colors.slate[600],
    marginTop: 12,
    lineHeight: 20,
  },

  // Tags
  tagsContainer: {
    marginTop: 12,
    gap: 8,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  tagLabel: {
    fontSize: 12,
    color: colors.slate[500],
    marginRight: 4,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  tag: {
    backgroundColor: colors.violet[100],
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.violet[700],
  },
  levelTag: {
    backgroundColor: colors.slate[100],
  },
  levelTagText: {
    color: colors.slate[700],
  },
  moreText: {
    fontSize: 11,
    color: colors.slate[400],
    marginLeft: 4,
  },

  // Packages
  packagesContainer: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  packagesTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 8,
  },
  packageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[50],
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[900],
  },
  packageDuration: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 1,
  },
  packagePrice: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.violet[600],
  },

  // Booking Note
  bookingNote: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    alignItems: 'center',
  },
  bookingNoteText: {
    fontSize: 13,
    color: colors.slate[500],
    fontStyle: 'italic',
  },

  // Bookings Section
  bookingsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[700],
    marginBottom: 12,
  },

  // Booking Card
  bookingCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  bookingCardPast: {
    opacity: 0.7,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bookingDateBadge: {
    width: 48,
    alignItems: 'center',
    backgroundColor: colors.violet[500],
    borderRadius: 8,
    paddingVertical: 8,
  },
  bookingDateBadgePast: {
    backgroundColor: colors.slate[300],
  },
  bookingMonth: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.violet[100],
    textTransform: 'uppercase',
  },
  bookingMonthPast: {
    color: colors.slate[100],
  },
  bookingDay: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginTop: -2,
  },
  bookingDayPast: {
    color: colors.white,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.slate[900],
  },
  bookingTimePast: {
    color: colors.slate[600],
  },
  bookingCoach: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  bookingPackage: {
    fontSize: 12,
    color: colors.violet[600],
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bookingNotes: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
});
