import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { StationAssignment, MainStation, AssignmentEventType } from '../types';

interface UseStationsOptions {
    hubId: string | undefined;
    date: string;
    level?: string;
    event?: AssignmentEventType;
}

interface UseStationsReturn {
    stations: StationAssignment[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export function useStations({ hubId, date, level, event }: UseStationsOptions): UseStationsReturn {
    const [stations, setStations] = useState<StationAssignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStations = useCallback(async () => {
        if (!hubId || !date) {
            setStations([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('station_assignments')
                .select('*')
                .eq('hub_id', hubId)
                .eq('date', date);

            if (level) {
                query = query.eq('level', level);
            }

            if (event) {
                query = query.eq('event', event);
            }

            const { data, error: fetchError } = await query.order('created_at', { ascending: true });

            if (fetchError) throw fetchError;
            setStations(data || []);
        } catch (err: any) {
            console.error('Error fetching stations:', err);
            setError(err.message || 'Failed to fetch stations');
        } finally {
            setLoading(false);
        }
    }, [hubId, date, level, event]);

    useEffect(() => {
        fetchStations();
    }, [fetchStations]);

    return { stations, loading, error, refetch: fetchStations };
}

interface UpsertStationData {
    id?: string;
    hub_id: string;
    date: string;
    level: string;
    event: AssignmentEventType;
    stations: MainStation[];
}

interface UseUpsertStationReturn {
    upsertStation: (data: UpsertStationData) => Promise<StationAssignment | null>;
    loading: boolean;
    error: string | null;
}

export function useUpsertStation(): UseUpsertStationReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const upsertStation = async (data: UpsertStationData): Promise<StationAssignment | null> => {
        setLoading(true);
        setError(null);

        try {
            const { data: result, error: upsertError } = await supabase
                .from('station_assignments')
                .upsert(data, {
                    onConflict: 'hub_id,date,level,event'
                })
                .select()
                .single();

            if (upsertError) throw upsertError;
            return result;
        } catch (err: any) {
            console.error('Error upserting station:', err);
            setError(err.message || 'Failed to save station');
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { upsertStation, loading, error };
}

interface UseDeleteStationReturn {
    deleteStation: (stationId: string) => Promise<boolean>;
    loading: boolean;
    error: string | null;
}

export function useDeleteStation(): UseDeleteStationReturn {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const deleteStation = async (stationId: string): Promise<boolean> => {
        setLoading(true);
        setError(null);

        try {
            const { error: deleteError } = await supabase
                .from('station_assignments')
                .delete()
                .eq('id', stationId);

            if (deleteError) throw deleteError;
            return true;
        } catch (err: any) {
            console.error('Error deleting station:', err);
            setError(err.message || 'Failed to delete station');
            return false;
        } finally {
            setLoading(false);
        }
    };

    return { deleteStation, loading, error };
}
