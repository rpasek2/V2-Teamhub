import { createContext, useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Hub {
    id: string;
    name: string;
    slug: string;
    organization_id: string;
    settings: any;
}

interface HubMember {
    role: 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'gymnast';
    permissions: any;
}

interface HubContextType {
    hub: Hub | null;
    member: HubMember | null;
    user: User | null;
    currentRole: string | null;
    loading: boolean;
    error: string | null;
}

const HubContext = createContext<HubContextType | undefined>(undefined);

export function HubProvider({ children }: { children: React.ReactNode }) {
    const { hubId } = useParams<{ hubId: string }>();
    const [hub, setHub] = useState<Hub | null>(null);
    const [member, setMember] = useState<HubMember | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!hubId) {
            setLoading(false);
            return;
        }

        async function fetchHubData() {
            setLoading(true);
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
                }

            } catch (err: any) {
                console.error('Error fetching hub context:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchHubData();
    }, [hubId]);

    const currentRole = member?.role || null;

    return (
        <HubContext.Provider value={{ hub, member, user, currentRole, loading, error }}>
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
