# Database Schema (Supabase / PostgreSQL)

## Core Tables
- `profiles` - User data (id, email, full_name, avatar_url)
- `organizations` - Top-level entities
- `hubs` - Programs/teams (settings JSONB for permissions, levels, enabledTabs, showBirthdays)
- `hub_members` - Membership with role enum (owner, director, admin, coach, parent, athlete)
- `gymnast_profiles` - Extended athlete info (DOB, level, sizes, guardians JSONB, emergency_contact_1/2 JSONB, medical_info JSONB)

## Feature Tables

### Calendar & Events
- `events`, `event_rsvps` - Calendar with RSVP (events have `is_all_day`, `is_save_the_date` flags)

### Seasons & Competitions
- `seasons` - Season definitions for organizing competitions and scores
- `competitions` - Competition events (name, start_date, end_date, location, season_id, championship_type)
- `competition_sessions` - Time slots within a competition
- `competition_gymnasts` - Links gymnasts to competitions (gymnast_profile_id, age_group)
- `competition_scores` - Individual scores (gymnast_profile_id, event, score, placement, gymnast_level)
- `competition_team_placements` - Team placements (level, gender, event, placement)
- `competition_documents` - Attached files

### Social / Groups
- `groups`, `group_members`, `posts`, `comments`, `post_reactions` - Social features
- `poll_responses`, `signup_responses`, `rsvp_responses` - Post interactions

### Messaging
- `channels` - DM channels use type `private` with `dm_participant_ids` array (NOT type `dm`)
- `messages` - Message content
- `channel_members` - Tracks `last_read_at` for unread counts

### Skills & Goals
- `hub_event_skills`, `gymnast_skills` - Skills tracking
- `gymnast_goals`, `gymnast_subgoals` - Gymnast goal tracking with milestones

### Staff
- `staff_profiles`, `staff_schedules`, `staff_responsibilities`, `staff_tasks`, `staff_time_off`, `staff_notes`

### Schedule & Attendance
- `practice_schedules`, `rotation_events`, `rotation_blocks`, `station_assignments` - Weekly schedule and daily rotations
- `attendance_records` - Daily attendance tracking (status: present, late, left_early, absent)

### Assignments
- `assignments`, `assignment_templates` - Coach assignments with template support

### Private Lessons
- `coach_lesson_profiles`, `lesson_packages`, `lesson_availability`, `lesson_slots`, `lesson_bookings`

### Other
- `anonymous_reports` - Anonymous report submissions
- `marketplace_items`, `marketplace_hub_links` - Marketplace
- `mentorship_pairs`, `mentorship_events` - Big/Little program
- `hub_resources`, `hub_resource_categories` - Shared files and documents
- `notifications` - In-app notifications (actor_id FK points to `profiles(id)`)
- `user_push_tokens` - Device push notification tokens

## Key Database Functions (RPC)
- `mark_channel_read(p_channel_id)` — SECURITY DEFINER, upserts `channel_members.last_read_at`
- `send_push_notification()` — trigger on `notifications` INSERT, sends via Expo Push API through `pg_net`
- `notify_new_message()` — trigger on `messages` INSERT, checks `dm_participant_ids IS NOT NULL`
- `get_notification_counts(p_hub_id, p_user_id)` — drives web sidebar badges
- `auto_create_dm_channel_members` — trigger on `channels` INSERT, creates `channel_members` rows for DM participants

## Storage Buckets
- `competition-documents` - Competition file attachments
- `group-files` - Group post attachments
- `avatars` - User profile photos
- `resources` - Hub shared resources
- `Competitions` - Competition media
