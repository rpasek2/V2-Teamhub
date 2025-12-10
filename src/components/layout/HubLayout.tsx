import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HubProvider } from '../../context/HubContext';
import { PageLoader } from '../ui/PageLoader';

export function HubLayout() {
    return (
        <HubProvider>
            <div className="flex h-screen overflow-hidden bg-tungsten-100 grid-pattern">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8">
                    <Suspense fallback={<PageLoader />}>
                        <Outlet />
                    </Suspense>
                </main>
            </div>
        </HubProvider>
    );
}
