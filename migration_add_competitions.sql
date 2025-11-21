
-- 6. Competitions
create table if not exists competitions (
  id uuid default uuid_generate_v4() primary key,
  hub_id uuid references hubs(id) on delete cascade not null,
  name text not null,
  start_date date not null,
  end_date date not null,
  location text,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Competition Gymnasts (Roster for a specific meet)
create table if not exists competition_gymnasts (
  competition_id uuid references competitions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (competition_id, user_id)
);

-- Competition Sessions
create table if not exists competition_sessions (
  id uuid default uuid_generate_v4() primary key,
  competition_id uuid references competitions(id) on delete cascade not null,
  name text not null,
  date date not null,
  warmup_time time,
  awards_time time,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Session Coaches
create table if not exists session_coaches (
  session_id uuid references competition_sessions(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (session_id, user_id)
);

-- Competition Documents
create table if not exists competition_documents (
  id uuid default uuid_generate_v4() primary key,
  competition_id uuid references competitions(id) on delete cascade not null,
  name text not null,
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Competitions RLS
alter table competitions enable row level security;
alter table competition_gymnasts enable row level security;
alter table competition_sessions enable row level security;
alter table session_coaches enable row level security;
alter table competition_documents enable row level security;

-- Competitions: Viewable by hub members, Insertable by staff
create policy "Competitions viewable by hub members." on competitions for select
  using (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = competitions.hub_id
    )
  );

create policy "Competitions insertable by staff." on competitions for insert
  with check (
    exists (
      select 1 from hub_members
      where user_id = auth.uid()
      and hub_id = competitions.hub_id
      and role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Competition Gymnasts: Viewable by hub members, Manageable by staff
create policy "Comp gymnasts viewable by hub members." on competition_gymnasts for select
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_gymnasts.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Comp gymnasts manageable by staff." on competition_gymnasts for all
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_gymnasts.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Competition Sessions: Viewable by hub members, Manageable by staff
create policy "Comp sessions viewable by hub members." on competition_sessions for select
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Comp sessions manageable by staff." on competition_sessions for all
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Session Coaches: Viewable by hub members, Manageable by staff
create policy "Session coaches viewable by hub members." on session_coaches for select
  using (
    exists (
      select 1 from hub_members
      join competition_sessions on competition_sessions.id = session_coaches.session_id
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Session coaches manageable by staff." on session_coaches for all
  using (
    exists (
      select 1 from hub_members
      join competition_sessions on competition_sessions.id = session_coaches.session_id
      join competitions on competitions.id = competition_sessions.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );

-- Competition Documents: Viewable by hub members, Manageable by staff
create policy "Comp docs viewable by hub members." on competition_documents for select
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_documents.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
    )
  );

create policy "Comp docs manageable by staff." on competition_documents for all
  using (
    exists (
      select 1 from hub_members
      join competitions on competitions.id = competition_documents.competition_id
      where hub_members.user_id = auth.uid()
      and hub_members.hub_id = competitions.hub_id
      and hub_members.role in ('owner', 'admin', 'director', 'coach')
    )
  );
