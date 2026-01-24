import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import {
  Calendar,
  Users,
  Trophy,
  MessageSquare,
  ChevronRight,
  User,
  Cake,
  Star,
  Heart,
  Sparkles,
  CalendarDays,
  UserPlus,
  FileText,
} from 'lucide-react-native';
import { colors, theme } from '../../src/constants/colors';
import { useHubStore } from '../../src/stores/hubStore';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/services/supabase';
import { format, parseISO, subWeeks, subDays } from 'date-fns';

// Interfaces
interface DashboardStats {
  totalMembers: number;
  totalGymnasts: number;
  upcomingEvents: number;
  nextEventDate: string | null;
  activeCompetitions: number;
  nextCompetitionName: string | null;
}

interface LinkedGymnastInfo {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  date_of_birth: string | null;
  nextCompetition?: { name: string; start_date: string } | null;
  mentorshipPairing?: { big_name: string; little_name: string; role: 'big' | 'little' } | null;
}

interface UpcomingEvent {
  id: string;
  title: string;
  start_time: string;
  type: string;
}

interface RecentActivity {
  id: string;
  type: 'post' | 'event' | 'member' | 'competition';
  description: string;
  timestamp: string;
  groupName?: string;
  content?: string;
}

interface RecentScore {
  id: string;
  gymnastName: string;
  competitionName: string;
  event: string;
  score: number;
  placement?: number;
  date: string;
}

interface RecentSkillChange {
  id: string;
  gymnastName: string;
  skillName: string;
  event: string;
  status: string;
  updatedAt: string;
}

// Get time-based greeting
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Event label helper
const getEventLabel = (event: string) => {
  const labels: Record<string, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    strength: 'Strength',
    flexibility: 'Flexibility',
    conditioning: 'Conditioning',
  };
  return labels[event] || event.charAt(0).toUpperCase() + event.slice(1);
};

// Skill status config
const SKILL_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  not_started: { label: 'Not Started', color: colors.slate[600], bgColor: colors.slate[100] },
  in_progress: { label: 'In Progress', color: colors.blue[600], bgColor: colors.blue[100] },
  needs_spot: { label: 'Needs Spot', color: colors.amber[600], bgColor: colors.amber[100] },
  almost: { label: 'Almost', color: colors.purple[600], bgColor: colors.purple[100] },
  compete_ready: { label: 'Compete Ready', color: colors.emerald[600], bgColor: colors.emerald[100] },
};

