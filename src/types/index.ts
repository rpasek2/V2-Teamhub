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
    director?: PermissionScope;
    admin?: PermissionScope;
    coach?: PermissionScope;
    parent?: PermissionScope;
    athlete?: PermissionScope;
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
export type HubFeatureTab = 'roster' | 'calendar' | 'messages' | 'competitions' | 'scores' | 'skills' | 'marketplace' | 'groups' | 'mentorship' | 'staff' | 'assignments' | 'resources' | 'schedule' | 'attendance' | 'private_lessons';

export const HUB_FEATURE_TABS: { id: HubFeatureTab; label: string; description: string }[] = [
    { id: 'roster', label: 'Roster', description: 'View and manage gymnast profiles including contact info, emergency contacts, medical details, sizing, and parent/guardian information' },
    { id: 'calendar', label: 'Calendar', description: 'Create and manage practices, competitions, team events, and fundraisers with RSVP tracking and schedule visibility for the whole team' },
    { id: 'messages', label: 'Messages', description: 'Send direct messages between members and create group channels for team-wide or private communication' },
    { id: 'competitions', label: 'Competitions', description: 'Organize meets with session management, competition rosters, warm-up times, coach assignments, and event schedules' },
    { id: 'scores', label: 'Scores', description: 'Enter and track competition scores by event, view score history, and analyze performance trends over time' },
    { id: 'skills', label: 'Skills', description: 'Track skill progression across events with customizable skill lists, proficiency levels, and individual athlete skill matrices' },
    { id: 'marketplace', label: 'Marketplace', description: 'A member-to-member marketplace where parents and families can buy, sell, and trade used leotards, grips, and gear with each other' },
    { id: 'groups', label: 'Groups', description: 'Organize members into specific collections like individual levels or training groups, each with its own wall-style feed for announcements, discussions, polls, and sign-ups' },
    { id: 'mentorship', label: 'Mentorship', description: 'Pair experienced athletes with newer team members through a Big/Little program with scheduled events and relationship tracking' },
    { id: 'staff', label: 'Staff', description: 'Manage coach and staff profiles, work schedules, responsibilities, task assignments, time-off requests, and internal notes' },
    { id: 'assignments', label: 'Assignments', description: 'Manage daily practice assignments and workouts for gymnasts, track completions, and organize conditioning drills and training tasks by athlete' },
    { id: 'resources', label: 'Resources', description: 'Share documents, educational links, and team resources organized by category for easy access' },
    { id: 'schedule', label: 'Schedule', description: 'Set up weekly practice schedules per level with A/B groups, and create daily rotation plans with drag-and-drop event blocks' },
    { id: 'attendance', label: 'Attendance', description: 'Track daily attendance for gymnasts based on practice schedules, view metrics including attendance percentages by level, and monitor consecutive absence alerts' },
    { id: 'private_lessons', label: 'Private Lessons', description: 'Book private lessons with coaches, view availability calendars, and manage lesson schedules with automatic calendar integration' },
];

// Season configuration
export interface SeasonConfig {
    startMonth: number;   // 1-12 (default: 8 for August)
    startDay: number;     // 1-31 (default: 1)
}

// Custom skill events configuration per gender
export interface SkillEvent {
    id: string;           // Unique identifier (e.g., 'vault', 'bars', 'conditioning', 'flex')
    label: string;        // Short label (e.g., 'VT', 'UB', 'COND', 'FLEX')
    fullName: string;     // Full display name (e.g., 'Vault', 'Uneven Bars', 'Conditioning', 'Flexibility')
}

export interface SkillEventsConfig {
    Female?: SkillEvent[];
    Male?: SkillEvent[];
}

// Qualifying Scores Types
export interface QualifyingScoreThreshold {
    state?: number;      // Minimum to qualify for State
    regional?: number;   // Minimum to qualify for Regionals
    national?: number;   // Minimum to qualify for Nationals (optional - men's/women's differ)
}

