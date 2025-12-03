// Centralized type definitions for Teamhub V2

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    organization: string | null;
}

export type PermissionScope = 'none' | 'all' | 'own';

export interface RolePermissions {
    admin?: PermissionScope;
    coach?: PermissionScope;
    parent?: PermissionScope;
}

export interface HubPermissions {
    roster?: RolePermissions;
    calendar?: RolePermissions;
    messages?: RolePermissions;
    competitions?: RolePermissions;
    scores?: RolePermissions;
    skills?: RolePermissions;
    marketplace?: RolePermissions;
    groups?: RolePermissions;
    mentorship?: RolePermissions;
    [key: string]: RolePermissions | undefined;
}

// Feature tabs that can be enabled/disabled per hub
export type HubFeatureTab = 'roster' | 'calendar' | 'messages' | 'competitions' | 'scores' | 'skills' | 'marketplace' | 'groups' | 'mentorship';

export const HUB_FEATURE_TABS: { id: HubFeatureTab; label: string; description: string }[] = [
    { id: 'roster', label: 'Roster', description: 'Manage gymnast profiles and team roster' },
    { id: 'calendar', label: 'Calendar', description: 'Schedule practices, meets, and events' },
    { id: 'messages', label: 'Messages', description: 'Team messaging and direct messages' },
    { id: 'competitions', label: 'Competitions', description: 'Track competitions and sessions' },
    { id: 'scores', label: 'Scores', description: 'Record and view competition scores' },
    { id: 'skills', label: 'Skills', description: 'Track gymnast skill progression by event' },
    { id: 'marketplace', label: 'Marketplace', description: 'Buy and sell team gear' },
    { id: 'groups', label: 'Groups', description: 'Create groups for team communication' },
    { id: 'mentorship', label: 'Mentorship', description: 'Manage mentorship pairings and programs' },
];

export interface HubSettings {
    permissions?: HubPermissions;
    levels?: string[];
    enabledTabs?: HubFeatureTab[];
}

export interface Hub {
    id: string;
    name: string;
    slug: string;
    organization_id: string;
    sport_type: SportType;
    settings: HubSettings;
}

export interface HubMember {
    hub_id: string;
    user_id: string;
    role: 'owner' | 'director' | 'admin' | 'coach' | 'parent';
    permissions: Record<string, unknown> | null;
    status: string;
    created_at: string;
    profiles?: Profile;
}

export interface Gymnast {
    id: string;
    full_name: string;
    email: string;
}

export interface Coach {
    id: string;
    full_name: string;
    email: string;
}

export interface Group {
    id: string;
    hub_id: string;
    name: string;
    description: string;
    type: 'public' | 'private';
    created_by: string;
    created_at: string;
}

export interface GroupMember {
    group_id: string;
    user_id: string;
    role: 'admin' | 'member';
    joined_at: string;
}

// Post Attachment Types
export interface PollSettings {
    multipleChoice: boolean;
    showResultsBeforeVote: boolean;
    allowChangeVote: boolean;
    endDate?: string;
}

export interface SignupSlot {
    name: string;
    maxSignups?: number;
    addedBy?: string; // user_id of who added this slot (for user-added slots)
}

export interface SignupSettings {
    allowUserSlots: boolean; // Allow users to add their own slots
    maxUserSlots?: number; // Max slots a user can add (optional)
}

export interface FileAttachment {
    url: string;
    name: string;
    size: number;
    mimeType: string;
}

export type PostAttachment =
    | { type: 'images'; urls: string[] }
    | { type: 'files'; files: FileAttachment[] }
    | { type: 'poll'; question: string; options: string[]; settings: PollSettings }
    | { type: 'signup'; title: string; description?: string; slots: SignupSlot[]; settings?: SignupSettings }
    | { type: 'rsvp'; title: string; date?: string; time?: string; location?: string }
    | { type: 'link'; url: string; title?: string; description?: string; image?: string };

export interface Post {
    id: string;
    group_id: string;
    user_id: string;
    content: string;
    image_url: string | null; // Legacy field, kept for backwards compatibility
    attachments: PostAttachment[];
    is_pinned: boolean;
    created_at: string;
    profiles?: Profile;
    _count?: {
        comments: number;
    };
}

// Response types for interactive attachments
export interface PollResponse {
    id: string;
    post_id: string;
    user_id: string;
    option_indices: number[];
    created_at: string;
    updated_at: string;
    profiles?: Profile;
}

export interface SignupResponse {
    id: string;
    post_id: string;
    user_id: string;
    slot_index: number;
    created_at: string;
    profiles?: Profile;
}

export interface RsvpResponse {
    id: string;
    post_id: string;
    user_id: string;
    status: 'going' | 'not_going' | 'maybe';
    created_at: string;
    updated_at: string;
    profiles?: Profile;
}

