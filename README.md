# TeamHub V2

A premium, multi-tenant team management platform for gymnastics programs (and other sports) that streamlines communication, roster management, event scheduling, and performance tracking.

## Tech Stack

- **Framework:** React 19 + Vite 7
- **Language:** TypeScript 5.9
- **Styling:** Tailwind CSS 4 (Digital Gym design system)
- **UI Components:** Headless UI, Lucide React icons
- **Routing:** React Router DOM v7
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Date Handling:** date-fns v4
- **Utilities:** clsx + tailwind-merge

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Overview stats, upcoming events, recent activity feed |
| **Roster** | Gymnast list with dedicated profile pages, medical info, guardians, emergency contacts, apparel sizes |
| **Gymnast Profile** | Full-page view with 7 tabs: Profile, Goals, Assessment, Assignments, Skills, Scores, and Attendance |
| **Calendar** | Events with RSVP, color-coded types, US holidays, optional birthday display |
| **Messages** | Real-time chat, direct messaging, anonymous reporting |
| **Competitions** | Sessions, rosters, coaches, document management |
| **Scores** | Individual and team scores for WAG/MAG events |
| **Skills** | Skill tracking matrix by level and event |
| **Groups** | Social posts with polls, sign-ups, RSVPs, files |
| **Marketplace** | Buy/sell team gear with cross-hub linking |
| **Mentorship** | Big/Little pairing with random assignment and event tracking |
| **Assignments** | Coach-mode assignments with templates and progress tracking |
| **Resources** | Shared files and documents organized by category |
| **Schedule** | Weekly practice times by level/group with daily rotation grid, fullscreen mode, external groups support, drag-to-reorder columns |
| **Attendance** | Daily attendance tracking with metrics and absence warnings |
| **Staff** | Staff profiles, schedules, responsibilities, time-off requests |
| **Settings** | Hub configuration, permissions, feature toggles |

## Architecture

### Multi-Tenancy Model

```
Organization (e.g., "Elite Gymnastics Academy")
  └── Hub/Program (e.g., "DP Team", "Xcel Team")
       └── Members (owner, director, admin, coach, parent, gymnast)
            └── Gymnast Profiles (extended athlete data)
```

### Project Structure

```
src/
├── App.tsx                 # Router configuration with lazy loading
├── index.css               # Digital Gym design system
├── context/
│   ├── AuthContext.tsx     # Authentication state
│   ├── HubContext.tsx      # Hub data and permissions
│   └── NotificationContext.tsx  # Real-time notification badges
├── pages/                  # 20+ page components (lazy loaded)
│   ├── Dashboard.tsx       # Hub overview
│   ├── Roster.tsx          # Gymnast list
│   ├── GymnastDetails.tsx  # Gymnast profile (/roster/:gymnastId)
│   ├── Schedule.tsx        # Practice schedules & rotations
│   ├── Attendance.tsx      # Daily attendance & metrics
│   ├── Assignments.tsx     # Coach assignments
│   ├── Staff.tsx           # Staff list
│   ├── StaffDetails.tsx    # Staff profile (/staff/:staffUserId)
│   └── ...
├── components/             # 80+ reusable components
│   ├── layout/             # App shell, sidebar
│   ├── attendance/         # Daily attendance, metrics
│   ├── assignments/        # Coach dashboard, templates
│   ├── schedule/           # Weekly schedule, rotation grid
│   ├── calendar/           # Event modals
│   ├── competitions/       # Competition management
│   ├── groups/             # Social/groups features
│   ├── mentorship/         # Pairing management
│   ├── scores/             # Score tables
│   ├── skills/             # Skills tracking
│   ├── staff/              # Staff profiles, schedules
│   └── ui/                 # Modal, badges, loaders
├── types/index.ts          # TypeScript type definitions
└── lib/supabase.ts         # Supabase client singleton
```

### Permission System

Roles (hierarchical): `owner > director > admin > coach > parent > gymnast`

Permission scopes per feature:
- `all` - Full access to all data
- `own` - Access only to own/linked data
- `none` - No access

## Design System

**Digital Gym** - A clean, professional light theme with brand accents.

### Colors
- **Background:** Light slate (`slate-50` main content, `white` cards/sidebars)
- **Text:** Dark slate (`slate-900` headings, `slate-700` body, `slate-500` muted)
- **Primary Accent:** Brand green (`brand-500` to `brand-700`) - buttons, links, highlights
- **Secondary:** Indigo (`indigo-500` to `indigo-700`) - info, selected states
- **Semantic:** `error-*` (red), `success-*` (green), `warning-*` / `amber-*` (yellow/orange)

### Color Usage
```
Backgrounds:      bg-slate-50, bg-white, bg-slate-100
Card headers:     bg-slate-50 border-b border-slate-200
Text primary:     text-slate-900
Text secondary:   text-slate-700
Text muted:       text-slate-500
Links/actions:    text-brand-600 hover:text-brand-700
Active tabs:      border-brand-500 text-brand-600
Icon backgrounds: bg-brand-50, bg-purple-50, bg-blue-50, etc.
Icon colors:      text-brand-600, text-purple-600, text-blue-600, etc.
Badges:           bg-brand-100 text-brand-700, bg-slate-100 text-slate-600
```

### Component Classes
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- Cards: `.card` (white bg, rounded-xl, slate-200 border)
- Inputs: `.input` (slate border, brand focus ring)
- Badges: `.badge-mint`, `.badge-indigo`, `.badge-slate`

## Database

PostgreSQL via Supabase with 55+ tables including:
- `profiles`, `organizations`, `hubs`, `hub_members`
- `gymnast_profiles`, `events`, `seasons`, `competitions`, `competition_scores`
- `groups`, `posts`, `channels`, `messages`
- `hub_event_skills`, `gymnast_skills`
- `marketplace_items`, `mentorship_pairs`, `mentorship_events`
- `staff_profiles`, `staff_schedules`, `staff_tasks`, `staff_time_off`
- `practice_schedules`, `rotation_events`, `rotation_blocks`
- `attendance_records`
- `assignments`, `assignment_templates`

All tables use Row Level Security (RLS) policies.

## Sport Support

Currently optimized for gymnastics with extensibility for:
- Dance
- Cheerleading
- Swimming
- Martial Arts

Events tracked:
- **WAG (Women's):** Vault, Bars, Beam, Floor
- **MAG (Men's):** Floor, Pommel, Rings, Vault, P-Bars, High Bar

## Environment

Requires a `.env` file with Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## License

Private - All rights reserved.