export interface LevelQualifyingScores {
    all_around?: QualifyingScoreThreshold;      // AA qualifying scores
    individual_event?: QualifyingScoreThreshold; // IES - applies to all events
}

// Keyed by level name (e.g., "Level 10", "Level 9")
export interface QualifyingScoresConfig {
    Female?: Record<string, LevelQualifyingScores>;
    Male?: Record<string, LevelQualifyingScores>;
}

// Competition championship type - determines which qualifying badges to show
// null = regular sanctioned meet, 'unsanctioned' = no qualifying badges
export type ChampionshipType = 'state' | 'regional' | 'national' | 'unsanctioned' | null;

export interface HubSettings {
    permissions?: HubPermissions;
    levels?: string[];
    enabledTabs?: HubFeatureTab[];
    allowParentToggle?: boolean;
    allowGymnastToggle?: boolean;
    showBirthdays?: boolean;
    anonymous_reports_enabled?: boolean;
    seasonConfig?: SeasonConfig;
    skillEvents?: SkillEventsConfig;
    qualifyingScores?: QualifyingScoresConfig;
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
    role: 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'athlete';
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

// Season Types
export interface Season {
    id: string;
    hub_id: string;
    name: string;           // e.g., "2025-2026"
    start_date: string;     // ISO date string
    end_date: string;       // ISO date string
    is_current: boolean;
    created_at: string;
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
    season_id: string | null;
    championship_type: ChampionshipType;
    // Joined data
    season?: Season;
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
    type: 'practice' | 'competition' | 'meeting' | 'social' | 'other' | 'camp' | 'fundraiser' | 'private_lesson';
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

export interface EmergencyContact {
    name: string;
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
    schedule_group: string | null; // For A/B schedule groups
    member_id: string;
    member_id_type: 'USAG' | 'AAU' | 'Other' | null;
    tshirt_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | null;
    leo_size: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'AS' | 'AM' | 'AL' | 'AXL' | null;
    gender: 'Male' | 'Female' | null;
    guardian_1: Guardian | null;
    guardian_2: Guardian | null;
    emergency_contact_1: EmergencyContact | null;
    emergency_contact_2: EmergencyContact | null;
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
export type HubRole = 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'athlete';

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

// Default skill events configurations
export const DEFAULT_WAG_SKILL_EVENTS: SkillEvent[] = [
    { id: 'vault', label: 'VT', fullName: 'Vault' },
    { id: 'bars', label: 'UB', fullName: 'Uneven Bars' },
    { id: 'beam', label: 'BB', fullName: 'Balance Beam' },
    { id: 'floor', label: 'FX', fullName: 'Floor Exercise' },
];

export const DEFAULT_MAG_SKILL_EVENTS: SkillEvent[] = [
    { id: 'floor', label: 'FX', fullName: 'Floor Exercise' },
    { id: 'pommel', label: 'PH', fullName: 'Pommel Horse' },
    { id: 'rings', label: 'SR', fullName: 'Still Rings' },
    { id: 'vault', label: 'VT', fullName: 'Vault' },
    { id: 'pbars', label: 'PB', fullName: 'Parallel Bars' },
    { id: 'highbar', label: 'HB', fullName: 'High Bar' },
];

// Predefined event options for adding to skill tracking
export const PREDEFINED_SKILL_EVENTS: SkillEvent[] = [
    { id: 'vault', label: 'VT', fullName: 'Vault' },
    { id: 'bars', label: 'UB', fullName: 'Uneven Bars' },
    { id: 'beam', label: 'BB', fullName: 'Balance Beam' },
    { id: 'floor', label: 'FX', fullName: 'Floor Exercise' },
    { id: 'pommel', label: 'PH', fullName: 'Pommel Horse' },
    { id: 'rings', label: 'SR', fullName: 'Still Rings' },
    { id: 'pbars', label: 'PB', fullName: 'Parallel Bars' },
    { id: 'highbar', label: 'HB', fullName: 'High Bar' },
    { id: 'conditioning', label: 'COND', fullName: 'Conditioning' },
    { id: 'flexibility', label: 'FLEX', fullName: 'Flexibility' },
    { id: 'trampoline', label: 'TRA', fullName: 'Trampoline' },
    { id: 'tumbling', label: 'TUM', fullName: 'Tumbling' },
];

export interface CompetitionScore {
    id: string;
    competition_id: string;
    gymnast_profile_id: string;
    event: GymEvent;
    score: number | null;
    placement: number | null;
    gymnast_level: string | null;  // Snapshot of level at score entry time
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
export type SkillStatus = 'none' | 'learning' | 'achieved' | 'mastered' | 'injured';

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
    mastered: { label: 'Mastered', icon: '★', color: 'text-yellow-500', bgColor: 'bg-yellow-50' },
    injured: { label: 'Injured', icon: '⚠', color: 'text-red-500', bgColor: 'bg-red-50' }
};

// ============================================
// Assignment Types
// ============================================

// Assignment event types (training events, not competition events)
export type AssignmentEventType =
    | 'vault' | 'bars' | 'beam' | 'floor'
    | 'strength' | 'flexibility' | 'conditioning';

export const ASSIGNMENT_EVENTS: AssignmentEventType[] = [
    'vault', 'bars', 'beam', 'floor', 'strength', 'flexibility', 'conditioning'
];

export const ASSIGNMENT_EVENT_LABELS: Record<AssignmentEventType, string> = {
    vault: 'Vault',
    bars: 'Bars',
    beam: 'Beam',
    floor: 'Floor',
    strength: 'Strength',
    flexibility: 'Flexibility',
    conditioning: 'Conditioning'
};

export const ASSIGNMENT_EVENT_COLORS: Record<AssignmentEventType, { bg: string; border: string; text: string }> = {
    vault: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700' },
    bars: { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-700' },
    beam: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700' },
    floor: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
    strength: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
    flexibility: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700' },
    conditioning: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700' }
};

// Completed items tracking: { "vault": [0, 2, 4], "bars": [1, 3] }
export interface CompletedItems {
    [eventKey: string]: number[];
}

export interface GymnastAssignment {
    id: string;
    hub_id: string;
    gymnast_profile_id: string;
    date: string;
    vault: string;
    bars: string;
    beam: string;
    floor: string;
    strength: string;
    flexibility: string;
    conditioning: string;
    completed_items: CompletedItems;
    notes: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    gymnast_profiles?: GymnastProfile;
}

// Station assignments for level-wide training
export interface SideStation {
    id: string;
    content: string;
}

export interface MainStation {
    id: string;
    content: string;
    side_stations: SideStation[];
}

export interface StationAssignment {
    id: string;
    hub_id: string;
    date: string;
    level: string;
    event: AssignmentEventType;
    stations: MainStation[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// Template types
export type AssignmentTemplateType = 'checklist' | 'stations';

// Reusable exercise templates
export interface AssignmentTemplate {
    id: string;
    hub_id: string;
    name: string;
    event: AssignmentEventType;
    template_type: AssignmentTemplateType;
    exercises: string; // For checklist templates
    stations: MainStation[] | null; // For station templates
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Goals & Assessment Types
// ============================================

export interface GymnastGoal {
    id: string;
    gymnast_profile_id: string;
    title: string;
    description: string | null;
    event: string | null; // NULL for overall goals
    target_date: string | null;
    completed_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    subgoals?: GymnastSubgoal[];
}

export interface GymnastSubgoal {
    id: string;
    goal_id: string;
    title: string;
    target_date: string | null;
    completed_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface GymnastAssessment {
    id: string;
    gymnast_profile_id: string;
    strengths: string;
    weaknesses: string;
    overall_plan: string;
    injuries: string;
    created_at: string;
    updated_at: string;
}

// ============================================
// Resource Types
// ============================================

export type ResourceType = 'link' | 'file';

export interface HubResource {
    id: string;
    hub_id: string;
    name: string;
    description: string | null;
    url: string;
    type: ResourceType;
    category: string | null;
    file_type: string | null;
    file_size: number | null;
    created_by: string | null;
    created_at: string;
    updated_at: string | null;
    // Joined data
    profiles?: { full_name: string; avatar_url: string | null };
}

export interface HubResourceCategory {
    id: string;
    hub_id: string;
    name: string;
    display_order: number;
    created_at: string;
}

// ============================================
// Notification Types
// ============================================

export type NotificationFeature =
    | 'messages'
    | 'groups'
    | 'calendar'
    | 'competitions'
    | 'scores'
    | 'skills'
    | 'assignments'
    | 'marketplace'
    | 'resources';

export interface NotificationCounts {
    messages: number;       // Count of unread messages
    groups: boolean;        // Has new posts
    calendar: boolean;      // Has new events
    competitions: boolean;  // Has new/updated competitions
    scores: boolean;        // Has new scores
    skills: boolean;        // Has skill updates
    assignments: boolean;   // Has new assignments
    marketplace: boolean;   // Has new items
    resources: boolean;     // Has new resources
}

export interface UserHubNotification {
    id: string;
    user_id: string;
    hub_id: string;
    messages_last_viewed_at: string | null;
    groups_last_viewed_at: string | null;
    calendar_last_viewed_at: string | null;
    competitions_last_viewed_at: string | null;
    scores_last_viewed_at: string | null;
    skills_last_viewed_at: string | null;
    assignments_last_viewed_at: string | null;
    marketplace_last_viewed_at: string | null;
    resources_last_viewed_at: string | null;
    created_at: string;
    updated_at: string;
}

// ============================================
// Schedule Types
// ============================================

// Weekly practice schedule for levels
export interface PracticeSchedule {
    id: string;
    hub_id: string;
    level: string;
    schedule_group: string; // 'A', 'B', etc.
    group_label: string | null; // Custom label like "Level 5A - Mon/Wed"
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    start_time: string; // TIME format: "16:00:00"
    end_time: string;
    is_external_group: boolean; // True for groups not in hub roster (e.g., Preteam, Boys, Xcel)
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

// Rotation events (activities like Vault, Bars, custom events)
export interface RotationEvent {
    id: string;
    hub_id: string;
    name: string;
    color: string; // Hex color like "#10b981"
    is_default: boolean;
    display_order: number;
    created_by: string | null;
    created_at: string;
}

// Daily rotation blocks (tied to day of week, not specific dates)
export interface RotationBlock {
    id: string;
    hub_id: string;
    day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    level: string;
    schedule_group: string;
    rotation_event_id: string | null;
    event_name: string | null; // Fallback if event is deleted
    start_time: string; // TIME format: "16:00:00"
    end_time: string;
    color: string | null; // Override color, uses event color if null
    notes: string | null;
    coach_id: string | null; // Assigned coach
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    rotation_event?: RotationEvent;
    coach?: { id: string; full_name: string };
}

// Color definitions for rotation events
export const ROTATION_EVENT_COLORS: Record<string, { bg: string; border: string; text: string; hex: string }> = {
    vault: { bg: 'bg-emerald-100', border: 'border-emerald-300', text: 'text-emerald-700', hex: '#10b981' },
    bars: { bg: 'bg-sky-100', border: 'border-sky-300', text: 'text-sky-700', hex: '#0ea5e9' },
    beam: { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-700', hex: '#ec4899' },
    floor: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700', hex: '#f59e0b' },
    strength: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700', hex: '#ef4444' },
    flexibility: { bg: 'bg-violet-100', border: 'border-violet-300', text: 'text-violet-700', hex: '#8b5cf6' },
    conditioning: { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-700', hex: '#06b6d4' },
};

// Default rotation events to seed for new hubs
export const DEFAULT_ROTATION_EVENTS = [
    { name: 'Vault', color: '#10b981', display_order: 0 },
    { name: 'Bars', color: '#0ea5e9', display_order: 1 },
    { name: 'Beam', color: '#ec4899', display_order: 2 },
    { name: 'Floor', color: '#f59e0b', display_order: 3 },
    { name: 'Strength', color: '#ef4444', display_order: 4 },
    { name: 'Flexibility', color: '#8b5cf6', display_order: 5 },
    { name: 'Conditioning', color: '#06b6d4', display_order: 6 },
];

// Day of week labels
export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================
// Attendance Types
// ============================================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'left_early';

export interface AttendanceRecord {
    id: string;
    hub_id: string;
    gymnast_profile_id: string;
    attendance_date: string; // ISO date string
    status: AttendanceStatus;
    check_in_time: string | null;
    check_out_time: string | null;
    notes: string | null;
    marked_by: string | null;
    marked_at: string;
    created_at: string;
    updated_at: string;
    // Joined data
    gymnast_profile?: GymnastProfile;
    marked_by_profile?: { id: string; full_name: string };
}

// Attendance metrics for a gymnast
export interface AttendanceMetrics {
    gymnast_profile_id: string;
    total_scheduled: number;
    total_present: number;
    total_late: number;
    total_absent: number;
    total_left_early: number;
    attendance_percentage: number;
    consecutive_absences: number;
}

// Level-wide attendance metrics
export interface LevelAttendanceMetrics {
    level: string;
    total_gymnasts: number;
    average_attendance_percentage: number;
    gymnasts_with_warnings: number; // 3+ consecutive absences
}

// ============================================
// Private Lessons Types
// ============================================

// Lesson package (pricing/duration option)
export interface LessonPackage {
    id: string;
    hub_id: string;
    coach_user_id: string;
    name: string;
    duration_minutes: number;
    max_gymnasts: number;
    price: number;
    description: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

// Coach's lesson profile/offerings
export interface CoachLessonProfile {
    id: string;
    hub_id: string;
    coach_user_id: string;
    events: string[];
    levels: string[];
    cost_per_lesson: number;
    max_gymnasts_per_slot: number;
    lesson_duration_minutes: number;
    bio: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Joined data
    coach_profile?: Profile;
    packages?: LessonPackage[];
}

// Weekly recurring availability template
export interface LessonAvailability {
    id: string;
    hub_id: string;
    coach_user_id: string;
    day_of_week: number; // 0 = Sunday, 6 = Saturday
    start_time: string; // TIME format: "16:00:00"
    end_time: string;
    effective_from: string | null;
    effective_until: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Lesson slot status
export type LessonSlotStatus = 'available' | 'partial' | 'booked' | 'cancelled';

// Specific bookable time slot
export interface LessonSlot {
    id: string;
    hub_id: string;
    coach_user_id: string;
    slot_date: string; // ISO date string
    start_time: string;
    end_time: string;
    max_gymnasts: number;
    status: LessonSlotStatus;
    availability_id: string | null;
    package_id: string | null;
    is_one_off: boolean;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    coach_profile?: Profile;
    bookings?: LessonBooking[];
    package?: LessonPackage;
}

// Lesson booking status
export type LessonBookingStatus = 'confirmed' | 'cancelled';

// Lesson booking record
export interface LessonBooking {
    id: string;
    hub_id: string;
    lesson_slot_id: string;
    booked_by_user_id: string;
    gymnast_profile_id: string;
    event: string;
    status: LessonBookingStatus;
    cancelled_at: string | null;
    cancelled_by: string | null;
    cancellation_reason: string | null;
    calendar_event_id: string | null;
    cost: number;
    created_at: string;
    updated_at: string;
    // Joined data
    gymnast_profile?: GymnastProfile;
    booked_by?: Profile;
    lesson_slot?: LessonSlot;
}
