import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GymnastGoal, GymnastSubgoal } from '../types';

interface UseGoalsOptions {
    gymnastProfileId: string | undefined;
}

interface UseGoalsReturn {
    goals: GymnastGoal[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useGoals({ gymnastProfileId }: UseGoalsOptions): UseGoalsReturn {
    const [goals, setGoals] = useState<GymnastGoal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchGoals = useCallback(async () => {
        if (!gymnastProfileId) {
            setGoals([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gymnast_goals')
                .select(`
                    *,
                    subgoals:gymnast_subgoals (*)
                `)
                .eq('gymnast_profile_id', gymnastProfileId)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setGoals(data || []);
        } catch (err: any) {
            console.error('Error fetching goals:', err);
            setError(err.message || 'Failed to fetch goals');
        } finally {
            setLoading(false);
        }
    }, [gymnastProfileId]);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    return { goals, loading, error, refetch: fetchGoals };
}

interface CreateGoalData {
    gymnast_profile_id: string;
    title: string;
    description?: string;
    event?: string;
    target_date?: string;
}

interface UseCreateGoalReturn {
    createGoal: (data: CreateGoalData) => Promise<GymnastGoal | null>;
    loading: boolean;
    error: string | null;
}

export function useCreateGoal(): UseCreateGoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createGoal = async (data: CreateGoalData): Promise<GymnastGoal | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: createError } = await supabase
                .from('gymnast_goals')
                .insert(data)
                .select()
                .single();

            if (createError) throw createError;
            return result;
        } catch (err: any) {
            console.error('Error creating goal:', err);
            setError(err.message || 'Failed to create goal');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { createGoal, loading, error };
}

interface UpdateGoalData {
    id: string;
    title?: string;
    description?: string;
    event?: string;
    target_date?: string | null;
    completed_at?: string | null;
}

interface UseUpdateGoalReturn {
    updateGoal: (data: UpdateGoalData) => Promise<GymnastGoal | null>;
    loading: boolean;
    error: string | null;
}

export function useUpdateGoal(): UseUpdateGoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateGoal = async ({ id, ...updates }: UpdateGoalData): Promise<GymnastGoal | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: updateError } = await supabase
                .from('gymnast_goals')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return result;
        } catch (err: any) {
            console.error('Error updating goal:', err);
            setError(err.message || 'Failed to update goal');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { updateGoal, loading, error };
}

interface UseDeleteGoalReturn {
    deleteGoal: (goalId: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useDeleteGoal(): UseDeleteGoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteGoal = async (goalId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            // Subgoals will be deleted automatically via CASCADE
            const { error: deleteError } = await supabase
                .from('gymnast_goals')
                .delete()
                .eq('id', goalId);

            if (deleteError) throw deleteError;
            return true;
        } catch (err: any) {
            console.error('Error deleting goal:', err);
            setError(err.message || 'Failed to delete goal');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { deleteGoal, loading, error };
}

// Subgoal hooks
interface CreateSubgoalData {
    goal_id: string;
    title: string;
    target_date?: string;
}

interface UseCreateSubgoalReturn {
    createSubgoal: (data: CreateSubgoalData) => Promise<GymnastSubgoal | null>;
    loading: boolean;
    error: string | null;
}

export function useCreateSubgoal(): UseCreateSubgoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createSubgoal = async (data: CreateSubgoalData): Promise<GymnastSubgoal | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: createError } = await supabase
                .from('gymnast_subgoals')
                .insert(data)
                .select()
                .single();

            if (createError) throw createError;
            return result;
        } catch (err: any) {
            console.error('Error creating subgoal:', err);
            setError(err.message || 'Failed to create subgoal');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { createSubgoal, loading, error };
}

interface UpdateSubgoalData {
    id: string;
    title?: string;
    target_date?: string | null;
    completed_at?: string | null;
}

interface UseUpdateSubgoalReturn {
    updateSubgoal: (data: UpdateSubgoalData) => Promise<GymnastSubgoal | null>;
    loading: boolean;
    error: string | null;
}

export function useUpdateSubgoal(): UseUpdateSubgoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateSubgoal = async ({ id, ...updates }: UpdateSubgoalData): Promise<GymnastSubgoal | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: updateError } = await supabase
                .from('gymnast_subgoals')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return result;
        } catch (err: any) {
            console.error('Error updating subgoal:', err);
            setError(err.message || 'Failed to update subgoal');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { updateSubgoal, loading, error };
}

interface UseDeleteSubgoalReturn {
    deleteSubgoal: (subgoalId: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useDeleteSubgoal(): UseDeleteSubgoalReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteSubgoal = async (subgoalId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('gymnast_subgoals')
                .delete()
                .eq('id', subgoalId);

            if (deleteError) throw deleteError;
            return true;
        } catch (err: any) {
            console.error('Error deleting subgoal:', err);
            setError(err.message || 'Failed to delete subgoal');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { deleteSubgoal, loading, error };
}

// Toggle completion helper
interface UseToggleGoalCompletionReturn {
    toggleGoalCompletion: (goalId: string, currentlyCompleted: boolean) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useToggleGoalCompletion(): UseToggleGoalCompletionReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleGoalCompletion = async (goalId: string, currentlyCompleted: boolean): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('gymnast_goals')
                .update({
                    completed_at: currentlyCompleted ? null : new Date().toISOString()
                })
                .eq('id', goalId);

            if (updateError) throw updateError;
            return true;
        } catch (err: any) {
            console.error('Error toggling goal completion:', err);
            setError(err.message || 'Failed to toggle goal completion');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { toggleGoalCompletion, loading, error };
}

interface UseToggleSubgoalCompletionReturn {
    toggleSubgoalCompletion: (subgoalId: string, currentlyCompleted: boolean) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useToggleSubgoalCompletion(): UseToggleSubgoalCompletionReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const toggleSubgoalCompletion = async (subgoalId: string, currentlyCompleted: boolean): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: updateError } = await supabase
                .from('gymnast_subgoals')
                .update({
                    completed_at: currentlyCompleted ? null : new Date().toISOString()
                })
                .eq('id', subgoalId);

            if (updateError) throw updateError;
            return true;
        } catch (err: any) {
            console.error('Error toggling subgoal completion:', err);
            setError(err.message || 'Failed to toggle subgoal completion');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { toggleSubgoalCompletion, loading, error };
}
