import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { GymnastAssessment } from '../types';

interface UseAssessmentOptions {
    gymnastProfileId: string | undefined;
}

interface UseAssessmentReturn {
    assessment: GymnastAssessment | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useAssessment({ gymnastProfileId }: UseAssessmentOptions): UseAssessmentReturn {
    const [assessment, setAssessment] = useState<GymnastAssessment | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAssessment = useCallback(async () => {
        if (!gymnastProfileId) {
            setAssessment(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: fetchError } = await supabase
                .from('gymnast_assessments')
                .select('*')
                .eq('gymnast_profile_id', gymnastProfileId)
                .maybeSingle();

            if (fetchError) throw fetchError;
            setAssessment(data);
        } catch (err: any) {
            console.error('Error fetching assessment:', err);
            setError(err.message || 'Failed to fetch assessment');
        } finally {
            setLoading(false);
        }
    }, [gymnastProfileId]);

    useEffect(() => {
        fetchAssessment();
    }, [fetchAssessment]);

    return { assessment, loading, error, refetch: fetchAssessment };
}

interface UpsertAssessmentData {
    gymnast_profile_id: string;
    strengths?: string;
    weaknesses?: string;
    overall_plan?: string;
    injuries?: string;
}

interface UseUpsertAssessmentReturn {
    upsertAssessment: (data: UpsertAssessmentData) => Promise<GymnastAssessment | null>;
    loading: boolean;
    error: string | null;
}

export function useUpsertAssessment(): UseUpsertAssessmentReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upsertAssessment = async (data: UpsertAssessmentData): Promise<GymnastAssessment | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: upsertError } = await supabase
                .from('gymnast_assessments')
                .upsert(data, {
                    onConflict: 'gymnast_profile_id'
                })
                .select()
                .single();

            if (upsertError) throw upsertError;
            return result;
        } catch (err: any) {
            console.error('Error upserting assessment:', err);
            setError(err.message || 'Failed to save assessment');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { upsertAssessment, loading, error };
}
