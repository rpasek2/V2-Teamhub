import { useState, useEffect, useCallback } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { supabase } from '../lib/supabase';
import { format, subWeeks, subDays } from 'date-fns';
import { StaffStatCards } from '../components/dashboard/StaffStatCards';
import { PendingTimeOffSection } from '../components/dashboard/PendingTimeOffSection';
import { ParentGymnastCards } from '../components/dashboard/ParentGymnastCards';
import { ParentDashboardSections } from '../components/dashboard/ParentDashboardSections';
import { RecentActivityCard } from '../components/dashboard/RecentActivityCard';
import { UpcomingScheduleCard } from '../components/dashboard/UpcomingScheduleCard';
import type { GymnastProfile } from '../types';
import type { SkillStatus } from '../types';

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
    const enabledTabs = hub?.settings?.enabledTabs;
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
        competitionData?.forEach((cg) => {
            const comp = Array.isArray(cg.competitions) ? cg.competitions[0] : cg.competitions;
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
        mentorshipData?.forEach((p) => {
            const big = Array.isArray(p.big_gymnast) ? p.big_gymnast[0] : p.big_gymnast;
            const little = Array.isArray(p.little_gymnast) ? p.little_gymnast[0] : p.little_gymnast;
            const bigName = `${big?.first_name || ''} ${big?.last_name || ''}`.trim();
            const littleName = `${little?.first_name || ''} ${little?.last_name || ''}`.trim();

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
                    .eq('groups.hub_id', hub.id)
                    .limit(50),

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
                    .limit(50)
            ]);

            // Process scores
            if (scoresResult.data) {
                const scores: RecentScore[] = scoresResult.data.map((s) => {
                    const gymnast = Array.isArray(s.gymnast_profiles) ? s.gymnast_profiles[0] : s.gymnast_profiles;
                    const comp = Array.isArray(s.competitions) ? s.competitions[0] : s.competitions;
                    return {
                        id: s.id,
                        gymnastName: `${gymnast?.first_name || ''} ${gymnast?.last_name || ''}`.trim(),
                        competitionName: comp?.name || '',
                        event: s.event,
                        score: s.score,
                        placement: s.placement,
                        date: comp?.start_date || ''
                    };
                });
                setRecentScores(scores);
            }

            // Process skill changes
            if (skillsResult.data) {
                const skills: RecentSkillChange[] = skillsResult.data.map((s) => {
                    const gymnast = Array.isArray(s.gymnast_profiles) ? s.gymnast_profiles[0] : s.gymnast_profiles;
                    const skill = Array.isArray(s.hub_event_skills) ? s.hub_event_skills[0] : s.hub_event_skills;
                    return {
                        id: s.id,
                        gymnastName: `${gymnast?.first_name || ''} ${gymnast?.last_name || ''}`.trim(),
                        skillName: skill?.skill_name || '',
                        event: skill?.event || '',
                        status: s.status as SkillStatus,
                        updatedAt: s.updated_at
                    };
                });
                setRecentSkillChanges(skills);
            }

            // Process marketplace items
            if (marketplaceResult.data) {
                const items: RecentMarketplaceItem[] = marketplaceResult.data.map((item) => {
                    const seller = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
                    return {
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        category: item.category,
                        sellerName: seller?.full_name || 'Unknown',
                        createdAt: item.created_at
                    };
                });
                setRecentMarketplaceItems(items);
            }

            // Fetch recent posts from user's groups
            if (groupsResult.data && groupsResult.data.length > 0) {
                const groupIds = groupsResult.data.map((g) => g.group_id);
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
                    const posts: RecentGroupPost[] = postsData.map((p) => {
                        const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                        const group = Array.isArray(p.groups) ? p.groups[0] : p.groups;
                        return {
                            id: p.id,
                            groupId: p.group_id,
                            groupName: group?.name || 'Unknown Group',
                            authorName: author?.full_name || 'Unknown',
                            content: p.content?.length > 100 ? p.content.substring(0, 100) + '...' : p.content || '',
                            createdAt: p.created_at
                        };
                    });
                    setRecentGroupPosts(posts);
                }
            }

            // Process assignments for today
            if (assignmentsResult.data) {
                const progress: AssignmentProgress[] = [];
                const events = ['vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'];

                (assignmentsResult.data as any[]).forEach((a: any) => {
                    const gymnast = Array.isArray(a.gymnast_profiles) ? a.gymnast_profiles[0] : a.gymnast_profiles;
                    const gymnastName = `${gymnast?.first_name || ''} ${gymnast?.last_name || ''}`.trim();
                    const completedItems = a.completed_items || {};

                    events.forEach(event => {
                        const eventValue = a[event as keyof typeof a] as string | null;
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

            const requests: PendingTimeOffRequest[] = ((data || []) as any[]).map((r: any) => {
                const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
                return {
                    id: r.id,
                    staff_user_id: r.staff_user_id,
                    staff_name: profile?.full_name || 'Unknown',
                    start_date: r.start_date,
                    end_date: r.end_date,
                    type: r.type,
                    notes: r.notes,
                    created_at: r.created_at
                };
            });

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
            const groupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id).limit(50);
            const memberGroupsQuery = supabase.from('group_members').select('group_id, groups!inner(hub_id)')
                .eq('user_id', user.id).eq('groups.hub_id', hub.id).limit(50);
            const publicGroupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id).eq('type', 'public').limit(50);
            const recentMembersQuery = supabase.from('hub_members').select(`user_id, created_at, role, profiles:user_id (full_name)`)
                .eq('hub_id', hub.id).gte('created_at', twoWeeksAgo).order('created_at', { ascending: false }).limit(5);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let activityResults: { data: any[] | null; error: unknown }[];
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
                recentEvents.forEach((event) => {
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
                recentCompetitions.forEach((comp) => {
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
                accessibleGroupIds = allGroups?.map((g) => g.id) || [];
            } else {
                const memberGroups = activityResults[2].data;
                const publicGroups = activityResults[3].data;
                const memberGroupIds = memberGroups?.map((g) => g.group_id) || [];
                const publicGroupIds = publicGroups?.map((g) => g.id) || [];
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
                    recentPosts.forEach((post) => {
                        const author = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;
                        const group = Array.isArray(post.groups) ? post.groups[0] : post.groups;
                        const authorName = author?.full_name || 'Someone';
                        const groupName = group?.name || 'a group';
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
                    recentMembers.forEach((member) => {
                        const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
                        const memberName = profile?.full_name || 'A new member';
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
            {isParent && <ParentGymnastCards linkedGymnastInfo={linkedGymnastInfo} />}

            {/* Stat Cards - only for staff, parents see gymnast card + schedule below */}
            {!isParent && (
                <StaffStatCards stats={stats} loadingStats={loadingStats} enabledTabs={enabledTabs} />
            )}

            {/* Owner: Pending Time Off Requests */}
            {isOwner && (
                <PendingTimeOffSection
                    pendingTimeOff={pendingTimeOff}
                    processingTimeOff={processingTimeOff}
                    onTimeOffDecision={handleTimeOffDecision}
                />
            )}

            {/* Parent-specific sections */}
            {isParent && (
                <ParentDashboardSections
                    assignmentProgress={assignmentProgress}
                    recentScores={recentScores}
                    recentSkillChanges={recentSkillChanges}
                    recentGroupPosts={recentGroupPosts}
                    recentMarketplaceItems={recentMarketplaceItems}
                    linkedGymnastCount={linkedGymnastInfo.length}
                    enabledTabs={enabledTabs}
                />
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RecentActivityCard recentActivity={recentActivity} loadingStats={loadingStats} />
                <UpcomingScheduleCard upcomingEvents={upcomingEvents} loadingStats={loadingStats} />
            </div>
        </div>
    );
}
