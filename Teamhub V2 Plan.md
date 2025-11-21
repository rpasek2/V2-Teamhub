# Teamhub V2 - Comprehensive Development Plan

**Vision:** A premium, multi-tenant team management platform for gymnastics (and other sports) that streamlines communication, roster management, event scheduling, and performance tracking.
**Design Philosophy:** "No Grey Boxes" - Modern, vibrant, clean, and intuitive UI/UX.
**Architecture:** Single Page Application (SPA) with a robust relational backend.

---

## 1. Technology Stack

*   **Frontend:**
    *   **Framework:** React 18+ (Vite)
    *   **Language:** TypeScript
    *   **Styling:** Tailwind CSS (Custom Design System, no generic libraries unless styled heavily)
    *   **Icons:** Lucide React
    *   **State Management:** React Context + Hooks (or Zustand for complex global state)
    *   **Routing:** React Router DOM v6
*   **Backend (BaaS):**
    *   **Platform:** Supabase
    *   **Database:** PostgreSQL
    *   **Auth:** Supabase Auth (GoTrue)
    *   **Storage:** Supabase Storage (Images, Videos, Docs)
    *   **Realtime:** Supabase Realtime (Chat, Notifications)

---

## 2. Core Architecture & Multi-Tenancy

The app follows a **Hierarchical Multi-Tenancy** model:
1.  **Organization:** The top-level entity (e.g., "Elite Gymnastics Academy"). Holds billing and global branding.
2.  **Hub (Program):** A distinct program within the organization (e.g., "DP Program", "Xcel Program", "Boys Team").
    *   Data (Roster, Events, Chat) is scoped to a **Hub**.
    *   Users can belong to multiple Hubs within an Organization (or across Organizations).

*   **User Identity:** Global (Email/Password).
*   **Roles:**
    *   **Org Owner:** Owns the Organization. Full access to all Hubs.
    *   **Hub Director:** Manages a specific Hub/Program (e.g., Head Coach of DP).
    *   **Admin:** Staff or Booster Club members.
    *   **Coach:** Roster management, scheduling, scoring.
    *   **Parent:** Linked to gymnasts in specific Hubs.
    *   **Gymnast:** (Future)
    *   *Note: Permissions for Admin, Coach, Parent, and Gymnast are all configurable by the Org Owner or Hub Director via Hub Settings.*

---

## 3. Database Schema (PostgreSQL)

### A. Core Tables
*   **`organizations`**
    *   `id` (UUID, PK)
    *   `name` (Text) - e.g., "Elite Gymnastics Academy"
    *   `owner_id` (UUID, ref profiles)
    *   `branding` (JSONB) - { primaryColor, logoUrl }
    *   `created_at` (Timestamp)
*   **`hubs`** (Programs)
    *   `id` (UUID, PK)
    *   `organization_id` (UUID, ref organizations)
    *   `name` (Text) - e.g., "DP Program"
    *   `slug` (Text, Unique)
    *   `name` (Text) - e.g., "DP Program"
    *   `slug` (Text, Unique)
    *   `settings` (JSONB) - { permissions: { coach: [...], parent: [...] }, enabled_features: ['skills', 'big_little', 'marketplace', ...], features: [...] }
    *   `created_at` (Timestamp)
    *   `created_at` (Timestamp)
*   **`profiles`** (Public user info)
    *   `id` (UUID, PK, ref auth.users)
    *   `email` (Text)
    *   `full_name` (Text)
    *   `avatar_url` (Text)
    *   `created_at` (Timestamp)
*   **`hub_members`** (Junction: User <-> Hub)
    *   `hub_id` (UUID, ref hubs)
    *   `user_id` (UUID, ref profiles)
    *   `role` (Enum: director, admin, coach, parent, gymnast)
    *   `permissions` (JSONB)
    *   `status` (Enum: active, invited, suspended)

### B. Level & Roster Management
*   **`levels`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID, ref hubs)
    *   `name` (Text) - e.g., "Level 3", "Silver"
    *   `order` (Integer) - For sorting
    *   `permissions` (JSONB) - { visibleTabs: ['schedule', 'scores'], features: [...] }
    *   `created_at` (Timestamp)
