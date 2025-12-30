import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HubResource, HubResourceCategory } from '../types';

interface UseResourcesOptions {
    hubId: string | undefined;
    category?: string | null;
}

interface UseResourcesReturn {
    resources: HubResource[];
    loading: boolean;
    error: string | null;
    refetch: () => void;
}

export function useResources({ hubId, category }: UseResourcesOptions): UseResourcesReturn {
    const [resources, setResources] = useState<HubResource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchResources = useCallback(async () => {
        if (!hubId) {
            setResources([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        let query = supabase
            .from('hub_resources')
            .select(`
                *,
                profiles:created_by (full_name, avatar_url)
            `)
            .eq('hub_id', hubId)
            .order('created_at', { ascending: false });

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching resources:', fetchError);
            setError(fetchError.message);
        } else {
            setResources(data || []);
        }
        setLoading(false);
    }, [hubId, category]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    return { resources, loading, error, refetch: fetchResources };
}

// Categories hook
interface UseCategoriesReturn {
    categories: HubResourceCategory[];
    loading: boolean;
    refetch: () => void;
}

export function useResourceCategories(hubId: string | undefined): UseCategoriesReturn {
    const [categories, setCategories] = useState<HubResourceCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCategories = useCallback(async () => {
        if (!hubId) {
            setCategories([]);
            setLoading(false);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from('hub_resource_categories')
            .select('*')
            .eq('hub_id', hubId)
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Error fetching categories:', error);
        } else {
            setCategories(data || []);
        }
        setLoading(false);
    }, [hubId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return { categories, loading, refetch: fetchCategories };
}

// Create resource
interface CreateResourceInput {
    hub_id: string;
    name: string;
    description?: string;
    url: string;
    type: 'link' | 'file';
    category?: string;
    file_type?: string;
    file_size?: number;
    created_by?: string;
}

export function useCreateResource() {
    const [loading, setLoading] = useState(false);

    const createResource = async (input: CreateResourceInput): Promise<HubResource | null> => {
        setLoading(true);
        const { data, error } = await supabase
            .from('hub_resources')
            .insert(input)
            .select(`
                *,
                profiles:created_by (full_name, avatar_url)
            `)
            .single();

        setLoading(false);

        if (error) {
            console.error('Error creating resource:', error);
            return null;
        }

        return data;
    };

    return { createResource, loading };
}

// Delete resource
export function useDeleteResource() {
    const [loading, setLoading] = useState(false);

    const deleteResource = async (id: string, fileUrl?: string): Promise<boolean> => {
        setLoading(true);

        // If it's a file, delete from storage first
        if (fileUrl && fileUrl.includes('storage')) {
            try {
                const urlParts = fileUrl.split('/resources/');
                if (urlParts.length > 1) {
                    const filePath = urlParts[1];
                    await supabase.storage.from('resources').remove([filePath]);
                }
            } catch (storageError) {
                console.error('Error deleting file from storage:', storageError);
            }
        }

        const { error } = await supabase
            .from('hub_resources')
            .delete()
            .eq('id', id);

        setLoading(false);

        if (error) {
            console.error('Error deleting resource:', error);
            return false;
        }

        return true;
    };

    return { deleteResource, loading };
}

// Create category
export function useCreateCategory() {
    const [loading, setLoading] = useState(false);

    const createCategory = async (hubId: string, name: string): Promise<HubResourceCategory | null> => {
        setLoading(true);

        // Get max display_order
        const { data: existingCategories } = await supabase
            .from('hub_resource_categories')
            .select('display_order')
            .eq('hub_id', hubId)
            .order('display_order', { ascending: false })
            .limit(1);

        const maxOrder = existingCategories?.[0]?.display_order ?? -1;

        const { data, error } = await supabase
            .from('hub_resource_categories')
            .insert({
                hub_id: hubId,
                name: name.trim(),
                display_order: maxOrder + 1
            })
            .select()
            .single();

        setLoading(false);

        if (error) {
            console.error('Error creating category:', error);
            return null;
        }

        return data;
    };

    return { createCategory, loading };
}

// Delete category
export function useDeleteCategory() {
    const [loading, setLoading] = useState(false);

    const deleteCategory = async (id: string): Promise<boolean> => {
        setLoading(true);

        // First, update resources with this category to have no category
        const { data: category } = await supabase
            .from('hub_resource_categories')
            .select('name, hub_id')
            .eq('id', id)
            .single();

        if (category) {
            await supabase
                .from('hub_resources')
                .update({ category: null })
                .eq('hub_id', category.hub_id)
                .eq('category', category.name);
        }

        const { error } = await supabase
            .from('hub_resource_categories')
            .delete()
            .eq('id', id);

        setLoading(false);

        if (error) {
            console.error('Error deleting category:', error);
            return false;
        }

        return true;
    };

    return { deleteCategory, loading };
}

// Upload file helper
export async function uploadResourceFile(file: File, hubId: string): Promise<{ url: string; fileType: string; fileSize: number } | null> {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const fileName = `${hubId}/${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, file);

    if (uploadError) {
        console.error('Error uploading file:', uploadError);
        return null;
    }

    const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

    return {
        url: publicUrl,
        fileType: fileExt,
        fileSize: file.size
    };
}
