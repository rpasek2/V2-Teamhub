import { useState } from 'react';
import { Calendar, Grid3X3 } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { WeeklyScheduleTab } from '../components/schedule/WeeklyScheduleTab';
import { DailyRotationTab } from '../components/schedule/DailyRotationTab';

type ScheduleTab = 'weekly' | 'rotation';

export function Schedule() {
    const { currentRole } = useHub();
    const [activeTab, setActiveTab] = useState<ScheduleTab>('weekly');

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
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Schedule</h1>
                        <p className="text-sm text-slate-500">Manage practice times and daily rotations</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'weekly'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    Weekly Schedule
                </button>
                <button
                    onClick={() => setActiveTab('rotation')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'rotation'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Grid3X3 className="w-4 h-4" />
                    Daily Rotations
                </button>
            </div>

            {/* Tab Content */}
            <div className="relative">
                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'weekly'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    <WeeklyScheduleTab canManage={canManage} />
                </div>

                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'rotation'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    <DailyRotationTab canManage={canManage} />
                </div>
            </div>
        </div>
    );
}

export default Schedule;