*   **`gymnasts`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID, ref hubs)
    *   `level_id` (UUID, ref levels)
    *   `first_name` (Text)
    *   `last_name` (Text)
    *   `dob` (Date)
    *   `active` (Boolean)
    *   `medical_info` (JSONB)
    *   `apparel_sizes` (JSONB)
*   **`gymnast_parents`** (Junction)
    *   `gymnast_id` (UUID)
    *   `user_id` (UUID) - The parent

### C. Communication (Realtime)
*   **`groups`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID)
    *   `name` (Text)
    *   `type` (Enum: team, level, private, announcement)
    *   `filters` (JSONB) - e.g., { levels: ['L4', 'L5'] } for auto-membership
*   **`group_members`**
    *   `group_id` (UUID)
    *   `user_id` (UUID)
    *   `last_read_at` (Timestamp)
*   **`messages`**
    *   `id` (UUID, PK)
    *   `group_id` (UUID)
    *   `sender_id` (UUID)
    *   `content` (Text)
    *   `attachments` (JSONB)
    *   `created_at` (Timestamp)

### D. Scheduling & Events
*   **`events`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID)
    *   `title` (Text)
    *   `start_time` (Timestamp)
    *   `end_time` (Timestamp)
    *   `type` (Enum: practice, competition, meeting, social)
    *   `location` (Text)
    *   `description` (Text)
    *   `levels` (Array) - Who is this for?
*   **`event_attendance`**
    *   `event_id` (UUID)
    *   `gymnast_id` (UUID)
    *   `status` (Enum: attending, declined, maybe)

### E. Performance (Scores)
*   **`competitions`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID)
    *   `name` (Text)
    *   `date` (Date)
    *   `location` (Text)
*   **`scores`**
    *   `id` (UUID, PK)
    *   `competition_id` (UUID)
    *   `gymnast_id` (UUID)
    *   `event_name` (Text) - e.g., "Vault"
    *   `score` (Decimal)
    *   `rank` (Integer)
    *   `video_url` (Text)

### F. Content & Admin
*   **`announcements`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID)
    *   `author_id` (UUID)
    *   `title` (Text)
    *   `content` (Text)
    *   `priority` (Enum: normal, high, urgent)
    *   `created_at` (Timestamp)
*   **`documents`**
    *   `id` (UUID, PK)
    *   `hub_id` (UUID)
    *   `folder_id` (UUID, nullable)
    *   `name` (Text)
    *   `url` (Text)
    *   `type` (Text) - e.g., "pdf", "image"
    *   `size` (Integer)
*   **`invites`**
    *   `id` (UUID, PK)
    *   `organization_id` (UUID, ref organizations) -- Invites can be Org-wide or Hub-specific
    *   `hub_id` (UUID, nullable) -- If set, auto-adds to this program
    *   `email` (Text, nullable)
    *   `role` (Enum)
    *   `token` (Text, Unique)
    *   `expires_at` (Timestamp)
    *   `status` (Enum: pending, used, expired)

---

## 4. Feature Breakdown

### Phase 1: Foundation (The "Skeleton")
1.  **Auth System:**
    *   Email/Password Login & Registration.
    *   Forgot Password flow.
    *   **Profile Management:** Update name, avatar, and password.
2.  **Onboarding:**
    *   **Create Hub:** Wizard to set up a new program (Name, Branding).
    *   **Join Hub:** Input an Invite Code to join an existing program.
3.  **App Shell:**
    *   **Sidebar Navigation:** Collapsible, responsive, with notification badges.
    *   **Theme Provider:** Dynamic color injection based on Hub branding.
4.  **Hub Settings (Admin Only):**
    *   **Branding:** Upload logo, set primary color.
    *   **Feature Toggles:** Enable/Disable modules (e.g., Marketplace, Big/Little).
    *   **Content Moderation:** View and resolve reported messages/content.

### Phase 2: Roster & People
1.  **Level Management:**
    *   Create/Edit/Delete Levels (e.g., "Bronze", "Silver", "Level 4").
    *   **Level Permissions:** Configure which tabs (Schedule, Scores, etc.) are visible to parents of this level.
