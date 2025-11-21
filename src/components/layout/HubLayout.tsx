import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HubProvider } from '../../context/HubContext';

export function HubLayout() {
    return (
        <HubProvider>
            <div className="flex h-screen overflow-hidden bg-slate-50">
                <Sidebar />
                <main className="flex-1 overflow-y-auto p-8">
                    <Outlet />
                </main>
            </div>
        </HubProvider>
    );
}
