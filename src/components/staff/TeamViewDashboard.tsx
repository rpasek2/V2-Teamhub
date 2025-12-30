import { useState, useEffect } from 'react';
import { Calendar, CheckSquare, BarChart3, Loader2 } from 'lucide-react';
import { useAllStaffData } from '../../hooks/useStaffBulk';
import { TeamScheduleView } from './TeamScheduleView';
import { TeamTasksView } from './TeamTasksView';

interface TeamViewDashboardProps {
    hubId: string;
}

type SubTab = 'schedules' | 'tasks' | 'overview';

export function TeamViewDashboard({ hubId }: TeamViewDashboardProps) {
    const [activeSubTab, setActiveSubTab] = useState<SubTab>('schedules');
    const { staffData, loading, refetch } = useAllStaffData(hubId);

    useEffect(() => {
        refetch();
    }, [hubId]);

    // Calculate overview stats
    const today = new Date().getDay();
    const scheduledToday = staffData.filter(staff =>
        staff.schedules.some(s => s.day_of_week === today)
    ).length;

    const pendingTasks = staffData.reduce(
        (sum, staff) => sum + staff.tasks.filter(t => t.status !== 'completed').length,
        0
    );

    const overdueTasks = staffData.reduce(
        (sum, staff) => sum + staff.tasks.filter(t => {
            if (t.status === 'completed' || !t.due_date) return false;
            return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
        }).length,
        0
    );

    const tabs = [
        { id: 'schedules' as SubTab, label: 'Schedules', icon: Calendar },
        { id: 'tasks' as SubTab, label: 'Tasks', icon: CheckSquare },
        { id: 'overview' as SubTab, label: 'Overview', icon: BarChart3 },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-mint-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-4">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSubTab === tab.id
                                ? 'bg-mint-100 text-mint-700'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeSubTab === 'schedules' && (
                <TeamScheduleView
                    hubId={hubId}
                    staffData={staffData}
                    onDataChanged={refetch}
                />
            )}

            {activeSubTab === 'tasks' && (
                <TeamTasksView
                    hubId={hubId}
                    staffData={staffData}
                    onDataChanged={refetch}
                />
            )}

            {activeSubTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-teal-100 rounded-lg">
                                    <Calendar className="w-6 h-6 text-teal-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{scheduledToday}</p>
                                    <p className="text-sm text-slate-500">Working Today</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-100 rounded-lg">
                                    <CheckSquare className="w-6 h-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{pendingTasks}</p>
                                    <p className="text-sm text-slate-500">Pending Tasks</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                            <div className="flex items-center gap-3">
                                <div className={`p-3 rounded-lg ${overdueTasks > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                                    <CheckSquare className={`w-6 h-6 ${overdueTasks > 0 ? 'text-red-600' : 'text-green-600'}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-900">{overdueTasks}</p>
                                    <p className="text-sm text-slate-500">Overdue Tasks</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Staff Summary */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-900">Staff Summary</h3>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {staffData.map(staff => {
                                const activeTasks = staff.tasks.filter(t => t.status !== 'completed').length;
                                const staffOverdue = staff.tasks.filter(t => {
                                    if (t.status === 'completed' || !t.due_date) return false;
                                    return new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                                }).length;
                                const isWorkingToday = staff.schedules.some(s => s.day_of_week === today);

                                return (
                                    <div key={staff.user_id} className="px-6 py-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {staff.profile?.avatar_url ? (
                                                <img
                                                    src={staff.profile.avatar_url}
                                                    alt=""
                                                    loading="lazy"
                                                    className="w-10 h-10 rounded-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                    <span className="text-slate-500 font-medium">
                                                        {staff.profile?.full_name?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-medium text-slate-900">
                                                    {staff.profile?.full_name || 'Unknown'}
                                                </p>
                                                <p className="text-sm text-slate-500 capitalize">
                                                    {staff.staff_profile?.title || staff.role}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className={`px-2 py-1 rounded-full ${
                                                isWorkingToday
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {isWorkingToday ? 'Working today' : 'Off today'}
                                            </span>
                                            {activeTasks > 0 && (
                                                <span className={`px-2 py-1 rounded-full ${
                                                    staffOverdue > 0
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {activeTasks} task{activeTasks !== 1 ? 's' : ''}
                                                    {staffOverdue > 0 && ` (${staffOverdue} overdue)`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
