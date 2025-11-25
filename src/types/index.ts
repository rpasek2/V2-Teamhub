// Centralized type definitions for Teamhub V2

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
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
    competitions?: RolePermissions;
    groups?: RolePermissions;
    [key: string]: RolePermissions | undefined;
}

export interface HubSettings {
    permissions?: HubPermissions;
    levels?: string[];
}

export interface Hub {
    id: string;
    name: string;
    slug: string;
    organization_id: string;
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
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
}

export interface MedicalInfo {
    allergies: string;
    medications: string;
    conditions: string;
    notes: string;
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
    gender: 'Male' | 'Female' | 'Other' | null;
    guardian_1: Guardian | null;
    guardian_2: Guardian | null;
    medical_info: MedicalInfo | null;
    created_at: string;
    updated_at: string;
}
