import { Users, CalendarDays, MessageCircle, Trophy } from 'lucide-react';
import { useHub } from '../context/HubContext';

export function Dashboard() {
    const { hub, loading } = useHub();

    if (loading) {
        return <div className="p-8">Loading hub data...</div>;
    }

    if (!hub) {
        return <div className="p-8">Hub not found.</div>;
    }

    const stats = [
        { name: 'Total Members', value: '12', icon: Users, change: '+2 this week', changeType: 'positive' },
        { name: 'Upcoming Events', value: '3', icon: CalendarDays, change: 'Next: Fri 4pm', changeType: 'neutral' },
        { name: 'Unread Messages', value: '5', icon: MessageCircle, change: '2 urgent', changeType: 'negative' },
        { name: 'Active Competitions', value: '1', icon: Trophy, change: 'Regionals', changeType: 'neutral' },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">{hub.name}</h1>
                <p className="mt-1 text-slate-600">Welcome to your team dashboard.</p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {stats.map((item) => (
                    <div
                        key={item.name}
                        className="relative overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition-all hover:shadow-md"
                    >
                        <dt>
                            <div className="absolute rounded-md bg-brand-500 p-3">
                                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-slate-500">{item.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                            <p className="text-2xl font-semibold text-slate-900">{item.value}</p>
                            <p
                                className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'positive' ? 'text-green-600' :
                                    item.changeType === 'negative' ? 'text-red-600' : 'text-slate-500'
                                    }`}
                            >
                                {item.change}
                            </p>
                        </dd>
                    </div>
                ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Recent Activity Placeholder */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-slate-500">No recent activity to show.</p>
                    </div>
                </div>

                {/* Upcoming Schedule Placeholder */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Upcoming Schedule</h2>
                    <div className="mt-4 space-y-4">
                        <p className="text-sm text-slate-500">No upcoming events scheduled.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
