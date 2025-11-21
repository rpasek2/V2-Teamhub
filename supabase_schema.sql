-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (Public user info)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Organizations
create table if not exists organizations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references profiles(id) not null,
  branding jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Hubs (Programs)
create table if not exists hubs (
  id uuid default uuid_generate_v4() primary key,
  organization_id uuid references organizations(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  settings jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Hub Members
create type hub_role as enum ('owner', 'director', 'admin', 'coach', 'parent', 'gymnast');

create table if not exists hub_members (
  hub_id uuid references hubs(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role hub_role not null,
  permissions jsonb default '{}'::jsonb,
  status text default 'active', -- active, invited, suspended
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (hub_id, user_id)
);

-- RLS Policies (Basic Setup)
alter table profiles enable row level security;
alter table organizations enable row level security;
alter table hubs enable row level security;
alter table hub_members enable row level security;

-- Profiles: Public read, Owner write
create policy "Public profiles are viewable by everyone." on profiles for select using (true);
create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on profiles for update using (auth.uid() = id);

-- Organizations: Read by members (simplified for now: read by everyone for dev), Write by owner
create policy "Orgs viewable by everyone (dev)." on organizations for select using (true);
create policy "Owners can insert orgs." on organizations for insert with check (auth.uid() = owner_id);

-- Hubs: Read by everyone (for joining), Write by Org Owner (simplified)
create policy "Hubs viewable by everyone." on hubs for select using (true);
create policy "Authenticated users can insert hubs." on hubs for insert with check (auth.role() = 'authenticated');

-- Hub Members: Read by members, Write by admins (simplified)
create policy "Members viewable by hub members." on hub_members for select using (true);
create policy "Authenticated users can join hubs." on hub_members for insert with check (auth.role() = 'authenticated');

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Events
create table if not exists events (
  id uuid default uuid_generate_v4() primary key,
  hub_id uuid references hubs(id) on delete cascade not null,
  title text not null,
  description text,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  location text,
  type text check (type in ('practice', 'competition', 'meeting', 'social', 'other')) default 'practice',
  rsvp_enabled boolean default true,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Events RLS
alter table events enable row level security;

create policy "Events viewable by hub members." on events for select
  using (
    auth.uid() in (
      select user_id from hub_members where hub_id = events.hub_id
    )
  );

create policy "Events insertable by staff." on events for insert
  with check (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = events.hub_id
      and role in ('owner', 'admin', 'director', 'coach')
    )
  );

create policy "Events updatable by staff." on events for update
  using (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = events.hub_id
      and role in ('owner', 'admin', 'director', 'coach')
    )
  );

create policy "Events deletable by staff." on events for delete
  using (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = events.hub_id
      and role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- 6. Channels
create table if not exists channels (
  id uuid default uuid_generate_v4() primary key,
  hub_id uuid references hubs(id) on delete cascade not null,
  name text not null,
  description text,
  type text check (type in ('public', 'private')) default 'public',
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Messages
create table if not exists messages (
  id uuid default uuid_generate_v4() primary key,
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Channels RLS
alter table channels enable row level security;

create policy "Channels viewable by hub members." on channels for select
  using (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = channels.hub_id
    )
  );

create policy "Channels insertable by staff." on channels for insert
  with check (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = channels.hub_id
      and role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Messages RLS
alter table messages enable row level security;

create policy "Messages viewable by hub members." on messages for select
  using (
    exists (
      select 1 from hub_members
      join channels on channels.id = messages.channel_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = channels.hub_id
    )
  );

create policy "Messages insertable by hub members." on messages for insert
  with check (
    exists (
      select 1 from hub_members
      join channels on channels.id = messages.channel_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = channels.hub_id
    )
  );

-- Enable Realtime for Messages
alter publication supabase_realtime add table messages;

-- 8. Event RSVPs
create table if not exists event_rsvps (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references events(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  status text check (status in ('going', 'not_going', 'maybe')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(event_id, user_id)
);

-- Event RSVPs RLS
alter table event_rsvps enable row level security;

create policy "RSVPs viewable by hub members." on event_rsvps for select
  using (
    exists (
      select 1 from events
      join hub_members on hub_members.hub_id = events.hub_id
      where events.id = event_rsvps.event_id
      and hub_members.user_id = auth.uid()
    )
  );

create policy "RSVPs insertable by user." on event_rsvps for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from events
      join hub_members on hub_members.hub_id = events.hub_id
      where events.id = event_rsvps.event_id
      and hub_members.user_id = auth.uid()
    )
  );

create policy "RSVPs updatable by user." on event_rsvps for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "RSVPs deletable by user." on event_rsvps for delete

-- Session Gymnasts
create table if not exists session_gymnasts (
  session_id uuid references competition_sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (session_id, user_id)
);

-- Session Gymnasts RLS
alter table session_gymnasts enable row level security;

create policy "Session gymnasts viewable by hub members." on session_gymnasts for select
  using (
    exists (
      select 1 from hub_members
      join competition_sessions on competition_sessions.id = session_gymnasts.session_id
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Session gymnasts manageable by staff." on session_gymnasts for all
  using (
    exists (
      select 1 from hub_members
      join competition_sessions on competition_sessions.id = session_gymnasts.session_id
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

create table if not exists competition_documents (
  id uuid default gen_random_uuid() primary key,
  competition_id uuid references competitions(id) on delete cascade not null,
  name text not null,
  url text not null,
  type text not null check (type in ('link', 'file')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Competition Documents RLS
alter table competition_documents enable row level security;

create policy "Competition documents viewable by hub members." on competition_documents for select
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_documents.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Competition documents manageable by staff." on competition_documents for all
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_documents.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Storage Policies for 'Competitions' bucket
-- Note: The bucket 'Competitions' must be created in the Supabase dashboard.

create policy "Competitions documents viewable by hub members"
  on storage.objects for select
  using (
    bucket_id = 'Competitions'
    and exists (
      select 1 from competitions
      join hub_members on hub_members.hub_id = competitions.hub_id
      where competitions.id::text = split_part(name, '/', 1)
      and hub_members.user_id = auth.uid()
    )
  );

create policy "Competitions documents manageable by staff"
  on storage.objects for insert
  with check (
    bucket_id = 'Competitions'
    and exists (
      select 1 from competitions
      join hub_members on hub_members.hub_id = competitions.hub_id
      where competitions.id::text = split_part(name, '/', 1)
      and hub_members.user_id = auth.uid()
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

create policy "Competitions documents deletable by staff"
  on storage.objects for delete
  using (
    bucket_id = 'Competitions'
    and exists (
      select 1 from competitions
      join hub_members on hub_members.hub_id = competitions.hub_id
      where competitions.id::text = split_part(name, '/', 1)
      and hub_members.user_id = auth.uid()
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );
