import { LayoutDashboard, Users, CalendarDays, MessageCircle, Trophy, Settings2, LogOut, ArrowLeft, ClipboardList } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useHub } from '../../context/HubContext';

export function Sidebar() {
    const location = useLocation();
    const { hubId } = useParams();
    const { signOut } = useAuth();
    const { hasPermission, currentRole } = useHub();

    const navigation = [
        { name: 'Dashboard', href: `/hub/${hubId}`, icon: LayoutDashboard, permission: 'dashboard' },
        { name: 'Roster', href: `/hub/${hubId}/roster`, icon: ClipboardList, permission: 'roster' },
        { name: 'Calendar', href: `/hub/${hubId}/calendar`, icon: CalendarDays, permission: 'calendar' },
        { name: 'Messages', href: `/hub/${hubId}/messages`, icon: MessageCircle, permission: 'messages' },
        { name: 'Competitions', href: `/hub/${hubId}/competitions`, icon: Trophy, permission: 'competitions' },
        { name: 'Groups', href: `/hub/${hubId}/groups`, icon: Users, permission: 'groups' },
        { name: 'Settings', href: `/hub/${hubId}/settings`, icon: Settings2, permission: 'settings' },
    ];

    const filteredNavigation = navigation.filter(item => {
        if (item.name === 'Dashboard') return true; // Always show dashboard
        if (item.name === 'Settings') {
            // Only Owners, Directors, and Admins can see Hub Settings
            return ['owner', 'director', 'admin'].includes(currentRole || '');
        }
        // For other items, check permissions
        // Note: hasPermission returns true for 'own' scope as well, which is what we want
        // (e.g. Parents can see Roster if they have 'view own' permission)
        return hasPermission(item.permission);
    });

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200">
            <div className="flex h-16 items-center px-4 border-b border-slate-200">
                <Link
                    to="/"
                    className="group flex items-center text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors"
                >
                    <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs font-normal text-slate-400 group-hover:text-brand-500">Back to</span>
                        <span className="font-semibold text-slate-700 group-hover:text-brand-700">Overview</span>
                    </div>
                </Link>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-3">
                    {filteredNavigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                className={clsx(
                                    isActive
                                        ? 'bg-brand-50 text-brand-700'
                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                                    'group flex items-center rounded-md px-3 py-2 text-sm font-medium'
                                )}
                            >
                                <item.icon
                                    className={clsx(
                                        isActive ? 'text-brand-700' : 'text-slate-400 group-hover:text-slate-500',
                                        'mr-3 h-5 w-5 flex-shrink-0'
                                    )}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="border-t border-slate-200 p-4">
                <button
                    onClick={() => signOut()}
                    className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                    <LogOut
                        className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-slate-500"
                        aria-hidden="true"
                    />
                    Sign out
                </button>
            </div>
        </div>
    );
}
