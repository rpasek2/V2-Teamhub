import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CalendarDays, MessageCircle, Trophy, Settings2, LogOut, ArrowLeft, ClipboardList, Music, Megaphone, Waves, Swords, Medal, Sparkles, ShoppingBag, HeartHandshake, User, UserCog, ClipboardCheck, FolderOpen, type LucideIcon } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../../context/AuthContext';
import { useHub } from '../../../context/HubContext';
import { useNotificationsSafe } from '../../../context/NotificationContext';
import { supabase } from '../../../lib/supabase';
import { NotificationBadge } from '../../ui/NotificationBadge';
import type { HubFeatureTab, NotificationFeature } from '../../../types';

interface UserProfile {
    full_name: string | null;
    avatar_url: string | null;
}

const SPORT_ICONS: Record<string, LucideIcon> = {
    Trophy,
    Music,
    Megaphone,
    Waves,
    Swords
};

// Map tab names to notification feature keys
const TAB_TO_NOTIFICATION: Record<string, NotificationFeature> = {
    'Messages': 'messages',
    'Groups': 'groups',
    'Calendar': 'calendar',
    'Competitions': 'competitions',
    'Scores': 'scores',
    'Skills': 'skills',
    'Assignments': 'assignments',
    'Marketplace': 'marketplace',
    'Resources': 'resources',
};

