# Data Models & Schema

> **Last Updated:** 2026-02-21

## Database Overview

- **Platform:** Supabase (PostgreSQL 15+)
- **Security:** Row Level Security (RLS) on all tables
- **Migrations:** 100+ versioned migrations

## Core Tables

### Users & Auth

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, email, full_name, avatar_url, organization |
| `organizations` | Top-level entities | id, name |

### Hubs (Teams)

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hubs` | Programs/teams | id, name, organization_id, sport_type, settings |
| `hub_members` | Membership | hub_id, user_id, role |
| `hub_invites` | Invite codes | hub_id, code, role, max_uses, expires_at |

**Hub Settings (JSONB):**
```json
{
  "levels": ["Level 3", "Level 4", ...],
  "permissions": { "roster": { "coach": "all" }, ... },
  "enabledTabs": ["roster", "calendar", ...],
  "showBirthdays": true,
  "anonymousReportsEnabled": true
}
```

### Gymnast Profiles

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `gymnast_profiles` | Athlete info | id, hub_id, first_name, last_name, level, gender, date_of_birth |

**JSONB Fields:**
- `guardian_1`, `guardian_2`: name, relationship, email, phone
- `emergency_contact_1`, `emergency_contact_2`: name, relationship, phone
- `medical_info`: allergies, medications, conditions, notes

### Gymnast Features

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `gymnast_goals` | Goals | gymnast_profile_id, title, event, target_date, completed_at |
| `gymnast_subgoals` | Goal milestones | goal_id, title, completed |
| `gymnast_assessments` | Coach assessments | gymnast_profile_id, strengths, weaknesses, overall_plan, injuries |
| `gymnast_skills` | Skill tracking | gymnast_profile_id, hub_event_skill_id, status, achieved_date |

## Calendar & Events

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `events` | Calendar events | hub_id, title, start_time, end_time, event_type, location |
| `event_rsvps` | RSVP responses | event_id, user_id, gymnast_profile_id, status |

**Event Types:** practice, competition, team_event, fundraiser, parent_meeting, other

## Competitions

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `seasons` | Season definitions | hub_id, name, start_date, end_date |
| `competitions` | Meets | hub_id, season_id, name, venue, start_date, championship_type |
| `competition_sessions` | Sessions | competition_id, name, date, warmup_time |
| `competition_gymnasts` | Meet roster | competition_id, gymnast_profile_id |
| `competition_gymnast_events` | Event entries | competition_gymnast_id, event |
| `session_gymnasts` | Session assignments | session_id, gymnast_profile_id |
| `session_coaches` | Coach assignments | session_id, user_id |
| `competition_scores` | Scores | competition_id, gymnast_profile_id, event, score |
| `competition_team_placements` | Team results | competition_id, level, place |
| `competition_documents` | Meet docs | competition_id, name, url |

**Championship Types:** null, state, regional, national

## Groups & Social

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `groups` | Team groups | hub_id, name, type, auto_assign_levels |
| `group_members` | Membership | group_id, user_id, role |
| `posts` | Group posts | group_id, user_id, content, attachment_type |
| `comments` | Post comments | post_id, user_id, content |
| `poll_responses` | Poll votes | post_id, user_id, option_index |
| `signup_responses` | Signup slots | post_id, user_id, slot_index |
| `rsvp_responses` | RSVP replies | post_id, user_id, response |
| `group_post_reads` | Read tracking | post_id, user_id, read_at |

**Post Attachment Types:** poll, signup, rsvp, files, images

## Messaging

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `channels` | DM channels | hub_id, name, type, created_by |
| `channel_members` | Participants | channel_id, user_id |
| `messages` | Chat messages | channel_id, sender_id, content |
| `channel_reads` | Read tracking | channel_id, user_id, last_read_at |
| `anonymous_reports` | Anonymous reports | hub_id, user_id, subject, content |

## Skills

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_event_skills` | Skill definitions | hub_id, event, level, skill_name, display_order |
| `gymnast_skills` | Athlete progress | gymnast_profile_id, hub_event_skill_id, status |

**Skill Status:** none, achieved, compete_ready, mastered, injured