2.  **Roster View:**
    *   List of gymnasts grouped by Level.
    *   Search and Filter by name, level, age.
    *   **Gymnast Card:** Quick view of status, level, and parent contact.
3.  **Gymnast Profile:**
    *   **Details:** DOB, Apparel Sizes (Leotard, Warmup, T-Shirt), Medical Info (Allergies, Notes).
    *   **Guardians:** Link multiple parent accounts to one gymnast.
4.  **User Management:**
    *   **Staff List:** Manage Coaches and Admins.
    *   **Invites:** Generate unique tokens for Staff or Parents (Bulk or Individual).

### Phase 3: Communication (The "Pulse")
1.  **Chat Interface:**
    *   Realtime messaging with Supabase Realtime.
    *   **Channels:** Auto-generated groups based on Levels (e.g., "Level 4 Parents", "All Team").
    *   **Direct Messages:** 1:1 or Group DMs.
    *   **Rich Text:** Emoji support, file attachments (Images/Docs).
    *   **Read Receipts:** See who has read a message.
    *   **Reporting:** Users can flag inappropriate messages for Admin review.
2.  **Announcements:**
    *   High-priority blasts that appear at the top of the dashboard.
    *   Push notifications (future) or Email alerts.
    *   "Mark as Read" tracking for compliance.

### Phase 4: Calendar & Events
1.  **Calendar View:**
    *   Monthly, Weekly, and Agenda views.
    *   Filter by Event Type (Practice, Meet, Social) or Level.
    *   **Unified Sync:** Automatically displays ALL date-based items from other modules (Competitions, Big/Little deadlines, etc.).
2.  **Event Management:**
    *   **Create Event:** Title, Time, Location, Description.
    *   **Target Audience:** Assign to specific Levels or the whole team.
    *   **Recurring Events:** Weekly practices (e.g., "Every Mon/Wed").
3.  **RSVP System:**
    *   Parents mark "Attending", "Declined", or "Maybe".
    *   Coaches view attendance summary per event.

### Phase 5: Performance & Media
1.  **Competitions (Meets):**
    *   **Meet Schedule:** Date, Location, Session Times.
    *   **Meet Info:** Link to meet website, admission fees, parking info.
    *   **Auto-Sync:** Automatically appears on the main Calendar.
2.  **Score Tracking:**
    *   **Input:** Coaches or Parents (if allowed) enter scores for each event.
    *   **History:** View a gymnast's score progression over the season.
    *   **Leaderboards:** Top scores by Event and Level (e.g., "Top 3 Vault Scores - Level 4").
3.  **Skills Tracking:**
    *   **Star Charts:** Define required skills per level.
    *   **Progress:** Mark skills as "Learning", "Competent", "Mastered".
    *   **Video Proof:** Upload a video of the skill being performed.
4.  **Media Gallery:**
    *   Upload photos/videos from meets or practice.
    *   Tag gymnasts to make them appear on their profile.

### Phase 6: Community & Extras
1.  **Big & Little:**
    *   **Matching:** Admins pair older gymnasts (Bigs) with younger ones (Littles).
    *   **Reveal:** Digital "reveal" experience for the Little.
    *   **Tasks/Challenges:** Weekly prompts for the pair to complete (Deadlines appear on Calendar).
2.  **Marketplace:**
    *   **Listings:** Parents post used gear (Leotards, Grips).
    *   **Categories:** Filter by Size, Type, Condition.
    *   **Contact:** Direct link to DM the seller.
3.  **Documents:**
    *   **Repository:** Folders for Handbooks, Meet Packets, Forms.
    *   **Permissions:** Restrict folders to specific levels (e.g., "Optional Team Contract").

---

## 5. UI/UX Design Strategy

*   **Navigation:**
    *   **Desktop:** Collapsible Sidebar (Left).
    *   **Mobile:** Bottom Tab Bar for primary actions, Hamburger menu for secondary.
    *   **Global Feature Toggles:** Hub Owners can completely disable features (e.g., "Disable Marketplace") via Settings, hiding them from the navigation for EVERYONE.
