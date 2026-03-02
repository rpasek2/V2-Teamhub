// Shared types and constants for competition components

export type GymEvent = 'vault' | 'bars' | 'beam' | 'floor' | 'pommel' | 'rings' | 'pbars' | 'highbar';

export const WAG_EVENTS: GymEvent[] = ['vault', 'bars', 'beam', 'floor'];
export const MAG_EVENTS: GymEvent[] = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

export const EVENT_LABELS: Record<GymEvent, string> = {
  vault: 'VT',
  bars: 'UB',
  beam: 'BB',
  floor: 'FX',
  pommel: 'PH',
  rings: 'SR',
  pbars: 'PB',
  highbar: 'HB',
};

export interface Competition {
  id: string;
  hub_id: string;
  name: string;
  start_date: string;
  end_date: string;
  location: string | null;
}

export interface Gymnast {
  gymnast_profile_id: string;
  events: GymEvent[];
  gymnast_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
    gender: 'Male' | 'Female' | null;
  };
}

export interface Session {
  id: string;
  name: string;
  date: string;
  warmup_time: string | null;
  awards_time: string | null;
  session_coaches: {
    user_id: string;
    profiles: {
      full_name: string;
    };
  }[];
  session_gymnasts: {
    gymnast_profile_id: string;
    gymnast_profiles: {
      first_name: string;
      last_name: string;
      level: string | null;
    };
  }[];
}

export interface AllGymnast {
  id: string;
  first_name: string;
  last_name: string;
  level: string | null;
  gender: 'Male' | 'Female' | null;
}

// Raw data type from Supabase query
export interface RawRosterItem {
  gymnast_profile_id: string;
  events: GymEvent[] | null;
  gymnast_profiles: {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
    gender: 'Male' | 'Female' | null;
  } | {
    id: string;
    first_name: string;
    last_name: string;
    level: string | null;
    gender: 'Male' | 'Female' | null;
  }[];
}

// Helper function to get events for a given gender
export const getEventsForGender = (gender: 'Male' | 'Female' | null): GymEvent[] => {
  return gender === 'Male' ? MAG_EVENTS : WAG_EVENTS;
};