## Assignments

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `assignments` | Practice assignments | hub_id, level, date, title, content, stations |
| `assignment_completions` | Completion tracking | assignment_id, gymnast_profile_id, completed_at |
| `assignment_templates` | Reusable templates | hub_id, level, title, content, stations |
| `station_assignments` | Station work | hub_id, gymnast_profile_id, date, station, content |
| `station_templates` | Station templates | hub_id, name, stations |

## Schedule & Attendance

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `practice_schedules` | Weekly times | hub_id, level, schedule_group, day_of_week, start_time, end_time |
| `rotation_events` | Rotation types | hub_id, name, color, display_order |
| `rotation_blocks` | Grid blocks | hub_id, day_of_week, level, schedule_group, start_time, end_time, rotation_event_id |
| `rotation_grid_settings` | Grid customization | hub_id, day_of_week, column_order, column_names, hidden_columns |
| `attendance_records` | Daily attendance | hub_id, gymnast_profile_id, date, status, recorded_by |

**Attendance Status:** present, late, left_early, absent

## Staff

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `staff_profiles` | Staff info | user_id, hub_id, title, phone, hire_date |
| `staff_schedules` | Work schedules | staff_profile_id, day_of_week, start_time, end_time |
| `staff_responsibilities` | Duties | staff_profile_id, description |
| `staff_certifications` | Credentials | staff_profile_id, name, expires_at |
| `staff_tasks` | Task assignments | hub_id, user_id, title, due_date, completed_at |
| `staff_time_off` | Time off | staff_profile_id, start_date, end_date, status |
| `staff_notes` | Private notes | staff_profile_id, note, created_by |

## Mentorship

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `mentorship_pairs` | Big/Little pairs | hub_id, mentor_id, mentee_id, season_name |
| `mentorship_events` | Mentorship events | hub_id, title, event_type, date |
| `mentorship_attendance` | Event attendance | mentorship_event_id, pair_id, attended |

## Marketplace

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `marketplace_items` | Listed items | hub_id, user_id, title, price, status |
| `marketplace_hub_links` | Cross-hub links | source_hub_id, linked_hub_id |

## Resources

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `hub_resources` | Documents | hub_id, title, category, url |
| `hub_resource_categories` | Categories | hub_id, name, display_order |

## Private Lessons

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `coach_lesson_settings` | Coach setup | user_id, hub_id, duration_minutes, price |
| `coach_availability` | Time slots | coach_lesson_setting_id, day_of_week, start_time, end_time |
| `private_lessons` | Bookings | hub_id, coach_id, gymnast_profile_id, start_time, status |
| `lesson_packages` | Package deals | hub_id, name, lesson_count, price |

## Notifications & Push

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `notifications` | All in-app notifications | user_id, hub_id, type, title, body, reference_id, read |
| `user_notification_preferences` | Per-feature toggles | user_id, hub_id, messages_enabled, calendar_enabled, etc. |
| `user_push_tokens` | Device push tokens | user_id, token, platform, is_active |
| `user_hub_notifications` | Last seen timestamps | user_id, hub_id, category, last_seen_at |
| `parent_privacy_settings` | Privacy | user_id, hub_id, settings |

**Push notification delivery:** Trigger on `notifications` INSERT calls `send_push_notification()` which looks up active tokens, checks user preferences, and calls Expo Push API via `pg_net`.

## Role Enum

```sql
CREATE TYPE hub_role AS ENUM (
  'owner',
  'director',
  'admin',
  'coach',
  'parent',
  'athlete'
);
```

## RLS Policy Pattern

```sql
-- Hub member access
CREATE POLICY "access" ON table_name
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM hub_members
    WHERE hub_members.hub_id = table_name.hub_id
    AND hub_members.user_id = auth.uid()
  )
);

-- Staff-only modification
CREATE POLICY "modify" ON table_name
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM hub_members
    WHERE hub_members.hub_id = table_name.hub_id
    AND hub_members.user_id = auth.uid()
    AND hub_members.role IN ('owner', 'director', 'admin', 'coach')
  )
);
```

## Storage Buckets

| Bucket | Purpose |
|--------|---------|
| `avatars` | Profile photos |
| `group-files` | Group attachments |
| `competition-documents` | Meet documents |
| `resources` | Hub resources |
| `floor-music` | Gymnast floor music audio files |
