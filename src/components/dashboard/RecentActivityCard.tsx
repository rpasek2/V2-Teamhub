import { Link } from 'react-router-dom';
import { Calendar, MessageSquare, Trophy, UserPlus, FileText, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';

interface RecentActivity {
    id: string;
    type: 'post' | 'event' | 'member' | 'competition';
    description: string;
    timestamp: string;
    link?: string;
    groupName?: string;
    content?: string;
}

interface RecentActivityCardProps {
    recentActivity: RecentActivity[];
    loadingStats: boolean;
}

export function RecentActivityCard({ recentActivity, loadingStats }: RecentActivityCardProps) {
    return (
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
    );
}
