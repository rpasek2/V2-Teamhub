import { Link } from 'react-router-dom';
import { Trophy, Sparkles, MessageSquare, ShoppingBag } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { isTabEnabled } from '../../lib/permissions';
import { SKILL_STATUS_CONFIG, type SkillStatus } from '../../types';

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

interface ParentDashboardSectionsProps {
    assignmentProgress: AssignmentProgress[];
    recentScores: RecentScore[];
    recentSkillChanges: RecentSkillChange[];
    recentGroupPosts: RecentGroupPost[];
    recentMarketplaceItems: RecentMarketplaceItem[];
    linkedGymnastCount: number;
    enabledTabs: string[] | undefined;
}

// Gymnastics event label helper
function getEventLabel(event: string) {
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
}

export function ParentDashboardSections({
    assignmentProgress,
    recentScores,
    recentSkillChanges,
    recentGroupPosts,
    recentMarketplaceItems,
    linkedGymnastCount,
    enabledTabs,
}: ParentDashboardSectionsProps) {
    return (
        <>
            {/* Today's Assignment Progress */}
            {assignmentProgress.length > 0 && isTabEnabled('assignments', enabledTabs) && (
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
                                    {linkedGymnastCount > 1 && (
                                        <p className="text-xs text-slate-500 mt-1">{item.gymnastName}</p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Recent Scores */}
            {recentScores.length > 0 && isTabEnabled('scores', enabledTabs) && (
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
                                                {linkedGymnastCount > 1 ? `${score.gymnastName} · ` : ''}
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
            {recentSkillChanges.length > 0 && isTabEnabled('skills', enabledTabs) && (
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
                                                    {linkedGymnastCount > 1 ? `${skill.gymnastName} · ` : ''}
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
                {recentGroupPosts.length > 0 && isTabEnabled('groups', enabledTabs) && (
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
                {recentMarketplaceItems.length > 0 && isTabEnabled('marketplace', enabledTabs) && (
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
    );
}