export interface Comment {
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: Profile;
}

export interface Competition {
    id: string;
    hub_id: string;
    name: string;
    start_date: string;
    end_date: string;
    location: string | null;
    created_by: string;
    created_at: string;
}

export interface CompetitionSession {
    id: string;
    competition_id: string;
    name: string;
    date: string;
    warmup_time: string | null;
    awards_time: string | null;
    created_at: string;
}

export interface Event {
    id: string;
    hub_id: string;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string;
    location: string | null;
    type: 'practice' | 'competition' | 'meeting' | 'social' | 'other';
    rsvp_enabled: boolean;
    created_by: string;
    created_at: string;
}

export interface EventRSVP {
    id: string;
    event_id: string;
    user_id: string;
    status: 'going' | 'not_going' | 'maybe';
    created_at: string;
}

export interface Channel {
    id: string;
    hub_id: string;
    name: string;
    description: string | null;
    type: 'public' | 'private';
    created_by: string;
    created_at: string;
}

export interface Message {
    id: string;
    channel_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles?: Profile;
}

// Gymnast Profile Types
export interface Guardian {
    first_name?: string;
    last_name?: string;
    name?: string; // Combined name field (alternative to first_name/last_name)
    email: string;
    phone: string;
    relationship?: string;
}

export interface InjuryReport {
    id: string;
    date: string;
    time: string;
    location: 'competition' | 'practice' | 'other';
    location_details?: string; // For 'other' location or specific venue
    description: string;
    body_part?: string;
    severity?: 'minor' | 'moderate' | 'severe';
    response: string; // What was done in response (ice, rest, medical attention, etc.)
    follow_up?: string; // Any follow-up actions or notes
    reported_by: string; // User ID who reported
    reported_at: string; // Timestamp when reported
    status: 'active' | 'recovering' | 'resolved';
}

export interface MedicalInfo {
    allergies: string;
    medications: string;
    conditions: string;
    notes: string;
    injury_reports?: InjuryReport[];
}

export interface GymnastProfile {
    id: string;
    user_id: string;
    hub_id: string;
    gymnast_id: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    level: string;
    member_id: string;
    member_id_type: 'USAG' | 'AAU' | 'Other' | null;
    tshirt_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | null;
    leo_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'AS' | 'AM' | 'AL' | 'AXL' | null;
    gender: 'Male' | 'Female' | null;
    guardian_1: Guardian | null;
    guardian_2: Guardian | null;
    medical_info: MedicalInfo | null;
    created_at: string;
    updated_at: string;
}

// Sport Types
export type SportType = 'gymnastics' | 'dance' | 'cheer' | 'swimming' | 'martial_arts';

export interface SportConfig {
    id: SportType;
    name: string;
    icon: string; // Lucide icon name
    athleteLabel: string; // What to call athletes (gymnast, dancer, cheerleader, swimmer, student)
    athleteLabelPlural: string;
    color: string; // Tailwind color class
}

export const SPORT_CONFIGS: Record<SportType, SportConfig> = {
    gymnastics: {
        id: 'gymnastics',
        name: 'Gymnastics',
        icon: 'Trophy',
        athleteLabel: 'Gymnast',
        athleteLabelPlural: 'Gymnasts',
        color: 'purple'
    },
    dance: {
        id: 'dance',
        name: 'Dance',
        icon: 'Music',
        athleteLabel: 'Dancer',
        athleteLabelPlural: 'Dancers',
        color: 'pink'
    },
    cheer: {
        id: 'cheer',
        name: 'Cheerleading',
        icon: 'Megaphone',
        athleteLabel: 'Cheerleader',
        athleteLabelPlural: 'Cheerleaders',
        color: 'red'
    },
    swimming: {
        id: 'swimming',
        name: 'Swimming',
        icon: 'Waves',
        athleteLabel: 'Swimmer',
        athleteLabelPlural: 'Swimmers',
        color: 'blue'
    },
    martial_arts: {
        id: 'martial_arts',
        name: 'Martial Arts',
        icon: 'Swords',
        athleteLabel: 'Student',
        athleteLabelPlural: 'Students',
        color: 'amber'
    }
};

// Hub Invite Types
export type HubRole = 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'gymnast';

export interface HubInvite {
    id: string;
    hub_id: string;
    code: string;
    role: HubRole;
    created_by: string;
    max_uses: number | null;
    uses: number;
    expires_at: string | null;
    is_active: boolean;
    created_at: string;
    profiles?: Profile;
}

// Competition Score Types
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
    highbar: 'HB'
};