export default function DashboardScreen() {
  const { currentHub, currentMember, linkedGymnasts } = useHubStore();
  const isStaff = useHubStore((state) => state.isStaff);
  const { user } = useAuthStore();

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  // Staff data
  const [stats, setStats] = useState<DashboardStats | null>(null);

  // Parent data
  const [linkedGymnastInfo, setLinkedGymnastInfo] = useState<LinkedGymnastInfo[]>([]);
  const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
  const [recentSkillChanges, setRecentSkillChanges] = useState<RecentSkillChange[]>([]);

  // Shared data
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const fetchUserName = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    if (data?.full_name) {
      setUserName(data.full_name.split(' ')[0]);
    }
  }, [user]);

  const fetchLinkedGymnastInfo = useCallback(async () => {
    if (!currentHub || !linkedGymnasts || linkedGymnasts.length === 0) return;

    const gymnastIds = linkedGymnasts.map(g => g.id);
    const today = new Date().toISOString().split('T')[0];

    // Fetch upcoming competitions
    const { data: competitionData } = await supabase
      .from('competition_gymnasts')
      .select(`
        gymnast_profile_id,
        competitions!inner(id, name, start_date)
      `)
      .in('gymnast_profile_id', gymnastIds)
      .gte('competitions.start_date', today)
      .order('competitions(start_date)', { ascending: true });

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

    // Fetch mentorship pairings
    const { data: mentorshipData } = await supabase
      .from('mentorship_pairs')
      .select(`
        big_gymnast_id,
        little_gymnast_id,
        big_gymnast:gymnast_profiles!mentorship_pairs_big_gymnast_id_fkey(first_name, last_name),
        little_gymnast:gymnast_profiles!mentorship_pairs_little_gymnast_id_fkey(first_name, last_name)
      `)
      .eq('hub_id', currentHub.id)
      .or(`big_gymnast_id.in.(${gymnastIds.join(',')}),little_gymnast_id.in.(${gymnastIds.join(',')})`);

    const mentorshipMap = new Map<string, { big_name: string; little_name: string; role: 'big' | 'little' }>();
    mentorshipData?.forEach((p: any) => {
      const bigName = `${p.big_gymnast?.first_name || ''} ${p.big_gymnast?.last_name || ''}`.trim();
      const littleName = `${p.little_gymnast?.first_name || ''} ${p.little_gymnast?.last_name || ''}`.trim();

      if (gymnastIds.includes(p.big_gymnast_id)) {
        mentorshipMap.set(p.big_gymnast_id, { big_name: bigName, little_name: littleName, role: 'big' });
      }
      if (gymnastIds.includes(p.little_gymnast_id)) {
        mentorshipMap.set(p.little_gymnast_id, { big_name: bigName, little_name: littleName, role: 'little' });
      }
    });

    const enrichedGymnasts: LinkedGymnastInfo[] = linkedGymnasts.map(g => ({
      id: g.id,
      first_name: g.first_name,
      last_name: g.last_name,
      level: g.level,
      date_of_birth: g.date_of_birth,
      nextCompetition: nextCompetitionMap.get(g.id) || null,
      mentorshipPairing: mentorshipMap.get(g.id) || null,
    }));

    setLinkedGymnastInfo(enrichedGymnasts);
  }, [currentHub, linkedGymnasts]);

  const fetchParentData = useCallback(async () => {
    if (!currentHub || !user || !linkedGymnasts || linkedGymnasts.length === 0) return;

    const gymnastIds = linkedGymnasts.map(g => g.id);
    const sevenDaysAgo = subDays(new Date(), 7).toISOString();

    // Fetch recent scores
    const { data: scoresData } = await supabase
      .from('competition_scores')
      .select(`
        id, event, score, placement, created_at,
        gymnast_profiles!inner(id, first_name, last_name),
        competitions!inner(id, name, start_date)
      `)
      .in('gymnast_profile_id', gymnastIds)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (scoresData) {
      const scores: RecentScore[] = scoresData.map((s: any) => ({
        id: s.id,
        gymnastName: `${s.gymnast_profiles.first_name} ${s.gymnast_profiles.last_name}`,
        competitionName: s.competitions.name,
        event: s.event,
        score: s.score,
        placement: s.placement,
        date: s.competitions.start_date,
      }));
      setRecentScores(scores);
    }

    // Fetch recent skill changes
    const { data: skillsData } = await supabase
      .from('gymnast_skills')
      .select(`
        id, status, updated_at,
        gymnast_profiles!inner(id, first_name, last_name),
        hub_event_skills!inner(id, skill_name, event)
      `)
      .in('gymnast_profile_id', gymnastIds)
      .gte('updated_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (skillsData) {
      const skills: RecentSkillChange[] = skillsData.map((s: any) => ({
        id: s.id,
        gymnastName: `${s.gymnast_profiles.first_name} ${s.gymnast_profiles.last_name}`,
        skillName: s.hub_event_skills.skill_name,
        event: s.hub_event_skills.event,
        status: s.status,
        updatedAt: s.updated_at,
      }));
      setRecentSkillChanges(skills);
    }
  }, [currentHub, user, linkedGymnasts]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentHub || !user) return;

    try {
      const now = new Date().toISOString();
      const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();

      // Fetch stats (for staff)
      const [memberCountResult, gymnastCountResult, eventsResult, competitionsResult] = await Promise.all([
        supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', currentHub.id),
        supabase.from('gymnast_profiles').select('*', { count: 'exact', head: true }).eq('hub_id', currentHub.id),
        supabase.from('events').select('id, title, start_time, type', { count: 'exact' })
          .eq('hub_id', currentHub.id).gte('start_time', now).order('start_time', { ascending: true }).limit(5),
        supabase.from('competitions').select('id, name, start_date, end_date', { count: 'exact' })
          .eq('hub_id', currentHub.id).gte('end_date', now.split('T')[0]).order('start_date', { ascending: true }).limit(5),
      ]);

      setStats({
        totalMembers: memberCountResult.count || 0,
        totalGymnasts: gymnastCountResult.count || 0,
        upcomingEvents: eventsResult.count || 0,
        nextEventDate: eventsResult.data && eventsResult.data.length > 0 ? eventsResult.data[0].start_time : null,
        activeCompetitions: competitionsResult.count || 0,
        nextCompetitionName: competitionsResult.data && competitionsResult.data.length > 0 ? competitionsResult.data[0].name : null,
      });

      setUpcomingEvents(eventsResult.data || []);

      // Fetch recent activity
      const activities: RecentActivity[] = [];

      // Recent events created
      const { data: recentEvents } = await supabase
        .from('events')
        .select('id, title, created_at')
        .eq('hub_id', currentHub.id)
        .gte('created_at', twoWeeksAgo)
        .order('created_at', { ascending: false })
        .limit(3);

      recentEvents?.forEach((event: any) => {
        activities.push({
          id: `event-${event.id}`,
          type: 'event',
          description: `New event: ${event.title}`,
          timestamp: event.created_at,
        });
      });

      // Recent competitions
      const { data: recentComps } = await supabase
        .from('competitions')
        .select('id, name, created_at')
        .eq('hub_id', currentHub.id)
        .gte('created_at', twoWeeksAgo)
        .order('created_at', { ascending: false })
        .limit(3);

      recentComps?.forEach((comp: any) => {
        activities.push({
          id: `comp-${comp.id}`,
          type: 'competition',
          description: `New competition: ${comp.name}`,
          timestamp: comp.created_at,
        });
      });

      // Recent group posts (from user's groups)
      const { data: memberGroups } = await supabase
        .from('group_members')
        .select('group_id, groups!inner(hub_id)')
        .eq('user_id', user.id)
        .eq('groups.hub_id', currentHub.id);

      if (memberGroups && memberGroups.length > 0) {
        const groupIds = memberGroups.map((g: any) => g.group_id);
        const { data: recentPosts } = await supabase
          .from('posts')
          .select(`
            id, content, created_at, group_id,
            profiles:user_id(full_name),
            groups:group_id(name)
          `)
          .in('group_id', groupIds)
          .gte('created_at', twoWeeksAgo)
          .order('created_at', { ascending: false })
          .limit(3);

        recentPosts?.forEach((post: any) => {
          const authorName = post.profiles?.full_name || 'Someone';
          const groupName = post.groups?.name || 'a group';
          const contentPreview = post.content?.length > 60
            ? post.content.substring(0, 60) + '...'
            : post.content || '';

          activities.push({
            id: `post-${post.id}`,
            type: 'post',
            description: `${authorName} in ${groupName}`,
            timestamp: post.created_at,
            groupName,
            content: contentPreview,
          });
        });
      }

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [currentHub, user]);

  const isParentRole = currentMember?.role === 'parent';

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchUserName(),
        fetchDashboardData(),
        isParentRole ? fetchLinkedGymnastInfo() : Promise.resolve(),
        isParentRole ? fetchParentData() : Promise.resolve(),
      ]);
      setLoading(false);
    };

    if (currentHub && user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [currentHub?.id, user?.id, isParentRole, fetchUserName, fetchDashboardData, fetchLinkedGymnastInfo, fetchParentData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchDashboardData(),
      isParentRole ? fetchLinkedGymnastInfo() : Promise.resolve(),
      isParentRole ? fetchParentData() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'event': return <Calendar size={16} color={colors.indigo[600]} />;
      case 'post': return <MessageSquare size={16} color={colors.brand[600]} />;
      case 'competition': return <Trophy size={16} color={colors.amber[600]} />;
      case 'member': return <UserPlus size={16} color={colors.emerald[600]} />;
      default: return <FileText size={16} color={colors.slate[500]} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.light.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.light.primary}
        />
      }
    >
      {/* Header with Greeting */}
      <View style={styles.headerSection}>
        <Text style={styles.greeting}>
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </Text>
        <Text style={styles.subGreeting}>
          Welcome to {currentHub?.name} • {format(new Date(), 'EEEE, MMMM d')}
        </Text>
      </View>

      {/* Parent: Linked Gymnast Cards */}
      {isParentRole && linkedGymnastInfo.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {linkedGymnastInfo.length === 1 ? 'Your Gymnast' : 'Your Gymnasts'}
          </Text>
          {linkedGymnastInfo.map((gymnast) => (
            <TouchableOpacity
              key={gymnast.id}
              style={styles.gymnastCard}
              activeOpacity={0.7}
              onPress={() => {/* Navigate to gymnast profile */}}
            >
              <View style={styles.gymnastHeader}>
                <View>
                  <Text style={styles.gymnastName}>
                    {gymnast.first_name} {gymnast.last_name}
                  </Text>
                  {gymnast.level && (
                    <Text style={styles.gymnastLevel}>{gymnast.level}</Text>
                  )}
                </View>
                <View style={styles.gymnastAvatar}>
                  <User size={20} color={colors.brand[600]} />
                </View>
              </View>

              {gymnast.date_of_birth && (
                <View style={styles.gymnastInfoRow}>
                  <Cake size={16} color={colors.purple[500]} />
                  <Text style={styles.gymnastInfoText}>
                    Birthday: {format(parseISO(gymnast.date_of_birth), 'MMMM d')}
                  </Text>
                </View>
              )}

              {gymnast.nextCompetition && (
                <View style={styles.gymnastInfoRow}>
                  <Trophy size={16} color={colors.amber[500]} />
                  <Text style={styles.gymnastInfoText}>
                    <Text style={styles.gymnastInfoBold}>{gymnast.nextCompetition.name}</Text>
                    {' · '}{format(parseISO(gymnast.nextCompetition.start_date), 'MMM d')}
                  </Text>
                </View>
              )}

              {gymnast.mentorshipPairing && (
                <View style={styles.gymnastInfoRow}>
                  {gymnast.mentorshipPairing.role === 'big' ? (
                    <>
                      <Star size={16} color={colors.purple[500]} />
                      <Text style={styles.gymnastInfoText}>
                        Big to <Text style={styles.gymnastInfoBold}>{gymnast.mentorshipPairing.little_name}</Text>
                      </Text>
                    </>
                  ) : (
                    <>
                      <Heart size={16} color={colors.pink[500]} />
                      <Text style={styles.gymnastInfoText}>
                        Little to <Text style={styles.gymnastInfoBold}>{gymnast.mentorshipPairing.big_name}</Text>
                      </Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Staff: Stat Cards */}
      {isStaff() && stats && (
        <View style={styles.section}>
          <View style={styles.statCardsRow}>
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>Members</Text>
                <Users size={18} color={colors.slate[500]} />
              </View>
              <Text style={styles.statCardValue}>{stats.totalMembers}</Text>
              <Text style={styles.statCardSubtitle}>{stats.totalGymnasts} athletes</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>Events</Text>
                <CalendarDays size={18} color={colors.slate[500]} />
              </View>
              <Text style={styles.statCardValue}>{stats.upcomingEvents}</Text>
              <Text style={styles.statCardSubtitle} numberOfLines={1}>
                {stats.nextEventDate ? format(parseISO(stats.nextEventDate), 'EEE h:mma') : 'None'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardLabel}>Meets</Text>
                <Trophy size={18} color={colors.slate[500]} />
              </View>
              <Text style={styles.statCardValue}>{stats.activeCompetitions}</Text>
              <Text style={styles.statCardSubtitle} numberOfLines={1}>
                {stats.nextCompetitionName || 'None'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Parent: Recent Scores */}
      {isParentRole && recentScores.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scores</Text>
            <TouchableOpacity onPress={() => {/* Navigate to scores */}}>
              <Text style={styles.seeAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {recentScores.map((score, index) => (
              <View
                key={score.id}
                style={[styles.listItem, index === recentScores.length - 1 && styles.lastListItem]}
              >
                <View style={[styles.listItemIcon, { backgroundColor: colors.amber[50] }]}>
                  <Trophy size={16} color={colors.amber[600]} />
                </View>
                <View style={styles.listItemContent}>
                  <Text style={styles.listItemTitle}>
                    {getEventLabel(score.event)} - {score.competitionName}
                  </Text>
                  <Text style={styles.listItemSubtitle}>
                    {linkedGymnastInfo.length > 1 ? `${score.gymnastName} · ` : ''}
                    {format(parseISO(score.date), 'MMM d')}
                  </Text>
                </View>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreValue}>{score.score}</Text>
                  {score.placement && (
                    <Text style={styles.scorePlacement}>#{score.placement}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Parent: Skill Updates */}
      {isParentRole && recentSkillChanges.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skill Updates</Text>
            <TouchableOpacity onPress={() => {/* Navigate to skills */}}>
              <Text style={styles.seeAllLink}>View All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.card}>
            {recentSkillChanges.map((skill, index) => {
              const statusConfig = SKILL_STATUS_CONFIG[skill.status] || SKILL_STATUS_CONFIG.not_started;
              return (
                <View
                  key={skill.id}
                  style={[styles.listItem, index === recentSkillChanges.length - 1 && styles.lastListItem]}
                >
                  <View style={[styles.listItemIcon, { backgroundColor: colors.purple[50] }]}>
                    <Sparkles size={16} color={colors.purple[600]} />
                  </View>
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{skill.skillName}</Text>
                    <Text style={styles.listItemSubtitle}>
                      {linkedGymnastInfo.length > 1 ? `${skill.gymnastName} · ` : ''}
                      {getEventLabel(skill.event)} · {format(parseISO(skill.updatedAt), 'MMM d')}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bgColor }]}>
                    <Text style={[styles.statusBadgeText, { color: statusConfig.color }]}>
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <View style={styles.card}>
          {recentActivity.length === 0 ? (
            <View style={styles.emptyState}>
              <MessageSquare size={32} color={colors.slate[300]} />
              <Text style={styles.emptyStateText}>No recent activity</Text>
            </View>
          ) : (
            recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={[styles.activityItem, index === recentActivity.length - 1 && styles.lastListItem]}
              >
                <View style={styles.activityIcon}>
                  {getActivityIcon(activity.type)}
                </View>
                <View style={styles.activityContent}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  {activity.content && (
                    <Text style={styles.activityPreview} numberOfLines={1}>{activity.content}</Text>
                  )}
                </View>
                <Text style={styles.activityTime}>
                  {format(parseISO(activity.timestamp), 'MMM d')}
                </Text>
              </View>
            ))
          )}
        </View>
      </View>

      {/* Upcoming Schedule */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Upcoming Schedule</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/calendar')}>
            <Text style={styles.seeAllLink}>View Calendar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.card}>
          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <CalendarDays size={32} color={colors.slate[300]} />
              <Text style={styles.emptyStateText}>No upcoming events</Text>
            </View>
          ) : (
            upcomingEvents.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventItem, index === upcomingEvents.length - 1 && styles.lastListItem]}
                activeOpacity={0.7}
                onPress={() => router.push('/(tabs)/calendar')}
              >
                <View style={styles.eventDateBox}>
                  <Text style={styles.eventDay}>
                    {format(parseISO(event.start_time), 'EEE')}
                  </Text>
                  <Text style={styles.eventDate}>
                    {format(parseISO(event.start_time), 'd')}
                  </Text>
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                  <View style={styles.eventTypeBadge}>
                    <Text style={styles.eventTypeText}>
                      {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.eventTimeContainer}>
                  <Text style={styles.eventTimeDay}>
                    {format(parseISO(event.start_time), 'MMM d')}
                  </Text>
                  <Text style={styles.eventTime}>
                    {format(parseISO(event.start_time), 'h:mm a')}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.slate[400]} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.slate[50],
  },
  headerSection: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.slate[900],
  },
  subGreeting: {
    fontSize: 14,
    color: colors.slate[500],
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.slate[900],
    marginBottom: 12,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.light.primary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    overflow: 'hidden',
  },
  // Gymnast Card Styles
  gymnastCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 16,
    marginBottom: 12,
  },
  gymnastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gymnastName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.slate[900],
  },
  gymnastLevel: {
    fontSize: 14,
    color: colors.slate[600],
    marginTop: 2,
  },
  gymnastAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  gymnastInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  gymnastInfoText: {
    fontSize: 14,
    color: colors.slate[600],
  },
  gymnastInfoBold: {
    fontWeight: '600',
    color: colors.slate[700],
  },
  // Stat Card Styles
  statCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 12,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.slate[500],
  },
  statCardValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.brand[600],
  },
  statCardSubtitle: {
    fontSize: 11,
    color: colors.slate[500],
    marginTop: 2,
  },
  // List Item Styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  lastListItem: {
    borderBottomWidth: 0,
  },
  listItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  listItemSubtitle: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  // Score styles
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.slate[900],
  },
  scorePlacement: {
    fontSize: 11,
    color: colors.slate[500],
  },
  // Status badge
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  // Activity styles
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.slate[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  activityPreview: {
    fontSize: 13,
    color: colors.slate[500],
    marginTop: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.slate[500],
  },
  // Event styles
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  eventDateBox: {
    width: 48,
    alignItems: 'center',
    marginRight: 12,
  },
  eventDay: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.slate[500],
    textTransform: 'uppercase',
  },
  eventDate: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.slate[900],
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.slate[700],
  },
  eventTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.brand[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  eventTypeText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.brand[700],
  },
  eventTimeContainer: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  eventTimeDay: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.slate[700],
  },
  eventTime: {
    fontSize: 11,
    color: colors.slate[500],
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.slate[400],
    marginTop: 12,
  },
});
