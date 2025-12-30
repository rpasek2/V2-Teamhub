import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GymnastAssignment, CompletedItems, AssignmentEventType } from '../types';

interface UseAssignmentsOptions {
    hubId: string | undefined;
    date: string;
}

interface UseAssignmentsReturn {
    assignments: GymnastAssignment[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useAssignments({ hubId, date }: UseAssignmentsOptions): UseAssignmentsReturn {
    const [assignments, setAssignments] = useState<GymnastAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignments = useCallback(async () => {
        if (!hubId || !date) {
            setAssignments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gymnast_assignments')
                .select(`
                    *,
                    gymnast_profiles (
                        id,
                        first_name,
                        last_name,
                        level,
                        gymnast_id
                    )
                `)
                .eq('hub_id', hubId)
                .eq('date', date)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;
            setAssignments(data || []);
        } catch (err: any) {
            console.error('Error fetching assignments:', err);
            setError(err.message || 'Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    }, [hubId, date]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    return { assignments, loading, error, refetch: fetchAssignments };
}

interface UseAssignmentsByGymnastOptions {
    gymnastIds: string[];
    date: string;
}

export function useAssignmentsByGymnasts({ gymnastIds, date }: UseAssignmentsByGymnastOptions): UseAssignmentsReturn {
    const [assignments, setAssignments] = useState<GymnastAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssignments = useCallback(async () => {
        if (!gymnastIds.length || !date) {
            setAssignments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gymnast_assignments')
                .select(`
                    *,
                    gymnast_profiles (
                        id,
                        first_name,
                        last_name,
                        level,
                        gymnast_id
                    )
                `)
                .in('gymnast_profile_id', gymnastIds)
                .eq('date', date);

            if (fetchError) throw fetchError;
            setAssignments(data || []);
        } catch (err: any) {
            console.error('Error fetching assignments by gymnasts:', err);
            setError(err.message || 'Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    }, [gymnastIds, date]);

    useEffect(() => {
        fetchAssignments();
    }, [fetchAssignments]);

    return { assignments, loading, error, refetch: fetchAssignments };
}

interface UpsertAssignmentData {
    id?: string;
    hub_id: string;
    gymnast_profile_id: string;
    date: string;
    vault?: string;
    bars?: string;
    beam?: string;
    floor?: string;
    strength?: string;
    flexibility?: string;
    conditioning?: string;
    notes?: string;
}

interface UseUpsertAssignmentReturn {
    upsertAssignment: (data: UpsertAssignmentData) => Promise<GymnastAssignment | null>;
    loading: boolean;
    error: string | null;
}

export function useUpsertAssignment(): UseUpsertAssignmentReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upsertAssignment = async (data: UpsertAssignmentData): Promise<GymnastAssignment | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: upsertError } = await supabase
                .from('gymnast_assignments')
                .upsert(data, {
                    onConflict: 'hub_id,gymnast_profile_id,date'
                })
                .select()
                .single();

            if (upsertError) throw upsertError;
            return result;
        } catch (err: any) {
            console.error('Error upserting assignment:', err);
            setError(err.message || 'Failed to save assignment');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { upsertAssignment, loading, error };
}

interface BatchUpsertData {
    hub_id: string;
    date: string;
    gymnast_profile_ids: string[];
    event: AssignmentEventType;
    content: string;
}

interface UseBatchUpsertReturn {
    batchUpsert: (data: BatchUpsertData) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useBatchUpsertAssignments(): UseBatchUpsertReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const batchUpsert = async (data: BatchUpsertData): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            // For each gymnast, we need to upsert their assignment for this event
            const upserts = data.gymnast_profile_ids.map(gymnastId => ({
                hub_id: data.hub_id,
                gymnast_profile_id: gymnastId,
                date: data.date,
                [data.event]: data.content
            }));

            const { error: upsertError } = await supabase
                .from('gymnast_assignments')
                .upsert(upserts, {
                    onConflict: 'hub_id,gymnast_profile_id,date'
                });

            if (upsertError) throw upsertError;
            return true;
        } catch (err: any) {
            console.error('Error batch upserting assignments:', err);
            setError(err.message || 'Failed to batch save assignments');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { batchUpsert, loading, error };
}

interface UseToggleCompletionReturn {
    toggleCompletion: (
        assignmentId: string,
        event: AssignmentEventType,
        exerciseIndex: number,
        currentCompleted: CompletedItems
    ) => Promise<CompletedItems | null>;
    loading: boolean;
    error: string | null;
}

export function useToggleCompletion(): UseToggleCompletionReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleCompletion = async (
        assignmentId: string,
        event: AssignmentEventType,
        exerciseIndex: number,
        currentCompleted: CompletedItems
    ): Promise<CompletedItems | null> => {
        setLoading(true);
        setError(null);

        try {
            const eventCompleted = currentCompleted[event] || [];
            const newEventCompleted = eventCompleted.includes(exerciseIndex)
                ? eventCompleted.filter(i => i !== exerciseIndex)
                : [...eventCompleted, exerciseIndex];

            const newCompleted: CompletedItems = {
                ...currentCompleted,
                [event]: newEventCompleted
            };

            const { error: updateError } = await supabase
                .from('gymnast_assignments')
                .update({ completed_items: newCompleted })
                .eq('id', assignmentId);

            if (updateError) throw updateError;
            return newCompleted;
        } catch (err: any) {
            console.error('Error toggling completion:', err);
            setError(err.message || 'Failed to toggle completion');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { toggleCompletion, loading, error };
}

interface UseDeleteAssignmentReturn {
    deleteAssignment: (assignmentId: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useDeleteAssignment(): UseDeleteAssignmentReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('gymnast_assignments')
                .delete()
                .eq('id', assignmentId);

            if (deleteError) throw deleteError;
            return true;
        } catch (err: any) {
            console.error('Error deleting assignment:', err);
            setError(err.message || 'Failed to delete assignment');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { deleteAssignment, loading, error };
}

interface UseAllAssignmentsOptions {
    hubId: string | undefined;
}

interface UseAllAssignmentsReturn {
    assignments: GymnastAssignment[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useAllAssignments({ hubId }: UseAllAssignmentsOptions): UseAllAssignmentsReturn {
    const [assignments, setAssignments] = useState<GymnastAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAllAssignments = useCallback(async () => {
        if (!hubId) {
            setAssignments([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gymnast_assignments')
                .select(`
                    *,
                    gymnast_profiles (
                        id,
                        first_name,
                        last_name,
                        level,
                        gymnast_id
                    )
                `)
                .eq('hub_id', hubId)
                .order('date', { ascending: false });

            if (fetchError) throw fetchError;
            setAssignments(data || []);
        } catch (err: any) {
            console.error('Error fetching all assignments:', err);
            setError(err.message || 'Failed to fetch assignments');
        } finally {
            setLoading(false);
        }
    }, [hubId]);

    useEffect(() => {
        fetchAllAssignments();
    }, [fetchAllAssignments]);

    return { assignments, loading, error, refetch: fetchAllAssignments };
}
