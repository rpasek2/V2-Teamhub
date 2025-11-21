// Centralized type definitions for Teamhub V2

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
}

export interface Hub {
    id: string;
    name: string;
    slug: string;
    organization_id: string;
    settings: any;
}

export interface HubMember {
    hub_id: string;
    user_id: string;
    role: 'owner' | 'director' | 'admin' | 'coach' | 'parent' | 'gymnast';
    permissions: any;
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

export interface Post {
    id: string;
    group_id: string;
    user_id: string;
    content: string;
    image_url: string | null;
    created_at: string;
    profiles?: Profile;
    _count?: {
        comments: number;
    };
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