export const EVENT_FULL_NAMES: Record<GymEvent, string> = {
    vault: 'Vault',
    bars: 'Uneven Bars',
    beam: 'Balance Beam',
    floor: 'Floor Exercise',
    pommel: 'Pommel Horse',
    rings: 'Still Rings',
    pbars: 'Parallel Bars',
    highbar: 'High Bar'
};

export interface CompetitionScore {
    id: string;
    competition_id: string;
    gymnast_profile_id: string;
    event: GymEvent;
    score: number | null;
    placement: number | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    gymnast_profiles?: GymnastProfile;
}

export interface CompetitionTeamPlacement {
    id: string;
    competition_id: string;
    level: string;
    gender: 'Female' | 'Male';
    event: GymEvent | 'all_around';
    placement: number | null;
    created_at: string;
    updated_at: string;
}

// Marketplace Types
export type MarketplaceCategory =
    | 'leos'
    | 'warmups'
    | 'grips'
    | 'equipment'
    | 'bags'
    | 'accessories'
    | 'other';

export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair';

export type MarketplaceItemStatus = 'active' | 'pending' | 'sold';

export const MARKETPLACE_CATEGORIES: Record<MarketplaceCategory, { label: string; icon: string }> = {
    leos: { label: 'Leotards', icon: 'Shirt' },
    warmups: { label: 'Warm-ups', icon: 'Jacket' },
    grips: { label: 'Grips', icon: 'Hand' },
    equipment: { label: 'Equipment', icon: 'Dumbbell' },
    bags: { label: 'Bags', icon: 'Backpack' },
    accessories: { label: 'Accessories', icon: 'Sparkles' },
    other: { label: 'Other', icon: 'Package' }
};

export const MARKETPLACE_CONDITIONS: Record<MarketplaceCondition, string> = {
    new: 'New with tags',
    like_new: 'Like new',
    good: 'Good',
    fair: 'Fair'
};

export interface MarketplaceItem {
    id: string;
    hub_id: string;
    seller_id: string;
    title: string;
    description: string;
    price: number; // 0 for free items
    category: MarketplaceCategory;
    condition: MarketplaceCondition;
    size: string | null;
    brand: string | null;
    images: string[];
    phone: string;
    status: MarketplaceItemStatus;
    created_at: string;
    updated_at: string;
    profiles?: Profile;
    hubs?: { id: string; name: string }; // For cross-hub items
}

// Marketplace Hub Linking Types
export type MarketplaceLinkStatus = 'pending' | 'active' | 'rejected';

export interface MarketplaceHubLink {
    id: string;
    requester_hub_id: string;
    target_hub_id: string;
    status: MarketplaceLinkStatus;
    requested_by: string;
    approved_by: string | null;
    created_at: string;
    updated_at: string;
    requester_hub?: { id: string; name: string };
    target_hub?: { id: string; name: string };
    requester_profile?: Profile;
    approver_profile?: Profile;
}

// Mentorship Types (Big/Little Sister Program)
export interface MentorshipPair {
    id: string;
    hub_id: string;
    big_gymnast_id: string;
    little_gymnast_id: string;
    status: 'active' | 'inactive';
    paired_date: string;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    big_gymnast?: GymnastProfile;
    little_gymnast?: GymnastProfile;
}

export interface MentorshipEvent {
    id: string;
    hub_id: string;
    event_id: string | null;
    title: string;
    description: string | null;
    event_date: string;
    start_time: string | null;
    end_time: string | null;
    location: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// Skills Types
export type SkillStatus = 'none' | 'learning' | 'achieved' | 'mastered';

export interface HubEventSkill {
    id: string;
    hub_id: string;
    level: string;
    event: string;
    skill_name: string;
    skill_order: number;
    created_at: string;
    created_by: string | null;
}

export interface GymnastSkill {
    id: string;
    gymnast_profile_id: string;
    hub_event_skill_id: string;
    status: SkillStatus;
    notes: string | null;
    achieved_date: string | null;
    updated_at: string;
    updated_by: string | null;
    // Joined data
    hub_event_skills?: HubEventSkill;
    gymnast_profiles?: GymnastProfile;
}

export const SKILL_STATUS_CONFIG: Record<SkillStatus, { label: string; icon: string; color: string; bgColor: string }> = {
    none: { label: 'Not Started', icon: '', color: 'text-slate-300', bgColor: 'bg-slate-50' },
    learning: { label: 'Learning', icon: '◐', color: 'text-amber-500', bgColor: 'bg-amber-50' },
    achieved: { label: 'Achieved', icon: '✓', color: 'text-green-500', bgColor: 'bg-green-50' },
    mastered: { label: 'Mastered', icon: '★', color: 'text-yellow-500', bgColor: 'bg-yellow-50' }
};
