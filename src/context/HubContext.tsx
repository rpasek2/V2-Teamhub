import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Hub, GymnastProfile, HubMember as FullHubMember, SportConfig } from '../types';
import { SPORT_CONFIGS } from '../types';

// Partial HubMember for context (just the fields we need)
type HubMemberContext = Pick<FullHubMember, 'role' | 'permissions'>;

type PermissionScope = 'all' | 'own' | 'none';

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
            // 1. Fetch Hub Details
            const { data: hubData, error: hubError } = await supabase
                .from('hubs')
                .select('*')
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
                if (memberData && memberData.role === 'parent') {
                    const userEmail = currentUser.email?.toLowerCase();
                    let linked: GymnastProfile[] = [];

                    if (userEmail) {
                        // Fetch profiles where guardian email matches
                        // We fetch all profiles for the hub and filter in memory to ensure case-insensitive matching
                        // This is safer than trying to construct a complex JSONB query
                        const { data: allProfiles } = await supabase
                            .from('gymnast_profiles')
                            .select('*')
                            .eq('hub_id', hubId);

                        if (allProfiles) {
                            linked = allProfiles.filter(p =>
                                p.guardian_1?.email?.toLowerCase() === userEmail ||
                                p.guardian_2?.email?.toLowerCase() === userEmail
                            );
                        }
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

    const currentRole = member?.role || null;
    const levels: string[] = hub?.settings?.levels || [];
    const sportConfig: SportConfig = SPORT_CONFIGS[hub?.sport_type || 'gymnastics'];

    const getPermissionScope = (feature: string): PermissionScope => {
        if (!hub || !currentRole) return 'none';

        // Owner and Director always have full access
        if (currentRole === 'owner' || currentRole === 'director') return 'all';

        const permissions = hub.settings?.permissions;

        // Default permissions for each role when not explicitly configured
        const getDefaultScope = (role: string): PermissionScope => {
            if (['admin', 'coach'].includes(role)) return 'all';
            if (role === 'parent') return 'own';
            return 'none';
        };

        // Default behavior if permissions are not configured at all (Legacy Hubs)
        if (!permissions) {
            return getDefaultScope(currentRole);
        }

        // Check configured permissions for this feature
        const rolePermissions = permissions[feature];

        // If feature permissions aren't configured, use defaults
        if (!rolePermissions) {
            return getDefaultScope(currentRole);
        }

        const scope = rolePermissions[currentRole as keyof typeof rolePermissions];

        // If scope is explicitly set, return it. Otherwise use defaults.
        return scope || getDefaultScope(currentRole);
    };

    const hasPermission = (feature: string): boolean => {
        const scope = getPermissionScope(feature);
        return scope === 'all' || scope === 'own';
    };

    return (
        <HubContext.Provider value={{
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
        }}>
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
