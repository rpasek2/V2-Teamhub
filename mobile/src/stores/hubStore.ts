import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';

// Types (will be moved to shared types)
export type HubRole = 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'gymnast';

export interface Hub {
  id: string;
  name: string;
  slug: string;
  sport_type: string;
  settings: HubSettings | null;
  created_at: string;
}

export interface HubSettings {
  levels?: string[];
  enabledTabs?: string[];
  permissions?: Record<string, Record<HubRole, 'all' | 'own' | 'none'>>;
  showBirthdays?: boolean;
  anonymous_reports_enabled?: boolean;
  seasonConfig?: {
    startMonth: number;
    startDay: number;
  };
}

export interface HubMember {
  id: string;
  hub_id: string;
  user_id: string;
  role: HubRole;
  created_at: string;
}

export interface GymnastProfile {
  id: string;
  hub_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  gender: 'Male' | 'Female';
  level: string | null;
  date_of_birth: string | null;
  profile_image_url: string | null;
  schedule_group: string | null;
}

interface HubState {
  // Current hub state
  currentHub: Hub | null;
  currentMember: HubMember | null;
  linkedGymnasts: GymnastProfile[];
  loading: boolean;
  error: string | null;

  // Hub list
  hubs: Hub[];
  hubsLoading: boolean;

  // Actions
  fetchHubs: (userId: string) => Promise<void>;
  setCurrentHub: (hubId: string, userId: string) => Promise<void>;
  clearHub: () => void;
  refreshHub: () => Promise<void>;

  // Permission helpers
  hasPermission: (feature: string) => boolean;
  getPermissionScope: (feature: string) => 'all' | 'own' | 'none';
  isStaff: () => boolean;
  isParent: () => boolean;
  canManage: () => boolean;
}

const STAFF_ROLES: HubRole[] = ['owner', 'director', 'admin', 'coach'];
const MANAGE_ROLES: HubRole[] = ['owner', 'director', 'admin'];

const DEFAULT_PERMISSIONS: Record<string, Record<HubRole, 'all' | 'own' | 'none'>> = {
  roster: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  calendar: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'all' },
  messages: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'all' },
  groups: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'all' },
  assignments: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  attendance: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'none' },
  skills: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  scores: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  competitions: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  schedule: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'none', gymnast: 'none' },
  staff: { owner: 'all', director: 'all', admin: 'all', coach: 'own', parent: 'none', gymnast: 'none' },
  marketplace: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'all' },
  mentorship: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'own', gymnast: 'own' },
  resources: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'all' },
  settings: { owner: 'all', director: 'all', admin: 'all', coach: 'none', parent: 'none', gymnast: 'none' },
  privateLessons: { owner: 'all', director: 'all', admin: 'all', coach: 'all', parent: 'all', gymnast: 'none' },
};

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => ({
      currentHub: null,
      currentMember: null,
      linkedGymnasts: [],
      loading: false,
      error: null,
      hubs: [],
      hubsLoading: false,

      fetchHubs: async (userId: string) => {
        set({ hubsLoading: true });
        try {
          const { data, error } = await supabase
            .from('hub_members')
            .select(`
              hub_id,
              role,
              hubs:hub_id (
                id,
                name,
                slug,
                sport_type,
                settings,
                created_at
              )
            `)
            .eq('user_id', userId);

          if (error) throw error;

          const hubs = data
            ?.map((m) => m.hubs as unknown as Hub)
            .filter(Boolean) || [];

          set({ hubs, hubsLoading: false });
        } catch (error) {
          console.error('Error fetching hubs:', error);
          set({ hubsLoading: false, error: 'Failed to load hubs' });
        }
      },

      setCurrentHub: async (hubId: string, userId: string) => {
        set({ loading: true, error: null });
        try {
          // Fetch hub data
          const { data: hubData, error: hubError } = await supabase
            .from('hubs')
            .select('*')
            .eq('id', hubId)
            .single();

          if (hubError) throw hubError;

          // Fetch member data
          const { data: memberData, error: memberError } = await supabase
            .from('hub_members')
            .select('*')
            .eq('hub_id', hubId)
            .eq('user_id', userId)
            .single();

          if (memberError) throw memberError;

          // Fetch linked gymnasts for parents
          let linkedGymnasts: GymnastProfile[] = [];
          if (memberData.role === 'parent') {
            // Get user's email
            const { data: profile } = await supabase
              .from('profiles')
              .select('email')
              .eq('id', userId)
              .single();

            if (profile?.email) {
              // Find gymnasts where this email is in guardians
              const { data: gymnasts } = await supabase
                .from('gymnast_profiles')
                .select('*')
                .eq('hub_id', hubId)
                .or(`guardians->g1_email.eq.${profile.email},guardians->g2_email.eq.${profile.email}`);

              linkedGymnasts = gymnasts || [];
            }
          }

          set({
            currentHub: hubData,
            currentMember: memberData,
            linkedGymnasts,
            loading: false,
          });
        } catch (error) {
          console.error('Error setting hub:', error);
          set({ loading: false, error: 'Failed to load hub' });
        }
      },

      clearHub: () => {
        set({
          currentHub: null,
          currentMember: null,
          linkedGymnasts: [],
          error: null,
        });
      },

      refreshHub: async () => {
        const { currentHub, currentMember } = get();
        if (currentHub && currentMember) {
          await get().setCurrentHub(currentHub.id, currentMember.user_id);
        }
      },

      hasPermission: (feature: string) => {
        const scope = get().getPermissionScope(feature);
        return scope === 'all' || scope === 'own';
      },

      getPermissionScope: (feature: string) => {
        const { currentHub, currentMember } = get();
        if (!currentMember) return 'none';

        const role = currentMember.role;
        const permissions = currentHub?.settings?.permissions || DEFAULT_PERMISSIONS;
        const featurePermissions = permissions[feature] || DEFAULT_PERMISSIONS[feature];

        return featurePermissions?.[role] || 'none';
      },

      isStaff: () => {
        const { currentMember } = get();
        return currentMember ? STAFF_ROLES.includes(currentMember.role) : false;
      },

      isParent: () => {
        const { currentMember } = get();
        return currentMember?.role === 'parent';
      },

      canManage: () => {
        const { currentMember } = get();
        return currentMember ? MANAGE_ROLES.includes(currentMember.role) : false;
      },
    }),
    {
      name: 'teamhub-hub-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentHub: state.currentHub,
        currentMember: state.currentMember,
        hubs: state.hubs,
      }),
    }
  )
);
