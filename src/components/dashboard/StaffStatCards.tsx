import { useMemo } from 'react';
import { Users, CalendarDays, Trophy } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { isTabEnabled } from '../../lib/permissions';
import type { LucideIcon } from 'lucide-react';

interface DashboardStats {
    totalMembers: number;
    totalGymnasts: number;
    upcomingEvents: number;
    nextEventDate: string | null;
    activeCompetitions: number;
    nextCompetitionName: string | null;
}

interface StaffStatCardsProps {
    stats: DashboardStats | null;
    loadingStats: boolean;
    enabledTabs: string[] | undefined;
}

export function StaffStatCards({ stats, loadingStats, enabledTabs }: StaffStatCardsProps) {
    const statCards = useMemo(() => {
        const cards: { name: string; value: string; icon: LucideIcon; subtitle: string }[] = [
            {
                name: 'Team Members',
                value: loadingStats ? '-' : String(stats?.totalMembers || 0),
                icon: Users,
                subtitle: loadingStats ? '' : `${stats?.totalGymnasts || 0} athletes`,
            },
        ];

        if (isTabEnabled('calendar', enabledTabs)) {
            cards.push({
                name: 'Upcoming Events',
                value: loadingStats ? '-' : String(stats?.upcomingEvents || 0),
                icon: CalendarDays,
                subtitle: stats?.nextEventDate ? `Next: ${format(parseISO(stats.nextEventDate), 'EEE h:mma')}` : 'No upcoming',
            });
        }

        if (isTabEnabled('competitions', enabledTabs)) {
            cards.push({
                name: 'Competitions',
                value: loadingStats ? '-' : String(stats?.activeCompetitions || 0),
                icon: Trophy,
                subtitle: stats?.nextCompetitionName || 'None scheduled',
            });
        }

        return cards;
    }, [loadingStats, stats, enabledTabs]);

    return (
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
    );
}