export function GymnasticsSidebar() {
    const location = useLocation();
    const { hubId } = useParams();
    const { signOut, user } = useAuth();
    const { hasPermission, currentRole, hub, sportConfig } = useHub();
    const notifications = useNotificationsSafe();
    const [isExpanded, setIsExpanded] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Get badge value for a nav item
    // Coaches/owners/directors/admins only see badges for: messages, groups, marketplace
    // Parents/gymnasts see badges for all tabs (assignments, scores, skills, etc. are relevant to them)
    const getBadgeValue = (itemName: string): number | boolean => {
        if (!notifications) return false;
        const feature = TAB_TO_NOTIFICATION[itemName];
        if (!feature) return false;

        // Staff roles only need notifications for messages, groups, and marketplace
        const isStaffRole = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
        if (isStaffRole) {
            const staffRelevantFeatures: NotificationFeature[] = ['messages', 'groups', 'marketplace'];
            if (!staffRelevantFeatures.includes(feature)) {
                return false;
            }
        }

        return notifications.counts[feature];
    };

    // Get badge type for a nav item
    const getBadgeType = (itemName: string): 'count' | 'dot' => {
        return itemName === 'Messages' ? 'count' : 'dot';
    };

    // Fetch user profile
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', user.id)
                .single();
            if (data) {
                setUserProfile(data);
            }
        };
        fetchProfile();
    }, [user]);

    // Get the icon for the current sport
    const SportIcon = SPORT_ICONS[sportConfig.icon] || Trophy;

    const navigation = [
        { name: 'Dashboard', href: `/hub/${hubId}`, icon: LayoutDashboard, permission: 'dashboard', tabId: null },
        { name: 'Roster', href: `/hub/${hubId}/roster`, icon: ClipboardList, permission: 'roster', tabId: 'roster' as HubFeatureTab },
        { name: 'Calendar', href: `/hub/${hubId}/calendar`, icon: CalendarDays, permission: 'calendar', tabId: 'calendar' as HubFeatureTab },
        { name: 'Messages', href: `/hub/${hubId}/messages`, icon: MessageCircle, permission: 'messages', tabId: 'messages' as HubFeatureTab },
        { name: 'Competitions', href: `/hub/${hubId}/competitions`, icon: Trophy, permission: 'competitions', tabId: 'competitions' as HubFeatureTab },
        { name: 'Scores', href: `/hub/${hubId}/scores`, icon: Medal, permission: 'scores', tabId: 'scores' as HubFeatureTab },
        { name: 'Skills', href: `/hub/${hubId}/skills`, icon: Sparkles, permission: 'skills', tabId: 'skills' as HubFeatureTab },
        { name: 'Marketplace', href: `/hub/${hubId}/marketplace`, icon: ShoppingBag, permission: 'marketplace', tabId: 'marketplace' as HubFeatureTab },
        { name: 'Groups', href: `/hub/${hubId}/groups`, icon: Users, permission: 'groups', tabId: 'groups' as HubFeatureTab },
        { name: 'Mentorship', href: `/hub/${hubId}/mentorship`, icon: HeartHandshake, permission: 'mentorship', tabId: 'mentorship' as HubFeatureTab },
        { name: 'Assignments', href: `/hub/${hubId}/assignments`, icon: ClipboardCheck, permission: 'assignments', tabId: 'assignments' as HubFeatureTab },
        { name: 'Resources', href: `/hub/${hubId}/resources`, icon: FolderOpen, permission: 'resources', tabId: 'resources' as HubFeatureTab },
        { name: 'Staff', href: `/hub/${hubId}/staff`, icon: UserCog, permission: 'staff', tabId: 'staff' as HubFeatureTab },
        { name: 'Settings', href: `/hub/${hubId}/settings`, icon: Settings2, permission: 'settings', tabId: null },
    ];

    // Get enabled tabs from hub settings (default to all if not set)
    const enabledTabs = hub?.settings?.enabledTabs;
    const isTabEnabled = (tabId: HubFeatureTab | null): boolean => {
        if (tabId === null) return true;
        if (!enabledTabs) return true;
        return enabledTabs.includes(tabId);
    };

    const filteredNavigation = navigation.filter(item => {
        if (item.name === 'Dashboard') return true;
        if (item.name === 'Settings') {
            return ['owner', 'director', 'admin'].includes(currentRole || '');
        }
        if (item.name === 'Staff') {
            const isStaffRole = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
            return isStaffRole && isTabEnabled(item.tabId);
        }
        if (!isTabEnabled(item.tabId)) return false;
        return hasPermission(item.permission);
    });

    return (
        <div
            className={clsx(
                "flex h-full flex-col transition-all duration-200 ease-out overflow-x-hidden",
                "bg-white border-r border-slate-200",
                isExpanded ? "w-64" : "w-16"
            )}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Header - Back to Overview */}
            <div className="flex h-14 items-center border-b border-slate-200 px-3">
                <Link
                    to="/"
                    className="group flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
                    title={!isExpanded ? "Back to Overview" : undefined}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </div>
                    <div
                        className="flex flex-col ml-3 overflow-hidden whitespace-nowrap"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '200px' : '0px',
                            transition: 'opacity 150ms ease-out, max-width 200ms ease-out'
                        }}
                    >
                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Back to</span>
                        <span className="font-medium text-slate-600 group-hover:text-slate-900 text-sm">Overview</span>
                    </div>
                </Link>
            </div>

            {/* Hub Name */}
            <div className="border-b border-slate-200 px-3 py-3">
                <div className="flex items-center" title={!isExpanded ? hub?.name : undefined}>
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0 rounded-lg bg-mint-100 border border-mint-300">
                        <SportIcon className="h-5 w-5 text-mint-600" />
                    </div>
                    <div
                        className="flex flex-col ml-3 overflow-hidden whitespace-nowrap"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '200px' : '0px',
                            transition: 'opacity 150ms ease-out, max-width 200ms ease-out'
                        }}
                    >
                        <span className="text-sm font-semibold text-slate-900">{hub?.name}</span>
                        <span className="text-[10px] uppercase tracking-wider text-mint-600">{sportConfig.name}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className={clsx(
                "flex-1 overflow-y-auto overflow-x-hidden py-3 px-2",
                isExpanded ? "sidebar-scrollbar" : "scrollbar-hidden"
            )}>
                <nav className="space-y-1">
                    {filteredNavigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        const badgeValue = getBadgeValue(item.name);
                        const badgeType = getBadgeType(item.name);
                        const hasBadge = badgeType === 'count' ? (badgeValue as number) > 0 : badgeValue === true;

                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                title={!isExpanded ? item.name : undefined}
                                className={clsx(
                                    "group flex items-center rounded-lg text-sm font-medium transition-all duration-150 py-2.5 mx-1",
                                    isActive
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                )}
                            >
                                <div className={clsx(
                                    "relative flex h-8 w-8 items-center justify-center flex-shrink-0 ml-1.5",
                                    isActive && "ml-0.5"
                                )}>
                                    {isActive && (
                                        <div className="absolute left-0 w-0.5 h-5 bg-mint-500 rounded-r-full" />
                                    )}
                                    <item.icon
                                        className={clsx(
                                            "h-[18px] w-[18px] transition-all duration-150",
                                            isActive
                                                ? 'text-mint-600'
                                                : 'text-slate-400 group-hover:text-slate-600'
                                        )}
                                        aria-hidden="true"
                                    />
                                    {/* Badge when collapsed */}
                                    {!isExpanded && hasBadge && (
                                        <NotificationBadge
                                            type={badgeType}
                                            value={badgeValue}
                                            collapsed={true}
                                        />
                                    )}
                                </div>
                                <span
                                    className="whitespace-nowrap overflow-hidden ml-2 text-sm"
                                    style={{
                                        opacity: isExpanded ? 1 : 0,
                                        maxWidth: isExpanded ? '150px' : '0px',
                                        transition: 'opacity 150ms ease-out, max-width 200ms ease-out'
                                    }}
                                >
                                    {item.name}
                                </span>
                                {/* Badge when expanded */}
                                {isExpanded && hasBadge && (
                                    <NotificationBadge
                                        type={badgeType}
                                        value={badgeValue}
                                        collapsed={false}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile & Sign Out */}
            <div className="border-t border-slate-200 px-2 py-2 space-y-1">
                {/* User Profile */}
                <Link
                    to="/settings"
                    title={!isExpanded ? userProfile?.full_name || 'Profile' : undefined}
                    className="group flex items-center rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all duration-150 py-2.5 mx-1"
                >
                    <div className="flex h-8 w-8 items-center justify-center flex-shrink-0 ml-1.5">
                        {userProfile?.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt={userProfile.full_name || 'User'}
                                className="h-7 w-7 rounded-full object-cover ring-2 ring-slate-200 group-hover:ring-mint-500/50 transition-all"
                            />
                        ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 group-hover:bg-slate-200">
                                <User className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                    <span
                        className="whitespace-nowrap overflow-hidden ml-2 truncate text-sm"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '150px' : '0px',
                            transition: 'opacity 150ms ease-out, max-width 200ms ease-out'
                        }}
                    >
                        {userProfile?.full_name || 'Profile'}
                    </span>
                </Link>

                {/* Sign Out */}
                <button
                    onClick={() => signOut()}
                    title={!isExpanded ? "Sign out" : undefined}
                    className="group flex w-full items-center rounded-lg text-sm font-medium text-slate-500 hover:bg-error-100 hover:text-error-600 transition-all duration-150 py-2.5 mx-1"
                >
                    <div className="flex h-8 w-8 items-center justify-center flex-shrink-0 ml-1.5">
                        <LogOut
                            className="h-[18px] w-[18px] text-slate-400 group-hover:text-error-600 transition-colors"
                            aria-hidden="true"
                        />
                    </div>
                    <span
                        className="whitespace-nowrap overflow-hidden ml-2 text-sm"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '150px' : '0px',
                            transition: 'opacity 150ms ease-out, max-width 200ms ease-out'
                        }}
                    >
                        Sign out
                    </span>
                </button>
            </div>
        </div>
    );
}
