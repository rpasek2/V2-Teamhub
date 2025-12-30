import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useHub } from '../../context/HubContext';
import { useAssignmentsByGymnasts } from '../../hooks/useAssignments';
import { DateNavigator } from './DateNavigator';
import { AssignmentCard } from './AssignmentCard';
import { ProgressBar, ProgressRing } from './ProgressBar';
import { calculateEventProgress } from './EventCard';
import type { GymnastAssignment, AssignmentEventType } from '../../types';

interface ParentDashboardProps {
    onAssignmentClick?: (assignment: GymnastAssignment) => void;
}

export function ParentDashboard({ onAssignmentClick }: ParentDashboardProps) {
    const { linkedGymnasts } = useHub();
    const [date, setDate] = useState(new Date());

    const dateString = format(date, 'yyyy-MM-dd');
    const gymnastIds = useMemo(() => linkedGymnasts.map(g => g.id), [linkedGymnasts]);

    const { assignments, loading } = useAssignmentsByGymnasts({
        gymnastIds,
        date: dateString
    });

    // Calculate stats for linked gymnasts only
    const stats = useMemo(() => {
        let totalCompleted = 0;
        let totalExercises = 0;

        assignments.forEach(assignment => {
            const eventContents: Partial<Record<AssignmentEventType, string>> = {
                vault: assignment.vault,
                bars: assignment.bars,
                beam: assignment.beam,
                floor: assignment.floor,
                strength: assignment.strength,
                flexibility: assignment.flexibility,
                conditioning: assignment.conditioning
            };

            const progress = calculateEventProgress(assignment.completed_items || {}, eventContents);
            totalCompleted += progress.completed;
            totalExercises += progress.total;
        });

        return {
            totalCompleted,
            totalExercises,
            percentage: totalExercises > 0 ? Math.round((totalCompleted / totalExercises) * 100) : 0
        };
    }, [assignments]);

    // Get gymnasts without assignments today
    const gymnastsWithAssignments = new Set(assignments.map(a => a.gymnast_profile_id));
    const gymnastsWithoutAssignments = linkedGymnasts.filter(g => !gymnastsWithAssignments.has(g.id));

    if (linkedGymnasts.length === 0) {
        return (
            <div className="text-center py-16 card">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                </div>
                <h3 className="font-medium text-slate-900 mb-1">No gymnasts linked</h3>
                <p className="text-sm text-slate-500">
                    Contact your hub administrator to link your gymnast profiles
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-900">Today's Training</h2>
                    <p className="text-sm text-slate-500">
                        {format(date, 'EEEE, MMMM d, yyyy')}
                    </p>
                </div>
                <DateNavigator date={date} onDateChange={setDate} />
            </div>

            {/* Overall Progress Card */}
            {assignments.length > 0 && (
                <div className="card p-6">
                    <div className="flex items-center gap-6">
                        <ProgressRing
                            completed={stats.totalCompleted}
                            total={stats.totalExercises}
                            size={80}
                            strokeWidth={6}
                        />
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-900 mb-1">
                                Overall Progress
                            </h3>
                            <p className="text-sm text-slate-500 mb-3">
                                {stats.totalCompleted} of {stats.totalExercises} exercises completed
                            </p>
                            <ProgressBar
                                completed={stats.totalCompleted}
                                total={stats.totalExercises}
                                showLabel={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Assignments */}
            {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2].map(i => (
                        <div key={i} className="card p-5 animate-pulse">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-slate-200" />
                                <div className="flex-1">
                                    <div className="h-4 bg-slate-200 rounded w-24 mb-2" />
                                    <div className="h-3 bg-slate-200 rounded w-16" />
                                </div>
                            </div>
                            <div className="h-2 bg-slate-200 rounded mb-4" />
                            <div className="flex gap-2">
                                <div className="h-6 bg-slate-200 rounded-full w-16" />
                                <div className="h-6 bg-slate-200 rounded-full w-16" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : assignments.length === 0 ? (
                <div className="text-center py-12 card">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <h3 className="font-medium text-slate-900 mb-1">No assignments today</h3>
                    <p className="text-sm text-slate-500">
                        {linkedGymnasts.length === 1
                            ? "Your gymnast doesn't have any training assigned for today"
                            : "Your gymnasts don't have any training assigned for today"
                        }
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                    {assignments.map(assignment => {
                        const gymnast = linkedGymnasts.find(g => g.id === assignment.gymnast_profile_id);

                        return (
                            <AssignmentCard
                                key={assignment.id}
                                assignment={assignment}
                                gymnast={gymnast}
                                onClick={() => onAssignmentClick?.(assignment)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Rest Day Section */}
            {gymnastsWithoutAssignments.length > 0 && assignments.length > 0 && (
                <div className="border-t border-slate-200 pt-6">
                    <h3 className="text-sm font-medium text-slate-500 mb-3">Rest Day</h3>
                    <div className="flex flex-wrap gap-3">
                        {gymnastsWithoutAssignments.map(gymnast => (
                            <div
                                key={gymnast.id}
                                className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg"
                            >
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-500">
                                    {gymnast.first_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm text-slate-500">
                                    {gymnast.first_name} {gymnast.last_name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
