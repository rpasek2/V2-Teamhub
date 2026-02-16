import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabase';
import {
  type HubRole,
  type PermissionScope,
  STAFF_ROLES,
  MANAGE_ROLES,
  getPermissionScope as getPermissionScopeUtil,
  hasPermission as hasPermissionUtil,
  isStaffRole,
  isParentRole,
  canManageRole,
  isTabEnabled as isTabEnabledUtil,
} from '../lib/permissions';

export type { HubRole } from '../lib/permissions';

export interface Hub {
  id: string;
  name: string;
  slug: string;
  sport_type: string;
  settings: HubSettings | null;
  created_at: string;
}

// Qualifying Scores Types
export interface QualifyingScoreThreshold {
  state?: number;
  regional?: number;
  national?: number;
}

export interface LevelQualifyingScores {
  all_around?: QualifyingScoreThreshold;
  individual_event?: QualifyingScoreThreshold;
}

export interface QualifyingScoresConfig {
  Female?: Record<string, LevelQualifyingScores>;
  Male?: Record<string, LevelQualifyingScores>;
}

export type ChampionshipType = 'state' | 'regional' | 'national' | 'unsanctioned' | null;

export interface SkillEvent {
  id: string;
  label: string;
  fullName: string;
}

export interface SkillEventsConfig {
  Female?: SkillEvent[];
  Male?: SkillEvent[];
}

export interface HubSettings {
  levels?: string[];
  enabledTabs?: string[];
  permissions?: Record<string, Record<HubRole, 'all' | 'own' | 'none'>>;
  showBirthdays?: boolean;
  anonymous_reports_enabled?: boolean;
  allowParentToggle?: boolean;
  seasonConfig?: {
    startMonth: number;
    startDay: number;
  };
  qualifyingScores?: QualifyingScoresConfig;
  skillEvents?: SkillEventsConfig;
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
  currentRole: HubRole | null;
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
  isTabEnabled: (tabId: string) => boolean;
}

// Permission constants and logic imported from ../lib/permissions

export const useHubStore = create<HubState>()(
  persist(
    (set, get) => ({
      currentHub: null,
      currentMember: null,
      currentRole: null,
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
            .select('id, name, slug, sport_type, settings, created_at')
            .eq('id', hubId)
            .single();

          if (hubError) throw hubError;

          // Fetch member data
          const { data: memberData, error: memberError } = await supabase
            .from('hub_members')
            .select('id, hub_id, user_id, role, created_at')
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
                .select('id, hub_id, user_id, first_name, last_name, gender, level, date_of_birth, profile_image_url, schedule_group')
                .eq('hub_id', hubId)
                .or(`guardians->g1_email.eq.${profile.email},guardians->g2_email.eq.${profile.email}`);

              linkedGymnasts = gymnasts || [];
            }
          }

          set({
            currentHub: hubData,
            currentMember: memberData,
            currentRole: memberData.role as HubRole,
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
          currentRole: null,
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
        const { currentHub, currentMember } = get();
        return hasPermissionUtil(feature, currentMember?.role ?? null, currentHub?.settings?.permissions);
      },

      getPermissionScope: (feature: string) => {
        const { currentHub, currentMember } = get();
        return getPermissionScopeUtil(feature, currentMember?.role ?? null, currentHub?.settings?.permissions);
      },

      isStaff: () => {
        const { currentMember } = get();
        return isStaffRole(currentMember?.role ?? null);
      },

      isParent: () => {
        const { currentMember } = get();
        return isParentRole(currentMember?.role ?? null);
      },

      canManage: () => {
        const { currentMember } = get();
        return canManageRole(currentMember?.role ?? null);
      },

      isTabEnabled: (tabId: string) => {
        const { currentHub } = get();
        return isTabEnabledUtil(tabId, currentHub?.settings?.enabledTabs);
      },
    }),
    {
      name: 'teamhub-hub-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        currentHub: state.currentHub,
        currentMember: state.currentMember,
        currentRole: state.currentRole,
        hubs: state.hubs,
      }),
    }
  )
);
