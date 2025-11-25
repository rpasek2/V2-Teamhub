import { useState, useEffect } from 'react';
import { Users, CalendarDays, MessageCircle, Trophy, Loader2 } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { supabase } from '../lib/supabase';
import { format, isAfter, parseISO } from 'date-fns';

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
    type: 'post' | 'event' | 'member';
    description: string;
    timestamp: string;
}

export function Dashboard() {
    const { hub, loading } = useHub();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        if (hub) {
            fetchDashboardData();
        }
    }, [hub]);

    const fetchDashboardData = async () => {
        if (!hub) return;
        setLoadingStats(true);

        try {
            // Fetch member count
            const { count: memberCount } = await supabase
                .from('hub_members')
                .select('*', { count: 'exact', head: true })
                .eq('hub_id', hub.id);

            // Fetch gymnast count
            const { count: gymnastCount } = await supabase
                .from('gymnast_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('hub_id', hub.id);

            // Fetch upcoming events (next 7 days)
            const now = new Date().toISOString();
            const { data: eventsData, count: eventsCount } = await supabase
                .from('events')
                .select('id, title, start_time, type', { count: 'exact' })
                .eq('hub_id', hub.id)
                .gte('start_time', now)
                .order('start_time', { ascending: true })
                .limit(5);

            // Fetch active competitions
            const { data: competitionsData, count: competitionsCount } = await supabase
                .from('competitions')
                .select('id, name, start_date, end_date', { count: 'exact' })
                .eq('hub_id', hub.id)
                .gte('end_date', now.split('T')[0])
                .order('start_date', { ascending: true })
                .limit(5);

            // Fetch recent posts for activity feed
            const { data: recentPosts } = await supabase
                .from('posts')
                .select(`
                    id,
                    content,
                    created_at,
                    profiles:user_id (full_name)
                `)
                .eq('group_id', hub.id) // This won't work for group posts, but catches hub-level if any
                .order('created_at', { ascending: false })
                .limit(5);

            // Build activity feed from recent events created
            const { data: recentEvents } = await supabase
                .from('events')
                .select('id, title, created_at')
                .eq('hub_id', hub.id)
                .order('created_at', { ascending: false })
                .limit(3);

            // Build activity feed
            const activities: RecentActivity[] = [];

            if (recentEvents) {
                recentEvents.forEach(event => {
                    activities.push({
                        id: `event-${event.id}`,
                        type: 'event',
                        description: `New event created: ${event.title}`,
                        timestamp: event.created_at
                    });
                });
            }

            // Sort activities by timestamp
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
            setRecentActivity(activities.slice(0, 5));

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoadingStats(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading hub data...</div>;
    }

    if (!hub) {
        return <div className="p-8">Hub not found.</div>;
    }

    const formatEventType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1);
    };

    const statCards = [
        {
            name: 'Team Members',
            value: loadingStats ? '-' : String(stats?.totalMembers || 0),
            icon: Users,
            subtitle: loadingStats ? '' : `${stats?.totalGymnasts || 0} gymnasts`,
            color: 'bg-brand-500'
        },
        {
            name: 'Upcoming Events',
            value: loadingStats ? '-' : String(stats?.upcomingEvents || 0),
            icon: CalendarDays,
            subtitle: stats?.nextEventDate ? `Next: ${format(parseISO(stats.nextEventDate), 'EEE h:mma')}` : 'No upcoming',
            color: 'bg-blue-500'
        },
        {
            name: 'Active Competitions',
            value: loadingStats ? '-' : String(stats?.activeCompetitions || 0),
            icon: Trophy,
            subtitle: stats?.nextCompetitionName || 'None scheduled',
            color: 'bg-amber-500'
        },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">{hub.name}</h1>
                <p className="mt-1 text-slate-600">Welcome to your team dashboard.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {statCards.map((item) => (
                    <div
                        key={item.name}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md"
                    >
                        <dt>
                            <div className={`absolute rounded-md ${item.color} p-3`}>
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-slate-500">{item.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                            <p className="ml-2 flex items-baseline text-sm text-slate-500 truncate">
                                {item.subtitle}
                            </p>
                        </dd>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Activity */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                    <div className="mt-4 space-y-4">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : recentActivity.length === 0 ? (
                            <p className="text-sm text-slate-500">No recent activity to show.</p>
                        ) : (
                            <ul className="space-y-3">
                                {recentActivity.map((activity) => (
                                    <li key={activity.id} className="flex items-start gap-3">
                                        <div className={`mt-1 h-2 w-2 rounded-full ${
                                            activity.type === 'event' ? 'bg-blue-500' :
                                            activity.type === 'post' ? 'bg-green-500' : 'bg-slate-400'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 truncate">{activity.description}</p>
                                            <p className="text-xs text-slate-400">
                                                {format(parseISO(activity.timestamp), 'MMM d, h:mma')}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Upcoming Schedule */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
                    <div className="mt-4 space-y-4">
                        {loadingStats ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                            </div>
                        ) : upcomingEvents.length === 0 ? (
                            <p className="text-sm text-slate-500">No upcoming events scheduled.</p>
                        ) : (
                            <ul className="space-y-3">
                                {upcomingEvents.map((event) => (
                                    <li key={event.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                                            <p className="text-xs text-slate-500">{formatEventType(event.type)}</p>
                                        </div>
                                        <div className="ml-4 text-right">
                                            <p className="text-sm font-medium text-slate-700">
                                                {format(parseISO(event.start_time), 'EEE, MMM d')}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {format(parseISO(event.start_time), 'h:mm a')}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
