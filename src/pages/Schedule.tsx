import { useState, useEffect, useMemo } from 'react';
import { Calendar, Grid3X3 } from 'lucide-react';
import { useRoleChecks } from '../hooks/useRoleChecks';
import { useHub } from '../context/HubContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { WeeklyScheduleTab } from '../components/schedule/WeeklyScheduleTab';
import { DailyRotationTab } from '../components/schedule/DailyRotationTab';
import type { GymnastProfile } from '../types';

type ScheduleTab = 'weekly' | 'rotation';

export interface ScheduleFilter {
    level: string;
    schedule_group: string | null;
}

export function Schedule() {
    const { canManage, isAthlete, isParent } = useRoleChecks();
    const { getPermissionScope, linkedGymnasts, hub } = useHub();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ScheduleTab>('weekly');
    const [athleteProfile, setAthleteProfile] = useState<GymnastProfile | null>(null);
    const [athleteProfileLoaded, setAthleteProfileLoaded] = useState(false);

    const scheduleScope = getPermissionScope('schedule');

    // For athletes with 'own' scope, fetch their gymnast profile
    useEffect(() => {
        if (scheduleScope === 'own' && isAthlete && user && hub) {
            setAthleteProfileLoaded(false);
            supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hub.id)
                .eq('user_id', user.id)
                .maybeSingle()
                .then(({ data }) => {
                    setAthleteProfile(data);
                    setAthleteProfileLoaded(true);
                });
        }
    }, [scheduleScope, isAthlete, user, hub]);

    // Build schedule filter for 'own' scope
    // null = no filtering (staff with 'all'), array = filter to these level/groups
    const scheduleFilters = useMemo((): ScheduleFilter[] | null => {
        if (scheduleScope !== 'own') return null;

        if (isParent) {
            return linkedGymnasts.map(g => ({ level: g.level, schedule_group: g.schedule_group }));
        }
        if (isAthlete) {
            if (!athleteProfileLoaded) return []; // still loading — show nothing until resolved
            if (!athleteProfile) return [];       // no profile found — show nothing
            return [{ level: athleteProfile.level, schedule_group: athleteProfile.schedule_group }];
        }
        return [];
    }, [scheduleScope, isParent, isAthlete, linkedGymnasts, athleteProfile, athleteProfileLoaded]);

    if (getPermissionScope('schedule') === 'none') {
        return (
            <div className="flex items-center justify-center h-64">
                <p className="text-faint">You don't have permission to view this page.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-heading">Schedule</h1>
                        <p className="text-sm text-muted">Manage practice times and daily rotations</p>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-surface-hover rounded-lg p-1 w-fit">
                <button
                    onClick={() => setActiveTab('weekly')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'weekly'
                            ? 'bg-surface text-heading shadow-sm'
                            : 'text-subtle hover:text-heading'
                    }`}
                >
                    <Calendar className="w-4 h-4" />
                    Weekly Schedule
                </button>
                <button
                    onClick={() => setActiveTab('rotation')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'rotation'
                            ? 'bg-surface text-heading shadow-sm'
                            : 'text-subtle hover:text-heading'
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
                    <WeeklyScheduleTab canManage={canManage} scheduleFilters={scheduleFilters} />
                </div>

                <div
                    className={`transition-all duration-200 ease-in-out ${
                        activeTab === 'rotation'
                            ? 'opacity-100 translate-y-0'
                            : 'opacity-0 absolute inset-0 pointer-events-none -translate-y-2'
                    }`}
                >
                    <DailyRotationTab canManage={canManage} scheduleFilters={scheduleFilters} />
                </div>
            </div>
        </div>
    );
}

export default Schedule;
