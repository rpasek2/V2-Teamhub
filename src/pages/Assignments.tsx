import { useState, useEffect } from 'react';
import { LayoutDashboard, Edit3, FileText } from 'lucide-react';
import { useHub } from '../context/HubContext';
import { useNotifications } from '../context/NotificationContext';
import {
    CoachDashboard,
    CoachMode,
    TemplatesManager,
    ParentDashboard,
    ParentAssignmentView
} from '../components/assignments';
import type { GymnastAssignment } from '../types';

type CoachTab = 'dashboard' | 'coach-mode' | 'templates';

export function Assignments() {
    const { hub, currentRole } = useHub();
    const { markAsViewed } = useNotifications();
    const [coachTab, setCoachTab] = useState<CoachTab>('dashboard');
    const [parentViewingAssignment, setParentViewingAssignment] = useState<GymnastAssignment | null>(null);

    const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');

    // Mark assignments as viewed when page loads
    useEffect(() => {
        if (hub) {
            markAsViewed('assignments');
        }
    }, [hub, markAsViewed]);

    // Parent View
    if (!isStaff) {
        if (parentViewingAssignment) {
            return (
                <div className="animate-fade-in">
                    <ParentAssignmentView
                        assignment={parentViewingAssignment}
                        onBack={() => setParentViewingAssignment(null)}
                    />
                </div>
            );
        }

        return (
            <div className="animate-fade-in">
                <ParentDashboard
                    onAssignmentClick={(assignment) => setParentViewingAssignment(assignment)}
                />
            </div>
        );
    }

    // Staff/Coach View
    return (
        <div className="animate-fade-in">
            <div className="sm:flex sm:items-center sm:justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Create and manage gymnast training assignments
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 rounded-lg bg-slate-100 p-1 mb-6">
                <button
                    onClick={() => setCoachTab('dashboard')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all flex-1 justify-center ${
                        coachTab === 'dashboard'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                    onClick={() => setCoachTab('coach-mode')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all flex-1 justify-center ${
                        coachTab === 'coach-mode'
                            ? 'bg-mint-100 text-mint-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                >
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Coach Mode</span>
                </button>
                <button
                    onClick={() => setCoachTab('templates')}
                    className={`flex items-center gap-2 rounded-md py-2 px-4 text-sm font-medium transition-all flex-1 justify-center ${
                        coachTab === 'templates'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                >
                    <FileText className="w-4 h-4" />
                    <span className="hidden sm:inline">Templates</span>
                </button>
            </div>

            {/* Tab Content */}
            {coachTab === 'dashboard' && (
                <CoachDashboard />
            )}

            {coachTab === 'coach-mode' && (
                <CoachMode />
            )}

            {coachTab === 'templates' && (
                <TemplatesManager />
            )}
        </div>
    );
}
