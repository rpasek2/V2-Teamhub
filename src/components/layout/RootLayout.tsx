import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings2, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Settings', href: '/settings', icon: Settings2 },
];

export function RootLayout() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [organization, setOrganization] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrganization = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('profiles')
                .select('organization')
                .eq('id', user.id)
                .single();
            if (data?.organization) {
                setOrganization(data.organization);
            }
        };
        fetchOrganization();
    }, [user]);

    return (
        <div className="flex h-screen overflow-hidden bg-surface-alt">
            {/* Minimal Sidebar */}
            <div className="flex h-full w-64 flex-col bg-surface border-r border-line">
                <div className="flex flex-col justify-center h-16 px-6 border-b border-line">
                    <span className="text-xl font-bold text-accent-600">Teamhub</span>
                    {organization && (
                        <span className="text-xs text-muted truncate">{organization}</span>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <nav className="space-y-1 px-3">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={clsx(
                                        isActive
                                            ? 'bg-accent-50 text-accent-700'
                                            : 'text-body hover:bg-surface-hover hover:text-heading',
                                        'group flex items-center rounded-md px-3 py-2 text-sm font-medium'
                                    )}
                                >
                                    <item.icon
                                        className={clsx(
                                            isActive ? 'text-accent-700' : 'text-faint group-hover:text-muted',
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
                <div className="border-t border-line p-4">
                    <button
                        onClick={() => signOut()}
                        className="group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-body hover:bg-surface-hover hover:text-heading"
                    >
                        <LogOut
                            className="mr-3 h-5 w-5 flex-shrink-0 text-faint group-hover:text-muted"
                            aria-hidden="true"
                        />
                        Sign out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}