*   **Color Palette:**
    *   **Neutral Base:** White backgrounds, Slate/Gray text (No pure black).
    *   **Brand Color:** Dynamic! The user sets a primary color (e.g., Red), and we generate a palette (Red-50 to Red-900) using CSS variables.
*   **Components:**
    *   **Cards:** White bg, subtle shadow (`shadow-sm`), rounded-xl.
    *   **Inputs:** Large touch targets, floating labels or clear placeholders.
    *   **Modals:** Center-aligned, backdrop blur.
*   **"No Grey Boxes":**
    *   Use colored backgrounds for headers (`bg-brand-50`).
    *   Use status badges (`bg-green-100 text-green-700`).
    *   Use avatars and icons to break up text density.

### Route Map
*   **Public:**
    *   `/login`
    *   `/register`
    *   `/join/:token`
*   **Private (App):**
    *   `/` (Dashboard - Overview)
    *   `/roster` (Gymnasts list)
    *   `/roster/:id` (Gymnast detail)
    *   `/calendar` (Month/Week view)
    *   `/messages` (Chat root)
    *   `/messages/:groupId` (Specific chat)
    *   `/competitions` (Meets list)
    *   `/competitions/:id` (Meet detail & scores)
    *   `/documents` (Files)
    *   `/settings` (User settings)
    *   `/admin` (Hub settings - Owner/Admin only)

---

## 6. Security (RLS Policies)

We will enable RLS on all tables. A helper function `get_auth_hub_ids()` will be useful.

### Helper Functions
```sql
-- Get all hub_ids the current user is a member of
create or replace function get_my_hub_ids()
returns setof uuid as $$
  select hub_id from hub_members where user_id = auth.uid() and status = 'active';
$$ language sql security definer;

-- Check if user is an Admin/Director of a specific hub
create or replace function is_hub_admin(hub_id uuid)
returns boolean as $$
  select exists (
    select 1 from hub_members
    where user_id = auth.uid()
    and hub_id = $1
    and role in ('owner', 'director', 'admin')
    and status = 'active'
  );
$$ language sql security definer;
```

### Table Policies

#### 1. Organizations & Hubs
*   **`organizations`**:
    *   **Read:** Authenticated users (if they are a member of any hub in it).
    *   **Write:** Only `owner_id`.
*   **`hubs`**:
    *   **Read:** Public (for joining) or Members.
    *   **Write:** Org Owner or Hub Director.

#### 2. Users & Members
*   **`profiles`**:
    *   **Read:** Public (Authenticated).
    *   **Write:** User can update their own profile.
*   **`hub_members`**:
    *   **Read:** Members of the same hub.
    *   **Write:** Hub Director/Admin can invite/update members. User can update their own status (leave).

#### 3. Roster & Levels
*   **`levels`**:
    *   **Read:** Members of the hub.
    *   **Write:** Hub Director/Admin.
*   **`gymnasts`**:
    *   **Read:**
        *   **Staff:** (Director, Admin, Coach) can view all in their hub.
        *   **Parents:** Can view ONLY their linked gymnasts (via `gymnast_parents`).
    *   **Write:** Director, Admin, Coach.

#### 4. Content (Events, Messages, etc.)
*   **Generic Policy:**
    *   `hub_id` must match one of `get_my_hub_ids()`.
    *   Additional role checks for Write operations (usually restricted to Staff).

---

## 7. Implementation Roadmap (Step-by-Step)

1.  **Setup:** Initialize React + Vite + Tailwind + Supabase.
2.  **Database:** Run SQL migration for Core Tables.
3.  **Auth Flow:** Build Login/Register pages.
4.  **Hub Context:** Create the global state to hold `currentHub` and `currentUserRole`.
5.  **Layout:** Build the main App Shell.
6.  **Feature: Roster:** Build Gymnast CRUD.
7.  **Feature: Groups:** Build Chat UI + Realtime subscription.
8.  **Feature: Calendar:** Build Event CRUD.
9.  **Polish:** Animations, Loading states, Error boundaries.
