import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ScheduleBlock {
    id: string;
    staff_user_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    role_label: string;
}

export interface Task {
    id: string;
    staff_user_id: string;
    title: string;
    description: string | null;
    due_date: string | null;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'pending' | 'in_progress' | 'completed';
    assigned_by: string | null;
    completed_at: string | null;
    created_at: string;
}

export interface StaffWithData {
    user_id: string;
    role: string;
    profile: {
        id: string;
        full_name: string;
        email: string;
        avatar_url: string | null;
    };
    staff_profile?: {
        id: string;
        title: string | null;
    } | null;
    schedules: ScheduleBlock[];
    tasks: Task[];
}

interface UseAllStaffDataReturn {
    staffData: StaffWithData[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useAllStaffData(hubId: string | undefined): UseAllStaffDataReturn {
    const [staffData, setStaffData] = useState<StaffWithData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAllStaffData = useCallback(async () => {
        if (!hubId) {
            setStaffData([]);
            return;
        }

        setLoading(true);
        setError(null);

        // Fetch hub members with staff roles
        const { data: membersData, error: membersError } = await supabase
            .from('hub_members')
            .select(`
                user_id,
                role,
                profile:profiles(id, full_name, email, avatar_url)
            `)
            .eq('hub_id', hubId)
            .in('role', ['owner', 'director', 'admin', 'coach']);

        if (membersError) {
            console.error('Error fetching staff members:', membersError);
            setError(membersError.message);
            setLoading(false);
            return;
        }

        const userIds = membersData?.map(m => m.user_id) || [];

        if (userIds.length === 0) {
            setStaffData([]);
            setLoading(false);
            return;
        }

        // Fetch staff profiles, schedules, and tasks in parallel
        const [staffProfilesResult, schedulesResult, tasksResult] = await Promise.all([
            supabase
                .from('staff_profiles')
                .select('id, user_id, title')
                .eq('hub_id', hubId)
                .in('user_id', userIds),
            supabase
                .from('staff_schedules')
                .select('*')
                .eq('hub_id', hubId)
                .in('staff_user_id', userIds)
                .order('day_of_week')
                .order('start_time'),
            supabase
                .from('staff_tasks')
                .select('*')
                .eq('hub_id', hubId)
                .in('staff_user_id', userIds)
                .order('due_date', { ascending: true, nullsFirst: false })
        ]);

        if (staffProfilesResult.error) {
            console.error('Error fetching staff profiles:', staffProfilesResult.error);
        }
        if (schedulesResult.error) {
            console.error('Error fetching schedules:', schedulesResult.error);
        }
        if (tasksResult.error) {
            console.error('Error fetching tasks:', tasksResult.error);
        }

        const staffProfiles = staffProfilesResult.data || [];
        const schedules = schedulesResult.data || [];
        const tasks = tasksResult.data || [];

        // Combine data
        const combined: StaffWithData[] = (membersData || []).map(member => {
            const staffProfile = staffProfiles.find(sp => sp.user_id === member.user_id);
            const memberSchedules = schedules.filter(s => s.staff_user_id === member.user_id);
            const memberTasks = tasks.filter(t => t.staff_user_id === member.user_id);

            const profileData = Array.isArray(member.profile) ? member.profile[0] : member.profile;

            return {
                user_id: member.user_id,
                role: member.role,
                profile: profileData as StaffWithData['profile'],
                staff_profile: staffProfile || null,
                schedules: memberSchedules,
                tasks: memberTasks,
            };
        });

        // Sort by role hierarchy then name
        combined.sort((a, b) => {
            const roleOrder = ['owner', 'director', 'admin', 'coach'];
            const aIndex = roleOrder.indexOf(a.role);
            const bIndex = roleOrder.indexOf(b.role);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return (a.profile?.full_name || '').localeCompare(b.profile?.full_name || '');
        });

        setStaffData(combined);
        setLoading(false);
    }, [hubId]);

    return { staffData, loading, error, refetch: fetchAllStaffData };
}

// Bulk assign task to multiple staff
interface BulkTaskInput {
    hub_id: string;
    staff_user_ids: string[];
    title: string;
    description?: string;
    due_date?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assigned_by?: string;
}

export function useBulkAssignTask() {
    const [loading, setLoading] = useState(false);

    const bulkAssignTask = async (input: BulkTaskInput): Promise<boolean> => {
        setLoading(true);

        const tasks = input.staff_user_ids.map(userId => ({
            hub_id: input.hub_id,
            staff_user_id: userId,
            title: input.title,
            description: input.description || null,
            due_date: input.due_date || null,
            priority: input.priority,
            assigned_by: input.assigned_by || null,
            status: 'pending' as const,
        }));

        const { error } = await supabase
            .from('staff_tasks')
            .insert(tasks);

        setLoading(false);

        if (error) {
            console.error('Error bulk assigning tasks:', error);
            return false;
        }

        return true;
    };

    return { bulkAssignTask, loading };
}

// Copy schedule from one staff to others
interface CopyScheduleInput {
    hub_id: string;
    source_user_id: string;
    target_user_ids: string[];
    replace: boolean; // If true, delete existing schedules first
}

export function useCopySchedule() {
    const [loading, setLoading] = useState(false);

    const copySchedule = async (input: CopyScheduleInput): Promise<boolean> => {
        setLoading(true);

        // Get source schedules
        const { data: sourceSchedules, error: fetchError } = await supabase
            .from('staff_schedules')
            .select('day_of_week, start_time, end_time, role_label')
            .eq('hub_id', input.hub_id)
            .eq('staff_user_id', input.source_user_id);

        if (fetchError || !sourceSchedules) {
            console.error('Error fetching source schedules:', fetchError);
            setLoading(false);
            return false;
        }

        if (sourceSchedules.length === 0) {
            setLoading(false);
            return true; // Nothing to copy
        }

        // If replace mode, delete existing schedules for target users
        if (input.replace) {
            const { error: deleteError } = await supabase
                .from('staff_schedules')
                .delete()
                .eq('hub_id', input.hub_id)
                .in('staff_user_id', input.target_user_ids);

            if (deleteError) {
                console.error('Error deleting existing schedules:', deleteError);
                setLoading(false);
                return false;
            }
        }

        // Create new schedules for each target user
        const newSchedules = input.target_user_ids.flatMap(userId =>
            sourceSchedules.map(schedule => ({
                hub_id: input.hub_id,
                staff_user_id: userId,
                day_of_week: schedule.day_of_week,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                role_label: schedule.role_label,
            }))
        );

        const { error: insertError } = await supabase
            .from('staff_schedules')
            .insert(newSchedules);

        setLoading(false);

        if (insertError) {
            console.error('Error copying schedules:', insertError);
            return false;
        }

        return true;
    };

    return { copySchedule, loading };
}

// Bulk update task status
export function useBulkUpdateTasks() {
    const [loading, setLoading] = useState(false);

    const bulkUpdateStatus = async (
        taskIds: string[],
        status: 'pending' | 'in_progress' | 'completed'
    ): Promise<boolean> => {
        setLoading(true);

        const updates: Record<string, unknown> = {
            status,
            updated_at: new Date().toISOString(),
        };

        if (status === 'completed') {
            updates.completed_at = new Date().toISOString();
        } else {
            updates.completed_at = null;
        }

        const { error } = await supabase
            .from('staff_tasks')
            .update(updates)
            .in('id', taskIds);

        setLoading(false);

        if (error) {
            console.error('Error bulk updating tasks:', error);
            return false;
        }

        return true;
    };

    const bulkDeleteTasks = async (taskIds: string[]): Promise<boolean> => {
        setLoading(true);

        const { error } = await supabase
            .from('staff_tasks')
            .delete()
            .in('id', taskIds);

        setLoading(false);

        if (error) {
            console.error('Error bulk deleting tasks:', error);
            return false;
        }

        return true;
    };

    return { bulkUpdateStatus, bulkDeleteTasks, loading };
}
