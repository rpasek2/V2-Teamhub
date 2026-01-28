import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Hub, GymnastProfile, HubMember as FullHubMember, SportConfig } from '../types';
import { SPORT_CONFIGS } from '../types';
import {
    type PermissionScope,
    getPermissionScope as getPermissionScopeUtil,
    hasPermission as hasPermissionUtil,
} from '../lib/permissions';

// Partial HubMember for context (just the fields we need)
type HubMemberContext = Pick<FullHubMember, 'role' | 'permissions'>;

interface HubContextType {
    hub: Hub | null;
    member: HubMemberContext | null;
    user: User | null;
    currentRole: string | null;
    linkedGymnasts: GymnastProfile[];
    levels: string[];
    sportConfig: SportConfig;
    hasPermission: (feature: string) => boolean;
    getPermissionScope: (feature: string) => PermissionScope;
    refreshHub: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export function HubProvider({ children }: { children: React.ReactNode }) {
    const { hubId } = useParams<{ hubId: string }>();
    const [hub, setHub] = useState<Hub | null>(null);
    const [member, setMember] = useState<HubMemberContext | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [linkedGymnasts, setLinkedGymnasts] = useState<GymnastProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchHubData = useCallback(async (showLoading = true) => {
        if (!hubId) {
            setLoading(false);
            return;
        }

        if (showLoading) setLoading(true);
        setError(null);
        try {
            // 1. Fetch Hub Details (optimized: only select needed columns)
            const { data: hubData, error: hubError } = await supabase
                .from('hubs')
                .select('id, organization_id, name, slug, settings, sport_type')
                .eq('id', hubId)
                .maybeSingle();

            if (hubError) throw hubError;
            setHub(hubData);

            // 2. Fetch Current User and their Member Role in this Hub
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setUser(currentUser);

            if (currentUser) {
                const { data: memberData, error: memberError } = await supabase
                    .from('hub_members')
                    .select('role, permissions')
                    .eq('hub_id', hubId)
                    .eq('user_id', currentUser.id)
                    .single();

                if (memberError && memberError.code !== 'PGRST116') { // Ignore fetch error if not a member (PGRST116 is "Row not found")
                    console.error('Error fetching member data:', memberError);
                }
                setMember(memberData);

                // 3. Auto-link Gymnasts for parents based on guardian email
                // Uses database function for efficient filtering instead of client-side
                if (memberData && memberData.role === 'parent') {
                    const userEmail = currentUser.email;
                    let linked: GymnastProfile[] = [];

                    if (userEmail) {
                        const { data: linkedProfiles } = await supabase
                            .rpc('get_linked_gymnasts', {
                                p_hub_id: hubId,
                                p_email: userEmail
                            });
                        linked = (linkedProfiles as GymnastProfile[]) || [];
                    }
                    setLinkedGymnasts(linked);
                }
            }

        } catch (err: any) {
            console.error('Error fetching hub context:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [hubId]);

    useEffect(() => {
        fetchHubData();
    }, [fetchHubData]);

    const refreshHub = useCallback(async () => {
        await fetchHubData(false);
    }, [fetchHubData]);

    // Memoize derived values
    const currentRole = useMemo(() => member?.role || null, [member]);
    const levels = useMemo(() => hub?.settings?.levels || [], [hub?.settings?.levels]);
    const sportConfig = useMemo(() => SPORT_CONFIGS[hub?.sport_type || 'gymnastics'], [hub?.sport_type]);

    // Memoize permission functions using shared utility
    const getPermissionScope = useCallback((feature: string): PermissionScope => {
        return getPermissionScopeUtil(feature, currentRole, hub?.settings?.permissions);
    }, [hub?.settings?.permissions, currentRole]);

    const hasPermission = useCallback((feature: string): boolean => {
        return hasPermissionUtil(feature, currentRole, hub?.settings?.permissions);
    }, [hub?.settings?.permissions, currentRole]);

    // Memoize context value
    const contextValue = useMemo(() => ({
        hub,
        member,
        user,
        currentRole,
        linkedGymnasts,
        levels,
        sportConfig,
        hasPermission,
        getPermissionScope,
        refreshHub,
        loading,
        error
    }), [hub, member, user, currentRole, linkedGymnasts, levels, sportConfig, hasPermission, getPermissionScope, refreshHub, loading, error]);

    return (
        <HubContext.Provider value={contextValue}>
            {children}
        </HubContext.Provider>
    );
}

export function useHub() {
    const context = useContext(HubContext);
    if (context === undefined) {
        throw new Error('useHub must be used within a HubProvider');
    }
    return context;
}
