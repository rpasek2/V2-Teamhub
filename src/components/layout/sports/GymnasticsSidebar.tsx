import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CalendarDays, MessageCircle, Trophy, Settings2, LogOut, ArrowLeft, ClipboardList, Music, Megaphone, Waves, Swords, Medal, Sparkles, ShoppingBag, HeartHandshake, User, UserCog, ClipboardCheck, FolderOpen, type LucideIcon } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../../context/AuthContext';
import { useHub } from '../../../context/HubContext';
import { supabase } from '../../../lib/supabase';
import type { HubFeatureTab } from '../../../types';

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

export function GymnasticsSidebar() {
    const location = useLocation();
    const { hubId } = useParams();
    const { signOut, user } = useAuth();
    const { hasPermission, currentRole, hub, sportConfig } = useHub();
    const [isExpanded, setIsExpanded] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
        if (tabId === null) return true; // Dashboard and Settings are always available
        if (!enabledTabs) return true; // If not configured, all tabs are enabled
        return enabledTabs.includes(tabId);
    };

    const filteredNavigation = navigation.filter(item => {
        // Dashboard and Settings are always available (tabId is null)
        if (item.name === 'Dashboard') return true;
        if (item.name === 'Settings') {
            return ['owner', 'director', 'admin'].includes(currentRole || '');
        }
        // Staff tab is only visible to staff roles (must also be enabled in settings)
        if (item.name === 'Staff') {
            const isStaffRole = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
            return isStaffRole && isTabEnabled(item.tabId);
        }

        // For other tabs, check if tab is enabled at the hub level
        if (!isTabEnabled(item.tabId)) return false;

        return hasPermission(item.permission);
    });

    return (
        <div
            className={clsx(
                "flex h-full flex-col transition-all duration-300 ease-in-out overflow-x-hidden relative",
                "bg-gradient-to-b from-canopy-950 via-canopy-900 to-canopy-950",
                isExpanded ? "w-64" : "w-16"
            )}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            {/* Subtle pattern overlay */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
            />

            {/* Header - Back to Overview */}
            <div className="relative flex h-16 items-center border-b border-canopy-800/50 px-3">
                <Link
                    to="/"
                    className="group flex items-center text-sm font-medium text-canopy-300 hover:text-canopy-100 transition-colors"
                    title={!isExpanded ? "Back to Overview" : undefined}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-canopy-800/50 group-hover:bg-canopy-700/50 transition-all duration-200 flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </div>
                    <div
                        className="flex flex-col ml-3 overflow-hidden whitespace-nowrap"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '200px' : '0px',
                            transition: isExpanded
                                ? 'opacity 200ms ease-in-out, max-width 300ms ease-in-out'
                                : 'opacity 150ms ease-in-out, max-width 300ms ease-in-out 100ms'
                        }}
                    >
                        <span className="text-xs font-mono uppercase tracking-wider text-canopy-500 group-hover:text-canopy-400">Back to</span>
                        <span className="font-display font-semibold text-canopy-200 group-hover:text-canopy-100">Overview</span>
                    </div>
                </Link>
            </div>

            {/* Hub Name with Sport Badge */}
            <div className="relative border-b border-canopy-800/50 px-3 py-3">
                <div className="flex items-center" title={!isExpanded ? hub?.name : undefined}>
                    <div className={clsx(
                        "flex h-10 w-10 items-center justify-center flex-shrink-0 rounded-lg",
                        "bg-gradient-to-br from-arcane-500/20 to-arcane-600/10 border border-arcane-500/30"
                    )}>
                        <SportIcon className="h-5 w-5 text-arcane-400" />
                    </div>
                    <div
                        className="flex flex-col ml-3 overflow-hidden whitespace-nowrap"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '200px' : '0px',
                            transition: isExpanded
                                ? 'opacity 200ms ease-in-out, max-width 300ms ease-in-out'
                                : 'opacity 150ms ease-in-out, max-width 300ms ease-in-out 100ms'
                        }}
                    >
                        <span className="font-display text-sm font-semibold text-canopy-100">{hub?.name}</span>
                        <span className="text-xs font-mono uppercase tracking-wider text-arcane-400">{sportConfig.name}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className={clsx(
                "relative flex-1 overflow-y-auto overflow-x-hidden py-4 px-2",
                isExpanded ? "sidebar-scrollbar" : "scrollbar-hidden"
            )}>
                <nav className="space-y-1">
                    {filteredNavigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                title={!isExpanded ? item.name : undefined}
                                className={clsx(
                                    "group flex items-center rounded-lg text-sm font-medium transition-all duration-200 py-2 mx-1",
                                    isActive
                                        ? 'bg-canopy-700/50 text-canopy-100 shadow-lg shadow-canopy-900/50 border-l-2 border-arcane-400'
                                        : 'text-canopy-300 hover:bg-canopy-800/50 hover:text-canopy-100'
                                )}
                            >
                                <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                                    <item.icon
                                        className={clsx(
                                            "h-5 w-5 transition-all duration-200",
                                            isActive
                                                ? 'text-arcane-400'
                                                : 'text-canopy-500 group-hover:text-canopy-300 group-hover:scale-110'
                                        )}
                                        aria-hidden="true"
                                    />
                                </div>
                                <span
                                    className="whitespace-nowrap overflow-hidden ml-1"
                                    style={{
                                        opacity: isExpanded ? 1 : 0,
                                        maxWidth: isExpanded ? '150px' : '0px',
                                        transition: isExpanded
                                            ? 'opacity 200ms ease-in-out, max-width 300ms ease-in-out'
                                            : 'opacity 150ms ease-in-out, max-width 300ms ease-in-out 100ms'
                                    }}
                                >
                                    {item.name}
                                </span>
                                {/* Active indicator dot */}
                                {isActive && (
                                    <span
                                        className="ml-auto mr-3 w-1.5 h-1.5 rounded-full bg-arcane-400 animate-glow-pulse"
                                        style={{
                                            opacity: isExpanded ? 1 : 0,
                                            transition: 'opacity 200ms ease-in-out'
                                        }}
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile & Sign Out */}
            <div className="relative border-t border-canopy-800/50 px-2 py-2 space-y-1">
                {/* User Profile */}
                <Link
                    to="/settings"
                    title={!isExpanded ? userProfile?.full_name || 'Profile' : undefined}
                    className="group flex items-center rounded-lg text-sm font-medium text-canopy-300 hover:bg-canopy-800/50 hover:text-canopy-100 transition-all duration-200 py-2 mx-1"
                >
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                        {userProfile?.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt={userProfile.full_name || 'User'}
                                className="h-8 w-8 rounded-full object-cover ring-2 ring-canopy-600 group-hover:ring-arcane-500/50 transition-all duration-200"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-canopy-600 to-canopy-700 text-canopy-200 ring-2 ring-canopy-500/30 group-hover:ring-arcane-500/50 transition-all duration-200">
                                <User className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                    <span
                        className="whitespace-nowrap overflow-hidden ml-1 truncate"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '150px' : '0px',
                            transition: isExpanded
                                ? 'opacity 200ms ease-in-out, max-width 300ms ease-in-out'
                                : 'opacity 150ms ease-in-out, max-width 300ms ease-in-out 100ms'
                        }}
                    >
                        {userProfile?.full_name || 'Profile'}
                    </span>
                </Link>

                {/* Sign Out */}
                <button
                    onClick={() => signOut()}
                    title={!isExpanded ? "Sign out" : undefined}
                    className="group flex w-full items-center rounded-lg text-sm font-medium text-canopy-400 hover:bg-error-500/10 hover:text-error-400 transition-all duration-200 py-2 mx-1"
                >
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                        <LogOut
                            className="h-5 w-5 text-canopy-500 group-hover:text-error-400 transition-colors"
                            aria-hidden="true"
                        />
                    </div>
                    <span
                        className="whitespace-nowrap overflow-hidden ml-1"
                        style={{
                            opacity: isExpanded ? 1 : 0,
                            maxWidth: isExpanded ? '150px' : '0px',
                            transition: isExpanded
                                ? 'opacity 200ms ease-in-out, max-width 300ms ease-in-out'
                                : 'opacity 150ms ease-in-out, max-width 300ms ease-in-out 100ms'
                        }}
                    >
                        Sign out
                    </span>
                </button>
            </div>

            {/* Bottom decorative element */}
            <div className="h-1 bg-gradient-to-r from-transparent via-arcane-500/50 to-transparent" />
        </div>
    );
}
