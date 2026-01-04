import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HubProvider } from '../../context/HubContext';
import { NotificationProvider } from '../../context/NotificationContext';
import { PageLoader } from '../ui/PageLoader';

export function HubLayout() {
    return (
        <HubProvider>
            <NotificationProvider>
                <div className="flex h-screen overflow-hidden bg-slate-50">
                    <Sidebar />
                    <main className="flex-1 overflow-y-auto p-8">
                        <Suspense fallback={<PageLoader />}>
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </NotificationProvider>
        </HubProvider>
    );
}
