import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, CalendarDays, MessageCircle, Trophy, Settings2, LogOut, ArrowLeft, ClipboardList, Music, Megaphone, Waves, Swords, Medal, Sparkles, ShoppingBag, HeartHandshake, User, type LucideIcon } from 'lucide-react';
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

    // Get sport-specific color classes
    const getSportColors = (color: string) => {
        const colorMap: Record<string, { icon: string; text: string }> = {
            purple: { icon: 'text-purple-500', text: 'text-purple-600' },
            pink: { icon: 'text-pink-500', text: 'text-pink-600' },
            red: { icon: 'text-red-500', text: 'text-red-600' },
            blue: { icon: 'text-blue-500', text: 'text-blue-600' },
            amber: { icon: 'text-amber-500', text: 'text-amber-600' }
        };
        return colorMap[color] || colorMap.purple;
    };

    const sportColors = getSportColors(sportConfig.color);

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
        // First check if tab is enabled at the hub level
        if (!isTabEnabled(item.tabId)) return false;

        if (item.name === 'Dashboard') return true;
        if (item.name === 'Settings') {
            return ['owner', 'director', 'admin'].includes(currentRole || '');
        }
        return hasPermission(item.permission);
    });

    return (
        <div
            className={clsx(
                "flex h-full flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out overflow-x-hidden",
                isExpanded ? "w-64" : "w-16"
            )}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Header */}
            <div className="flex h-16 items-center border-b border-slate-200 px-3">
                <Link
                    to="/"
                    className="group flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
                    title={!isExpanded ? "Back to Overview" : undefined}
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors flex-shrink-0">
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
                        <span className="text-xs font-normal text-slate-400 group-hover:text-brand-500">Back to</span>
                        <span className="font-semibold text-slate-700 group-hover:text-brand-700">Overview</span>
                    </div>
                </Link>
            </div>

            {/* Hub Name */}
            <div className="border-b border-slate-100 px-3 py-3">
                <div className="flex items-center" title={!isExpanded ? hub?.name : undefined}>
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                        <SportIcon className={`h-5 w-5 ${sportColors.icon}`} />
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
                        <span className="text-sm font-semibold text-slate-900">{hub?.name}</span>
                        <span className={`text-xs ${sportColors.text}`}>{sportConfig.name}</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className={clsx(
                "flex-1 overflow-y-auto overflow-x-hidden py-4 px-3",
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
                                    isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                                    'group flex items-center rounded-md text-sm font-medium transition-colors py-2'
                                )}
                            >
                                <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                                    <item.icon
                                        className={clsx(
                                            isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-500',
                                            'h-5 w-5'
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
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* User Profile & Sign Out */}
            <div className="border-t border-slate-200 px-3 py-2 space-y-1">
                {/* User Profile */}
                <Link
                    to="/settings"
                    title={!isExpanded ? userProfile?.full_name || 'Profile' : undefined}
                    className="group flex items-center rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors py-2"
                >
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                        {userProfile?.avatar_url ? (
                            <img
                                src={userProfile.avatar_url}
                                alt={userProfile.full_name || 'User'}
                                className="h-8 w-8 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600">
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
                    className="group flex w-full items-center rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors py-2"
                >
                    <div className="flex h-10 w-10 items-center justify-center flex-shrink-0">
                        <LogOut
                            className="h-5 w-5 text-slate-400 group-hover:text-slate-500"
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
        </div>
    );
}
