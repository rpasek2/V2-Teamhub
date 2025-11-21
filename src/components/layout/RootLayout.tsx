import { Outlet } from 'react-router-dom';
import { LayoutDashboard, Settings2, LogOut } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '../../context/AuthContext';

const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Settings', href: '/settings', icon: Settings2 },
];

export function RootLayout() {
    const location = useLocation();
    const { signOut } = useAuth();

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50">
            {/* Minimal Sidebar */}
            <div className="flex h-full w-64 flex-col bg-white border-r border-slate-200">
                <div className="flex h-16 items-center px-6 border-b border-slate-200">
                    <span className="text-xl font-bold text-brand-600">Teamhub</span>
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

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <Outlet />
            </main>
        </div>
    );
}
