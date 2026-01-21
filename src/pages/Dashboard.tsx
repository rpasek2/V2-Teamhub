import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, CalendarDays, Trophy, Loader2, MessageSquare, Calendar, UserPlus, FileText, ChevronRight, User, Star, Heart, Cake, ShoppingBag, Sparkles, Clock, Check, X } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { supabase } from '../lib/supabase';
import { format, parseISO, subWeeks, subDays } from 'date-fns';
import { clsx } from 'clsx';
import type { GymnastProfile } from '../types';
import { SKILL_STATUS_CONFIG, type SkillStatus } from '../types';

interface DashboardStats {
    totalMembers: number;
    totalGymnasts: number;
    upcomingEvents: number;
    nextEventDate: string | null;
    activeCompetitions: number;
    nextCompetitionName: string | null;
}

interface LinkedGymnastInfo extends GymnastProfile {
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
    link?: string;
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
    status: SkillStatus;
    updatedAt: string;
}

interface RecentMarketplaceItem {
    id: string;
    title: string;
    price: number;
    category: string;
    sellerName: string;
    createdAt: string;
}

interface RecentGroupPost {
    id: string;
    groupId: string;
    groupName: string;
    authorName: string;
    content: string;
    createdAt: string;
}

interface AssignmentProgress {
    gymnastId: string;
    gymnastName: string;
    event: string;
    totalItems: number;
    completedItems: number;
}

interface PendingTimeOffRequest {
    id: string;
    staff_user_id: string;
    staff_name: string;
    start_date: string;
    end_date: string;
    type: 'vacation' | 'sick' | 'personal' | 'other';
    notes: string | null;
    created_at: string;
}

