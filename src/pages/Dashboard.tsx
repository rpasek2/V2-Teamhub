import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarDays, Trophy, Loader2, MessageSquare, Calendar, UserPlus, FileText, TrendingUp, Sparkles } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface DashboardStats {
    totalMembers: number;
    totalGymnasts: number;
    upcomingEvents: number;
    nextEventDate: string | null;
    activeCompetitions: number;
    nextCompetitionName: string | null;
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

// Get time-based greeting
function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

export function Dashboard() {
    const { hub, loading, user, currentRole } = useHub();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [userName, setUserName] = useState<string>('');

    // Staff roles can see all activity
    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    useEffect(() => {
        if (hub && user) {
            fetchDashboardData();
            fetchUserName();
        }
    }, [hub, user]);

    const fetchUserName = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
        if (data?.full_name) {
            setUserName(data.full_name.split(' ')[0]); // First name only
        }
    };

    const fetchDashboardData = async () => {
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
            const recentEventsQuery = supabase.from('events').select('id, title, created_at')
                .eq('hub_id', hub.id).order('created_at', { ascending: false }).limit(5);
            const recentCompsQuery = supabase.from('competitions').select('id, name, created_at')
                .eq('hub_id', hub.id).order('created_at', { ascending: false }).limit(5);
            const groupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id);
            const memberGroupsQuery = supabase.from('group_members').select('group_id, groups!inner(hub_id)')
                .eq('user_id', user.id).eq('groups.hub_id', hub.id);
            const publicGroupsQuery = supabase.from('groups').select('id').eq('hub_id', hub.id).eq('type', 'public');
            const recentMembersQuery = supabase.from('hub_members').select(`user_id, created_at, role, profiles:user_id (full_name)`)
                .eq('hub_id', hub.id).order('created_at', { ascending: false }).limit(5);

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
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-canopy-600 animate-spin" />
            </div>
        );
    }

    if (!hub) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-mithril-500">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="font-display text-lg">Hub not found</p>
            </div>
        );
    }

    const formatEventType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const getEventTypeStyles = (type: string) => {
        const styles: Record<string, string> = {
            practice: 'bg-ether-100 text-ether-700 border-ether-200',
            competition: 'bg-arcane-100 text-arcane-700 border-arcane-200',
            meeting: 'bg-mithril-100 text-mithril-700 border-mithril-200',
            social: 'bg-canopy-100 text-canopy-700 border-canopy-200',
            other: 'bg-mithril-100 text-mithril-600 border-mithril-200'
        };
        return styles[type] || styles.other;
    };

    const statCards = [
        {
            name: 'TEAM MEMBERS',
            value: loadingStats ? '-' : String(stats?.totalMembers || 0),
            icon: Users,
            subtitle: loadingStats ? '' : `${stats?.totalGymnasts || 0} gymnasts`,
            gradient: 'from-canopy-600 to-canopy-700',
            iconBg: 'bg-canopy-500/20',
            iconColor: 'text-canopy-300'
        },
        {
            name: 'UPCOMING EVENTS',
            value: loadingStats ? '-' : String(stats?.upcomingEvents || 0),
            icon: CalendarDays,
            subtitle: stats?.nextEventDate ? `Next: ${format(parseISO(stats.nextEventDate), 'EEE h:mma')}` : 'No upcoming',
            gradient: 'from-ether-600 to-ether-700',
            iconBg: 'bg-ether-500/20',
            iconColor: 'text-ether-300'
        },
        {
            name: 'COMPETITIONS',
            value: loadingStats ? '-' : String(stats?.activeCompetitions || 0),
            icon: Trophy,
            subtitle: stats?.nextCompetitionName || 'None scheduled',
            gradient: 'from-arcane-600 to-arcane-700',
            iconBg: 'bg-arcane-500/20',
            iconColor: 'text-arcane-300'
        },
    ];

    return (
        <div className="animate-fade-in">
            {/* Header with greeting */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-arcane-500/20 to-arcane-600/10 border border-arcane-500/30">
                        <Sparkles className="w-5 h-5 text-arcane-500" />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-wider text-mithril-400">
                        {format(new Date(), 'EEEE, MMMM d')}
                    </span>
                </div>
                <h1 className="font-display text-3xl font-bold text-mithril-900">
                    {getGreeting()}{userName ? `, ${userName}` : ''}
                </h1>
                <p className="mt-2 text-mithril-500 font-display italic">
                    Welcome to {hub.name}
                </p>
            </div>

            {/* Stat Cards - D&D Stat Block Style */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                {statCards.map((item) => (
                    <div
                        key={item.name}
                        className={clsx(
                            "relative overflow-hidden rounded-xl p-5 transition-all duration-300",
                            "bg-gradient-to-br", item.gradient,
                            "shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        )}
                    >
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 opacity-10"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='1'/%3E%3Ccircle cx='13' cy='13' r='1'/%3E%3C/g%3E%3C/svg%3E")`
                            }}
                        />

                        <div className="relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-mono text-xs uppercase tracking-wider text-white/70">{item.name}</p>
                                    <p className="font-display text-4xl font-bold text-white mt-1">{item.value}</p>
                                </div>
                                <div className={clsx("p-3 rounded-lg", item.iconBg)}>
                                    <item.icon className={clsx("h-6 w-6", item.iconColor)} />
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-white/20">
                                <p className="text-sm text-white/80 truncate flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />
                                    {item.subtitle}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Activity - Quest Log Style */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="stat-block-header px-3 py-1.5 rounded-md">
                            <span className="text-xs">RECENT ACTIVITY</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-canopy-500" />
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <div className="text-center py-8">
                                <MessageSquare className="w-10 h-10 mx-auto text-mithril-300 mb-3" />
                                <p className="font-display text-mithril-500 italic">No recent activity to show</p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {recentActivity.map((activity, index) => {
                                    const ActivityIcon = activity.type === 'event' ? Calendar :
                                        activity.type === 'post' ? MessageSquare :
                                        activity.type === 'competition' ? Trophy :
                                        activity.type === 'member' ? UserPlus : FileText;

                                    const iconStyles = activity.type === 'event' ? 'bg-ether-100 text-ether-600 border-ether-200' :
                                        activity.type === 'post' ? 'bg-canopy-100 text-canopy-600 border-canopy-200' :
                                        activity.type === 'competition' ? 'bg-arcane-100 text-arcane-600 border-arcane-200' :
                                        activity.type === 'member' ? 'bg-canopy-100 text-canopy-600 border-canopy-200' :
                                        'bg-mithril-100 text-mithril-600 border-mithril-200';

                                    const activityContent = (
                                        <div className="flex items-start gap-3">
                                            <div className={clsx(
                                                "mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border",
                                                iconStyles
                                            )}>
                                                <ActivityIcon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-mithril-800">{activity.description}</p>
                                                {activity.content && (
                                                    <p className="text-sm text-mithril-500 mt-0.5 line-clamp-2">{activity.content}</p>
                                                )}
                                                <p className="font-mono text-xs text-mithril-400 mt-1">
                                                    {format(parseISO(activity.timestamp), 'MMM d, h:mma')}
                                                </p>
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <li
                                            key={activity.id}
                                            className="animate-slide-up"
                                            style={{ animationDelay: `${index * 50}ms` }}
                                        >
                                            {activity.link ? (
                                                <Link
                                                    to={activity.link}
                                                    className="block rounded-lg px-3 py-3 -mx-3 hover:bg-canopy-50/50 transition-all duration-150"
                                                >
                                                    {activityContent}
                                                </Link>
                                            ) : (
                                                <div className="px-3 py-3 -mx-3">
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

                {/* Upcoming Schedule - Quest Board Style */}
                <div className="card p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="stat-block-header px-3 py-1.5 rounded-md">
                            <span className="text-xs">UPCOMING QUESTS</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-canopy-500" />
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <div className="text-center py-8">
                                <CalendarDays className="w-10 h-10 mx-auto text-mithril-300 mb-3" />
                                <p className="font-display text-mithril-500 italic">No upcoming events scheduled</p>
                                <p className="text-sm text-mithril-400 mt-1">Your quest log awaits...</p>
                            </div>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingEvents.map((event, index) => (
                                    <li
                                        key={event.id}
                                        className="animate-slide-up"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <Link
                                            to={`calendar?event=${event.id}`}
                                            className={clsx(
                                                "flex items-center justify-between rounded-lg px-4 py-3",
                                                "bg-paper-warm border border-mithril-200",
                                                "hover:border-canopy-300 hover:shadow-sm transition-all duration-150"
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="font-display text-sm font-semibold text-mithril-900 truncate">
                                                    {event.title}
                                                </p>
                                                <span className={clsx(
                                                    "inline-block mt-1 px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wide border",
                                                    getEventTypeStyles(event.type)
                                                )}>
                                                    {formatEventType(event.type)}
                                                </span>
                                            </div>
                                            <div className="ml-4 text-right">
                                                <p className="font-display text-sm font-semibold text-mithril-800">
                                                    {format(parseISO(event.start_time), 'EEE, MMM d')}
                                                </p>
                                                <p className="font-mono text-xs text-mithril-500">
                                                    {format(parseISO(event.start_time), 'h:mm a')}
                                                </p>
                                            </div>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {upcomingEvents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-mithril-100">
                            <Link
                                to="calendar"
                                className="btn-secondary w-full text-sm"
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
