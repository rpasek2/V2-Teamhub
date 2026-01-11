import { useState } from 'react';
import { UserCheck, BarChart3 } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { DailyAttendanceTab } from '../components/attendance/DailyAttendanceTab';
import { AttendanceMetricsTab } from '../components/attendance/AttendanceMetricsTab';

type AttendanceTab = 'daily' | 'metrics';

export function Attendance() {
    const { currentRole } = useHub();
    const [activeTab, setActiveTab] = useState<AttendanceTab>('daily');

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
    const canManage = ['owner', 'director', 'admin'].includes(currentRole || '');

    if (!isStaff) {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-slate-400">You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
                        <p className="text-sm text-slate-500">Track daily attendance and view metrics</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('daily')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                        activeTab === 'daily'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <UserCheck className="w-4 h-4" />
                    Daily Attendance
                </button>
                <button
                    onClick={() => setActiveTab('metrics')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
                        activeTab === 'metrics'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <BarChart3 className="w-4 h-4" />
                    Metrics
                </button>
            </div>

            {/* Tab Content */}
            <div className="relative">
                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'daily'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    <DailyAttendanceTab canManage={canManage} />
                </div>

                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'metrics'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    <AttendanceMetricsTab />
                </div>
            </div>
        </div>
    );
}

export default Attendance;
