import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { AssignmentTemplate, AssignmentEventType, AssignmentTemplateType, MainStation } from '../types';

interface UseTemplatesOptions {
    hubId: string | undefined;
    event?: AssignmentEventType;
    templateType?: AssignmentTemplateType;
}

interface UseTemplatesReturn {
    templates: AssignmentTemplate[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useTemplates({ hubId, event, templateType }: UseTemplatesOptions): UseTemplatesReturn {
    const [templates, setTemplates] = useState<AssignmentTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTemplates = useCallback(async () => {
        if (!hubId) {
            setTemplates([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('assignment_templates')
                .select('*')
                .eq('hub_id', hubId)
                .order('name', { ascending: true });

            if (event) {
                query = query.eq('event', event);
            }

            if (templateType) {
                query = query.eq('template_type', templateType);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            setTemplates(data || []);
        } catch (err: any) {
            console.error('Error fetching templates:', err);
            setError(err.message || 'Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    }, [hubId, event, templateType]);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    return { templates, loading, error, refetch: fetchTemplates };
}

interface CreateTemplateData {
    hub_id: string;
    name: string;
    event: AssignmentEventType;
    template_type: AssignmentTemplateType;
    exercises?: string;
    stations?: MainStation[];
}

interface UseCreateTemplateReturn {
    createTemplate: (data: CreateTemplateData) => Promise<AssignmentTemplate | null>;
    loading: boolean;
    error: string | null;
}

export function useCreateTemplate(): UseCreateTemplateReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createTemplate = async (data: CreateTemplateData): Promise<AssignmentTemplate | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: createError } = await supabase
                .from('assignment_templates')
                .insert(data)
                .select()
                .single();

            if (createError) throw createError;
            return result;
        } catch (err: any) {
            console.error('Error creating template:', err);
            setError(err.message || 'Failed to create template');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { createTemplate, loading, error };
}

interface UpdateTemplateData {
    id: string;
    name?: string;
    event?: AssignmentEventType;
    template_type?: AssignmentTemplateType;
    exercises?: string;
    stations?: MainStation[];
}

interface UseUpdateTemplateReturn {
    updateTemplate: (data: UpdateTemplateData) => Promise<AssignmentTemplate | null>;
    loading: boolean;
    error: string | null;
}

export function useUpdateTemplate(): UseUpdateTemplateReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateTemplate = async ({ id, ...updates }: UpdateTemplateData): Promise<AssignmentTemplate | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: updateError } = await supabase
                .from('assignment_templates')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return result;
        } catch (err: any) {
            console.error('Error updating template:', err);
            setError(err.message || 'Failed to update template');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { updateTemplate, loading, error };
}

interface UseDeleteTemplateReturn {
    deleteTemplate: (templateId: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useDeleteTemplate(): UseDeleteTemplateReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteTemplate = async (templateId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('assignment_templates')
                .delete()
                .eq('id', templateId);

            if (deleteError) throw deleteError;
            return true;
        } catch (err: any) {
            console.error('Error deleting template:', err);
            setError(err.message || 'Failed to delete template');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { deleteTemplate, loading, error };
}