// Get time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function Dashboard() {
    const { hub, loading, user, linkedGymnasts } = useHub();
    const { isStaff, isParent, isOwner } = useRoleChecks();
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [userName, setUserName] = useState<string>('');
    const [linkedGymnastInfo, setLinkedGymnastInfo] = useState<LinkedGymnastInfo[]>([]);

    // Parent-specific data
    const [recentScores, setRecentScores] = useState<RecentScore[]>([]);
    const [recentSkillChanges, setRecentSkillChanges] = useState<RecentSkillChange[]>([]);
    const [recentMarketplaceItems, setRecentMarketplaceItems] = useState<RecentMarketplaceItem[]>([]);
    const [recentGroupPosts, setRecentGroupPosts] = useState<RecentGroupPost[]>([]);
    const [assignmentProgress, setAssignmentProgress] = useState<AssignmentProgress[]>([]);
    const [, setLoadingParentData] = useState(false);

    // Owner-specific data
    const [pendingTimeOff, setPendingTimeOff] = useState<PendingTimeOffRequest[]>([]);
    const [processingTimeOff, setProcessingTimeOff] = useState<string | null>(null);

    const fetchUserName = useCallback(async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
        if (data?.full_name) {
            setUserName(data.full_name.split(' ')[0]); // First name only
        }
    }, [user]);

    const fetchLinkedGymnastInfo = useCallback(async () => {
        if (!hub || linkedGymnasts.length === 0) return;

        const gymnastIds = linkedGymnasts.map(g => g.id);
        const today = new Date().toISOString().split('T')[0];

        // Fetch upcoming competitions for linked gymnasts
        const { data: competitionData } = await supabase
            .from('competition_gymnasts')
            .select(`
                gymnast_profile_id,
                competitions!inner(id, name, start_date)
            `)
            .in('gymnast_profile_id', gymnastIds)
            .gte('competitions.start_date', today)
            .order('competitions(start_date)', { ascending: true });

        // Build map of gymnast_id -> next competition
        const nextCompetitionMap = new Map<string, { name: string; start_date: string }>();
        competitionData?.forEach((cg: any) => {
            const comp = cg.competitions;
            if (comp && !nextCompetitionMap.has(cg.gymnast_profile_id)) {
                nextCompetitionMap.set(cg.gymnast_profile_id, {
                    name: comp.name,
                    start_date: comp.start_date
                });
            }
        });

        // Fetch mentorship pairings for linked gymnasts
        const { data: mentorshipData } = await supabase
            .from('mentorship_pairs')
            .select(`
                big_gymnast_id,
                little_gymnast_id,
                big_gymnast:gymnast_profiles!mentorship_pairs_big_gymnast_id_fkey(first_name, last_name),
                little_gymnast:gymnast_profiles!mentorship_pairs_little_gymnast_id_fkey(first_name, last_name)
            `)
            .eq('hub_id', hub.id)
            .or(`big_gymnast_id.in.(${gymnastIds.join(',')}),little_gymnast_id.in.(${gymnastIds.join(',')})`);

        // Build map of gymnast_id -> mentorship pairing info
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

        // Combine info for each linked gymnast
        const enrichedGymnasts: LinkedGymnastInfo[] = linkedGymnasts.map(g => ({
            ...g,
            nextCompetition: nextCompetitionMap.get(g.id) || null,
            mentorshipPairing: mentorshipMap.get(g.id) || null
        }));

        setLinkedGymnastInfo(enrichedGymnasts);
    }, [hub, linkedGymnasts]);

    const fetchParentDashboardData = useCallback(async () => {
        if (!hub || !user || linkedGymnasts.length === 0) return;

        setLoadingParentData(true);
        const gymnastIds = linkedGymnasts.map(g => g.id);
        const sevenDaysAgo = subDays(new Date(), 7).toISOString();
        const todayStr = format(new Date(), 'yyyy-MM-dd');

        try {
            // Fetch all parent-specific data in parallel
            const [scoresResult, skillsResult, marketplaceResult, groupsResult, assignmentsResult] = await Promise.all([
                // 1. Recent scores for linked gymnasts
                supabase
                    .from('competition_scores')
                    .select(`
                        id,
                        event,
                        score,
                        placement,
                        created_at,
                        gymnast_profiles!inner(id, first_name, last_name),
                        competitions!inner(id, name, start_date)
                    `)
                    .in('gymnast_profile_id', gymnastIds)
                    .gte('created_at', sevenDaysAgo)
                    .order('created_at', { ascending: false })
                    .limit(5),

                // 2. Recent skill changes for linked gymnasts
                supabase
                    .from('gymnast_skills')
                    .select(`
                        id,
                        status,
                        updated_at,
                        gymnast_profiles!inner(id, first_name, last_name),
                        hub_event_skills!inner(id, skill_name, event)
                    `)
                    .in('gymnast_profile_id', gymnastIds)
                    .gte('updated_at', sevenDaysAgo)
                    .order('updated_at', { ascending: false })
                    .limit(5),

                // 3. Recent marketplace items in the hub
                supabase
                    .from('marketplace_items')
                    .select(`
                        id,
                        title,
                        price,
                        category,
                        created_at,
                        profiles:seller_id(full_name)
                    `)
                    .eq('hub_id', hub.id)
                    .eq('status', 'available')
                    .gte('created_at', sevenDaysAgo)
                    .order('created_at', { ascending: false })
                    .limit(5),

                // 4. Get user's group memberships
                supabase
                    .from('group_members')
                    .select('group_id, groups!inner(id, name, hub_id)')
                    .eq('user_id', user.id)
                    .eq('groups.hub_id', hub.id),

                // 5. Today's assignments for linked gymnasts
                supabase
                    .from('gymnast_assignments')
                    .select(`
                        id,
                        gymnast_profile_id,
                        vault, bars, beam, floor, strength, flexibility, conditioning,
                        completed_items,
                        gymnast_profiles!inner(id, first_name, last_name)
                    `)
                    .in('gymnast_profile_id', gymnastIds)
                    .eq('date', todayStr)
            ]);

            // Process scores
            if (scoresResult.data) {
                const scores: RecentScore[] = scoresResult.data.map((s: any) => ({
                    id: s.id,
                    gymnastName: `${s.gymnast_profiles.first_name} ${s.gymnast_profiles.last_name}`,
                    competitionName: s.competitions.name,
                    event: s.event,
                    score: s.score,
                    placement: s.placement,
                    date: s.competitions.start_date
                }));
                setRecentScores(scores);
            }

            // Process skill changes
            if (skillsResult.data) {
                const skills: RecentSkillChange[] = skillsResult.data.map((s: any) => ({
                    id: s.id,
                    gymnastName: `${s.gymnast_profiles.first_name} ${s.gymnast_profiles.last_name}`,
                    skillName: s.hub_event_skills.skill_name,
                    event: s.hub_event_skills.event,
                    status: s.status as SkillStatus,
                    updatedAt: s.updated_at
                }));
                setRecentSkillChanges(skills);
            }

            // Process marketplace items
            if (marketplaceResult.data) {
                const items: RecentMarketplaceItem[] = marketplaceResult.data.map((item: any) => ({
                    id: item.id,
                    title: item.title,
                    price: item.price,
                    category: item.category,
                    sellerName: item.profiles?.full_name || 'Unknown',
                    createdAt: item.created_at
                }));
                setRecentMarketplaceItems(items);
            }

            // Fetch recent posts from user's groups
            if (groupsResult.data && groupsResult.data.length > 0) {
                const groupIds = groupsResult.data.map((g: any) => g.group_id);
                const { data: postsData } = await supabase
                    .from('posts')
                    .select(`
                        id,
                        content,
                        created_at,
                        group_id,
                        profiles:user_id(full_name),
                        groups:group_id(name)
                    `)
                    .in('group_id', groupIds)
                    .gte('created_at', sevenDaysAgo)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (postsData) {
                    const posts: RecentGroupPost[] = postsData.map((p: any) => ({
                        id: p.id,
                        groupId: p.group_id,
                        groupName: p.groups?.name || 'Unknown Group',
                        authorName: p.profiles?.full_name || 'Unknown',
                        content: p.content?.length > 100 ? p.content.substring(0, 100) + '...' : p.content || '',
                        createdAt: p.created_at
                    }));
                    setRecentGroupPosts(posts);
                }
            }

            // Process assignments for today
            if (assignmentsResult.data) {
                const progress: AssignmentProgress[] = [];
                const events = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

                assignmentsResult.data.forEach((a: any) => {
                    const gymnastName = `${a.gymnast_profiles.first_name} ${a.gymnast_profiles.last_name}`;
                    const completedItems = a.completed_items || {};

                    events.forEach(event => {
                        const eventValue = a[event];
                        if (eventValue && eventValue.trim()) {
                            // Count items (split by newlines or commas)
                            const items = eventValue.split(/[\n,]/).filter((i: string) => i.trim());
                            const totalItems = items.length;
                            const completedCount = (completedItems[event] || []).length;

                            if (totalItems > 0) {
                                progress.push({
                                    gymnastId: a.gymnast_profile_id,
                                    gymnastName,
                                    event,
                                    totalItems,
                                    completedItems: completedCount
                                });
                            }
                        }
                    });
                });

                setAssignmentProgress(progress);
            }

        } catch (error) {
            console.error('Error fetching parent dashboard data:', error);
        } finally {
            setLoadingParentData(false);
        }
    }, [hub, user, linkedGymnasts]);

    const fetchPendingTimeOff = useCallback(async () => {
        if (!hub) return;

        try {
            const { data, error } = await supabase
                .from('staff_time_off')
                .select(`
                    id,
                    staff_user_id,
                    start_date,
                    end_date,
                    type,
                    notes,
                    created_at,
                    profiles:staff_user_id(full_name)
                `)
                .eq('hub_id', hub.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: true });

            if (error) throw error;

            const requests: PendingTimeOffRequest[] = (data || []).map((r: any) => ({
                id: r.id,
                staff_user_id: r.staff_user_id,
                staff_name: r.profiles?.full_name || 'Unknown',
                start_date: r.start_date,
                end_date: r.end_date,
                type: r.type,
                notes: r.notes,
                created_at: r.created_at
            }));

            setPendingTimeOff(requests);
        } catch (error) {
            console.error('Error fetching pending time off:', error);
        }
    }, [hub]);

    const handleTimeOffDecision = useCallback(async (requestId: string, decision: 'approved' | 'denied', request: PendingTimeOffRequest) => {
        if (!hub || !user) return;
        setProcessingTimeOff(requestId);

        try {
            // Update the time off request status
            const { error: updateError } = await supabase
                .from('staff_time_off')
                .update({
                    status: decision,
                    decided_by: user.id,
                    decided_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', requestId);

            if (updateError) throw updateError;

            // If approved, create a calendar event for the time off
            if (decision === 'approved') {
                const startDate = new Date(request.start_date);
                const endDate = new Date(request.end_date);

                // Create event spanning the time off period (set times to make it span the full day)
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);

                const { error: eventError } = await supabase
                    .from('events')
                    .insert({
                        hub_id: hub.id,
                        title: `${request.staff_name} - Time Off (${request.type})`,
                        description: request.notes || `Approved ${request.type} time off`,
                        type: 'other',
                        start_time: startDate.toISOString(),
                        end_time: endDate.toISOString(),
                        created_by: user.id,
                    });

                if (eventError) {
                    console.error('Error creating time off calendar event:', eventError);
                }
            }

            // Remove from pending list
            setPendingTimeOff(prev => prev.filter(r => r.id !== requestId));
        } catch (error) {
            console.error('Error processing time off decision:', error);
        } finally {
            setProcessingTimeOff(null);
        }
    }, [hub, user]);

    const getTimeOffTypeColor = (type: string) => {
        switch (type) {
            case 'vacation': return 'bg-blue-100 text-blue-700';
            case 'sick': return 'bg-red-100 text-red-700';
            case 'personal': return 'bg-purple-100 text-purple-700';
            case 'other': return 'bg-slate-100 text-slate-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const fetchDashboardData = useCallback(async () => {
        if (!hub || !user) return;
        setLoadingStats(true);

        try {
            const now = new Date().toISOString();

            // Group 1: Stats queries (all independent) - run in parallel
            const [memberCountResult, gymnastCountResult, eventsResult, competitionsResult] = await Promise.all([
                supabase.from('hub_members').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id),
                supabase.from('gymnast_profiles').select('*', { count: 'exact', head: true }).eq('hub_id', hub.id),
                supabase.from('events').select('id, title, start_time, type', { count: 'exact' })
                    .eq('hub_id', hub.id).gte('start_time', now).order('start_time', { ascending: true }).limit(5),
                supabase.from('competitions').select('id, name, start_date, end_date', { count: 'exact' })
                    .eq('hub_id', hub.id).gte('end_date', now.split('T')[0]).order('start_date', { ascending: true }).limit(5)
            ]);

            const memberCount = memberCountResult.count;
            const gymnastCount = gymnastCountResult.count;
            const eventsData = eventsResult.data;
            const eventsCount = eventsResult.count;
            const competitionsData = competitionsResult.data;
            const competitionsCount = competitionsResult.count;

            // Group 2: Activity queries (all independent) - run in parallel
            // Limit activity to the past 2 weeks
            const twoWeeksAgo = subWeeks(new Date(), 2).toISOString();

            const recentEventsQuery = supabase.from('events').select('id, title, created_at')
                .eq('hub_id', hub.id).gte('created_at', twoWeeksAgo).order('created_at', { ascending: false }).limit(5);
            const recentCompsQuery = supabase.from('competitions').select('id, name, created_at')
                .eq('hub_id', hub.id).gte('created_at', twoWeeksAgo).order('created_at', { ascending: false }).limit(5);
            const groupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id);
            const memberGroupsQuery = supabase.from('group_members').select('group_id, groups!inner(hub_id)')
                .eq('user_id', user.id).eq('groups.hub_id', hub.id);
            const publicGroupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id).eq('type', 'public');
            const recentMembersQuery = supabase.from('hub_members').select(`user_id, created_at, role, profiles:user_id (full_name)`)
                .eq('hub_id', hub.id).gte('created_at', twoWeeksAgo).order('created_at', { ascending: false }).limit(5);

            let activityResults: any[];
            if (isStaff) {
                activityResults = await Promise.all([
                    recentEventsQuery,
                    recentCompsQuery,
                    groupsQuery,
                    recentMembersQuery
                ]);
            } else {
                activityResults = await Promise.all([
                    recentEventsQuery,
                    recentCompsQuery,
                    memberGroupsQuery,
                    publicGroupsQuery
                ]);
            }

            const activities: RecentActivity[] = [];

            const recentEvents = activityResults[0].data;
            if (recentEvents) {
                recentEvents.forEach((event: { id: string; title: string; created_at: string }) => {
                    activities.push({
                        id: `event-${event.id}`,
                        type: 'event',
                        description: `New event: ${event.title}`,
                        timestamp: event.created_at,
                        link: `calendar?event=${event.id}`
                    });
                });
            }

            const recentCompetitions = activityResults[1].data;
            if (recentCompetitions) {
                recentCompetitions.forEach((comp: { id: string; name: string; created_at: string }) => {
                    activities.push({
                        id: `comp-${comp.id}`,
                        type: 'competition',
                        description: `New competition: ${comp.name}`,
                        timestamp: comp.created_at,
                        link: `competitions/${comp.id}`
                    });
                });
            }

            let accessibleGroupIds: string[] = [];
            if (isStaff) {
                const allGroups = activityResults[2].data;
                accessibleGroupIds = allGroups?.map((g: { id: string }) => g.id) || [];
            } else {
                const memberGroups = activityResults[2].data;
                const publicGroups = activityResults[3].data;
                const memberGroupIds = memberGroups?.map((g: { group_id: string }) => g.group_id) || [];
                const publicGroupIds = publicGroups?.map((g: { id: string }) => g.id) || [];
                accessibleGroupIds = [...new Set([...memberGroupIds, ...publicGroupIds])];
            }

            if (accessibleGroupIds.length > 0) {
                const { data: recentPosts } = await supabase
                    .from('posts')
                    .select(`
                        id,
                        content,
                        created_at,
                        group_id,
                        profiles:user_id (full_name),
                        groups:group_id (name)
                    `)
                    .in('group_id', accessibleGroupIds)
                    .gte('created_at', twoWeeksAgo)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (recentPosts) {
                    recentPosts.forEach((post: any) => {
                        const authorName = post.profiles?.full_name || 'Someone';
                        const groupName = post.groups?.name || 'a group';
                        const contentPreview = post.content?.length > 80
                            ? post.content.substring(0, 80) + '...'
                            : post.content || '';

                        activities.push({
                            id: `post-${post.id}`,
                            type: 'post',
                            description: `${authorName} in ${groupName}`,
                            timestamp: post.created_at,
                            link: `groups/${post.group_id}?post=${post.id}`,
                            groupName,
                            content: contentPreview
                        });
                    });
                }
            }

            if (isStaff) {
                const recentMembers = activityResults[3]?.data;
                if (recentMembers) {
                    recentMembers.forEach((member: any) => {
                        const memberName = member.profiles?.full_name || 'A new member';
                        activities.push({
                            id: `member-${member.user_id}`,
                            type: 'member',
                            description: `${memberName} joined as ${member.role}`,
                            timestamp: member.created_at,
                            link: 'roster'
                        });
                    });
                }
            }

            activities.sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            setStats({
                totalMembers: memberCount || 0,
                totalGymnasts: gymnastCount || 0,
                upcomingEvents: eventsCount || 0,
                nextEventDate: eventsData && eventsData.length > 0 ? eventsData[0].start_time : null,
                activeCompetitions: competitionsCount || 0,
                nextCompetitionName: competitionsData && competitionsData.length > 0 ? competitionsData[0].name : null
            });

            setUpcomingEvents(eventsData || []);
            setRecentActivity(activities.slice(0, 8));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoadingStats(false);
        }
    }, [hub, user, isStaff]);

    // Main data fetch effect - placed after all useCallback definitions
    useEffect(() => {
        if (hub && user) {
            fetchDashboardData();
            fetchUserName();
            if (isParent && linkedGymnasts.length > 0) {
                fetchLinkedGymnastInfo();
                fetchParentDashboardData();
            }
            if (isOwner) {
                fetchPendingTimeOff();
            }
        }
    }, [hub, user, linkedGymnasts, isParent, isOwner, fetchDashboardData, fetchUserName, fetchLinkedGymnastInfo, fetchParentDashboardData, fetchPendingTimeOff]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-mint-500 animate-spin" />
            </div>
        );
    }

    if (!hub) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg">Hub not found</p>
            </div>
        );
    }

    const formatEventType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getEventTypeStyles = (type: string) => {
        const styles: Record<string, string> = {
            practice: 'badge-indigo',
            competition: 'badge-mint',
            meeting: 'badge-slate',
            social: 'badge-mint',
            other: 'badge-slate'
        };
        return styles[type] || styles.other;
    };

    // Gymnastics event label helper
    const getEventLabel = (event: string) => {
        const labels: Record<string, string> = {
            vault: 'Vault',
            bars: 'Bars',
            beam: 'Beam',
            floor: 'Floor',
            strength: 'Strength',
            flexibility: 'Flexibility',
            conditioning: 'Conditioning'
        };
        return labels[event] || event.charAt(0).toUpperCase() + event.slice(1);
    };

    // Staff stat cards show team-level info (parents don't see stat cards - they see gymnast card + schedule)
    const statCards = [
        {
            name: 'Team Members',
            value: loadingStats ? '-' : String(stats?.totalMembers || 0),
            icon: Users,
            subtitle: loadingStats ? '' : `${stats?.totalGymnasts || 0} athletes`,
        },
        {
            name: 'Upcoming Events',
            value: loadingStats ? '-' : String(stats?.upcomingEvents || 0),
            icon: CalendarDays,
            subtitle: stats?.nextEventDate ? `Next: ${format(parseISO(stats.nextEventDate), 'EEE h:mma')}` : 'No upcoming',
        },
        {
            name: 'Competitions',
            value: loadingStats ? '-' : String(stats?.activeCompetitions || 0),
            icon: Trophy,
            subtitle: stats?.nextCompetitionName || 'None scheduled',
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-slate-900">
                    {getGreeting()}{userName ? `, ${userName}` : ''}
                </h1>
                <p className="text-slate-500 mt-1">
                    Welcome to {hub.name} • {format(new Date(), 'EEEE, MMMM d')}
                </p>
            </div>

            {/* Parent: Linked Gymnast Cards */}
            {isParent && linkedGymnastInfo.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        {linkedGymnastInfo.length === 1 ? 'Your Gymnast' : 'Your Gymnasts'}
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {linkedGymnastInfo.map((gymnast) => (
                            <Link
                                key={gymnast.id}
                                to={`roster/${gymnast.id}`}
                                className="card p-4 hover:shadow-md transition-shadow cursor-pointer"
                            >
                                {/* Gymnast Name & Level */}
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {gymnast.first_name} {gymnast.last_name}
                                        </h3>
                                        <p className="text-sm text-slate-600">{gymnast.level}</p>
                                    </div>
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
                                        <User className="h-5 w-5 text-brand-600" />
                                    </div>
                                </div>

                                {/* Birthday */}
                                {gymnast.date_of_birth && (
                                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                                        <Cake className="h-4 w-4 text-purple-500" />
                                        <span>Birthday: {format(parseISO(gymnast.date_of_birth), 'MMMM d')}</span>
                                    </div>
                                )}

                                {/* Next Competition */}
                                {gymnast.nextCompetition && (
                                    <div className="flex items-center gap-2 text-sm mb-2">
                                        <Trophy className="h-4 w-4 text-amber-500" />
                                        <span className="text-slate-700">
                                            <span className="font-medium">{gymnast.nextCompetition.name}</span>
                                            <span className="text-slate-500"> · {format(parseISO(gymnast.nextCompetition.start_date), 'MMM d')}</span>
                                        </span>
                                    </div>
                                )}

                                {/* Mentorship Pairing */}
                                {gymnast.mentorshipPairing && (
                                    <div className="flex items-center gap-2 text-sm">
                                        {gymnast.mentorshipPairing.role === 'big' ? (
                                            <>
                                                <Star className="h-4 w-4 text-purple-500" />
                                                <span className="text-slate-700">
                                                    Big to <span className="font-medium">{gymnast.mentorshipPairing.little_name}</span>
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <Heart className="h-4 w-4 text-pink-500" />
                                                <span className="text-slate-700">
                                                    Little to <span className="font-medium">{gymnast.mentorshipPairing.big_name}</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Empty state if no extra info */}
                                {!gymnast.nextCompetition && !gymnast.mentorshipPairing && !gymnast.date_of_birth && (
                                    <p className="text-sm text-slate-400 italic">No upcoming events</p>
                                )}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Stat Cards - only for staff, parents see gymnast card + schedule below */}
            {!isParent && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {statCards.map((item) => (
                        <div
                            key={item.name}
                            className="stat-block"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="stat-label">{item.name}</span>
                                <item.icon className="h-5 w-5 text-slate-500" />
                            </div>
                            <p className="stat-value text-mint-600">{item.value}</p>
                            <p className="text-sm text-slate-500 mt-1 truncate">{item.subtitle}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Owner: Pending Time Off Requests */}
            {isOwner && pendingTimeOff.length > 0 && (
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-slate-900">Pending Time Off Requests</h2>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                                {pendingTimeOff.length}
                            </span>
                        </div>
                        <Link to="staff" className="text-sm text-brand-600 hover:text-brand-700">
                            View Staff
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {pendingTimeOff.map((request) => (
                            <div
                                key={request.id}
                                className="card p-4 bg-amber-50 border-amber-200"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-amber-200">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    onClick={() => navigate(`staff/${request.staff_user_id}`)}
                                                    className="font-medium text-slate-900 hover:text-brand-600 transition-colors"
                                                >
                                                    {request.staff_name}
                                                </button>
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-xs font-medium",
                                                    getTimeOffTypeColor(request.type)
                                                )}>
                                                    {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-700 mt-0.5">
                                                {format(parseISO(request.start_date), 'MMM d')}
                                                {request.start_date !== request.end_date && (
                                                    <> - {format(parseISO(request.end_date), 'MMM d, yyyy')}</>
                                                )}
                                                {request.start_date === request.end_date && (
                                                    <>, {format(parseISO(request.start_date), 'yyyy')}</>
                                                )}
                                            </p>
                                            {request.notes && (
                                                <p className="text-sm text-slate-500 mt-1">{request.notes}</p>
                                            )}
                                            <p className="text-xs text-slate-400 mt-1">
                                                Requested {format(parseISO(request.created_at), 'MMM d')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTimeOffDecision(request.id, 'approved', request)}
                                            disabled={processingTimeOff === request.id}
                                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                                            title="Approve"
                                        >
                                            {processingTimeOff === request.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Check className="w-4 h-4" />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleTimeOffDecision(request.id, 'denied', request)}
                                            disabled={processingTimeOff === request.id}
                                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                            title="Deny"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Parent-specific sections */}
            {isParent && (
                <>
                    {/* Today's Assignment Progress */}
                    {assignmentProgress.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">Today's Assignments</h2>
                                <Link to="assignments" className="text-sm text-brand-600 hover:text-brand-700">
                                    View All
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {assignmentProgress.map((item, index) => {
                                    const percentage = Math.round((item.completedItems / item.totalItems) * 100);
                                    const isComplete = percentage === 100;
                                    return (
                                        <div
                                            key={`${item.gymnastId}-${item.event}-${index}`}
                                            className="card p-3"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm font-medium text-slate-700">{getEventLabel(item.event)}</span>
                                                <span className={clsx(
                                                    "text-xs font-semibold",
                                                    isComplete ? "text-green-600" : "text-slate-500"
                                                )}>
                                                    {item.completedItems}/{item.totalItems}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                <div
                                                    className={clsx(
                                                        "h-2 rounded-full transition-all",
                                                        isComplete ? "bg-green-500" : "bg-brand-500"
                                                    )}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            {linkedGymnastInfo.length > 1 && (
                                                <p className="text-xs text-slate-500 mt-1">{item.gymnastName}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Scores */}
                    {recentScores.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">Recent Scores</h2>
                                <Link to="scores" className="text-sm text-brand-600 hover:text-brand-700">
                                    View All
                                </Link>
                            </div>
                            <div className="card">
                                <ul className="divide-y divide-slate-100">
                                    {recentScores.map((score) => (
                                        <li key={score.id} className="px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                                                    <Trophy className="h-4 w-4 text-amber-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {getEventLabel(score.event)} - {score.competitionName}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {linkedGymnastInfo.length > 1 ? `${score.gymnastName} · ` : ''}
                                                        {format(parseISO(score.date), 'MMM d')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold text-slate-900">{score.score}</p>
                                                {score.placement && (
                                                    <p className="text-xs text-slate-500">#{score.placement}</p>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Recent Skill Changes */}
                    {recentSkillChanges.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-slate-900">Skill Updates</h2>
                                <Link to="skills" className="text-sm text-brand-600 hover:text-brand-700">
                                    View All
                                </Link>
                            </div>
                            <div className="card">
                                <ul className="divide-y divide-slate-100">
                                    {recentSkillChanges.map((skill) => {
                                        const statusConfig = SKILL_STATUS_CONFIG[skill.status];
                                        return (
                                            <li key={skill.id} className="px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
                                                        <Sparkles className="h-4 w-4 text-purple-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-700">
                                                            {skill.skillName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {linkedGymnastInfo.length > 1 ? `${skill.gymnastName} · ` : ''}
                                                            {getEventLabel(skill.event)} · {format(parseISO(skill.updatedAt), 'MMM d')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className={clsx(
                                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                                                    statusConfig.bgColor,
                                                    statusConfig.color
                                                )}>
                                                    {statusConfig.icon && <span>{statusConfig.icon}</span>}
                                                    {statusConfig.label}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-6">
                        {/* Recent Group Posts */}
                        {recentGroupPosts.length > 0 && (
                            <div className="card">
                                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">Group Posts</h2>
                                    <Link to="groups" className="text-sm text-brand-600 hover:text-brand-700">
                                        View All
                                    </Link>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {recentGroupPosts.map((post) => (
                                        <li key={post.id}>
                                            <Link
                                                to={`groups/${post.groupId}?post=${post.id}`}
                                                className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
                                                        <MessageSquare className="h-4 w-4 text-brand-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">
                                                            {post.authorName} in {post.groupName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 line-clamp-1">
                                                            {post.content}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-slate-400 flex-shrink-0">
                                                        {format(parseISO(post.createdAt), 'MMM d')}
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Recent Marketplace Items */}
                        {recentMarketplaceItems.length > 0 && (
                            <div className="card">
                                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-slate-900">New in Marketplace</h2>
                                    <Link to="marketplace" className="text-sm text-brand-600 hover:text-brand-700">
                                        View All
                                    </Link>
                                </div>
                                <ul className="divide-y divide-slate-100">
                                    {recentMarketplaceItems.map((item) => (
                                        <li key={item.id}>
                                            <Link
                                                to={`marketplace?item=${item.id}`}
                                                className="block px-4 py-3 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
                                                        <ShoppingBag className="h-4 w-4 text-emerald-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-700 truncate">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.category} · {item.sellerName}
                                                        </p>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900">
                                                        ${item.price}
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Recent Activity */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                    </div>
                    <div className="p-6">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-mint-500" />
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageSquare className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                                <p className="text-slate-400">No recent activity</p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {recentActivity.map((activity, index) => {
                                    const ActivityIcon = activity.type === 'event' ? Calendar :
                                        activity.type === 'post' ? MessageSquare :
                                        activity.type === 'competition' ? Trophy :
                                        activity.type === 'member' ? UserPlus : FileText;

                                    const iconColor = activity.type === 'event' ? 'text-indigo-600' :
                                        activity.type === 'post' ? 'text-mint-600' :
                                        activity.type === 'competition' ? 'text-mint-600' :
                                        activity.type === 'member' ? 'text-mint-600' :
                                        'text-slate-500';

                                    const activityContent = (
                                        <div className="flex items-center gap-3 py-3">
                                            <div className={clsx(
                                                "flex h-9 w-9 items-center justify-center rounded-lg",
                                                "bg-slate-100"
                                            )}>
                                                <ActivityIcon className={clsx("h-4 w-4", iconColor)} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-700 truncate">{activity.description}</p>
                                                {activity.content && (
                                                    <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{activity.content}</p>
                                                )}
                                            </div>
                                            <span className="text-xs text-slate-500 flex-shrink-0">
                                                {format(parseISO(activity.timestamp), 'MMM d')}
                                            </span>
                                        </div>
                                    );

                                    return (
                                        <li
                                            key={activity.id}
                                            className="animate-slide-up"
                                            style={{ animationDelay: `${index * 30}ms` }}
                                        >
                                            {activity.link ? (
                                                <Link
                                                    to={activity.link}
                                                    className="block rounded-lg hover:bg-slate-100 transition-colors -mx-3 px-3"
                                                >
                                                    {activityContent}
                                                </Link>
                                            ) : (
                                                <div className="-mx-3 px-3">
                                                    {activityContent}
                                                </div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="card">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
                    </div>
                    <div className="p-6">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-mint-500" />
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarDays className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                                <p className="text-slate-400">No upcoming events</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {upcomingEvents.map((event, index) => (
                                    <li
                                        key={event.id}
                                        className="animate-slide-up"
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <Link
                                            to={`calendar?event=${event.id}`}
                                            className={clsx(
                                                "group flex items-center justify-between rounded-lg px-4 py-3",
                                                "bg-slate-50 border border-slate-200",
                                                "hover:bg-slate-100 hover:border-slate-300 transition-all duration-150"
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-medium text-sm text-slate-700 truncate">
                                                    {event.title}
                                                </p>
                                                <span className={clsx(
                                                    "inline-block mt-1.5",
                                                    getEventTypeStyles(event.type)
                                                )}>
                                                    {formatEventType(event.type)}
                                                </span>
                                            </div>
                                            <div className="ml-4 text-right flex items-center gap-3">
                                                <div>
                                                    <p className="text-sm font-medium text-slate-700">
                                                        {format(parseISO(event.start_time), 'EEE, MMM d')}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {format(parseISO(event.start_time), 'h:mm a')}
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-mint-600 transition-colors" />
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {upcomingEvents.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-200">
                            <Link
                                to="calendar"
                                className="btn-primary w-full"
                            >
                                <CalendarDays className="w-4 h-4" />
                                View Full Calendar
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
