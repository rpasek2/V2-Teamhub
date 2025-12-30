import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, CalendarDays, Trophy, Loader2, MessageSquare, Calendar, UserPlus, FileText, ChevronRight } from 'lucide-react';
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

            {/* Stat Cards */}
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
