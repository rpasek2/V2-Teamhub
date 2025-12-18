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
| **Roster** | Gymnast list with dedicated profile pages, medical info, guardians, apparel sizes |
| **Gymnast Profile** | Full-page view with Profile, Goals, and Assessment tabs |
| **Calendar** | Events with RSVP, color-coded types, US holidays |
| **Messages** | Real-time chat and direct messaging |
| **Competitions** | Sessions, rosters, coaches, document management |
| **Scores** | Individual and team scores for WAG/MAG events |
| **Skills** | Skill tracking matrix by level and event |
| **Groups** | Social posts with polls, sign-ups, RSVPs, files |
| **Marketplace** | Buy/sell team gear with cross-hub linking |
| **Mentorship** | Big/Little sister pairing program |
| **Staff** | Staff profiles, schedules, responsibilities |
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
│   └── HubContext.tsx      # Hub data and permissions
├── pages/                  # Page components (lazy loaded)
│   ├── GymnastDetails.tsx  # Gymnast profile page (/roster/:gymnastId)
├── components/             # Reusable UI components
│   ├── layout/             # App shell, sidebar
│   ├── calendar/           # Calendar components
│   ├── competitions/       # Competition management
│   ├── groups/             # Social/groups features
│   ├── scores/             # Score tables
│   ├── skills/             # Skills tracking
│   └── ...
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

**Digital Gym** - A calm, focused, professional dark theme.

### Colors
- **Background:** Carbon Slate (`slate-900`, `slate-950`)
- **Text:** Chalk White (`chalk-50` to `chalk-400`)
- **Primary:** Electric Mint (`mint-400` to `mint-600`)
- **Secondary:** Muted Indigo (`indigo-400` to `indigo-600`)

### Component Classes
- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`
- Cards: `.card`, `.card-elevated`, `.card-glass`
- Inputs: `.input`, `.input-label`
- Badges: `.badge-mint`, `.badge-indigo`, `.badge-slate`

## Database

PostgreSQL via Supabase with 47 tables including:
- `profiles`, `organizations`, `hubs`, `hub_members`
- `gymnast_profiles`, `events`, `competitions`, `competition_scores`
- `groups`, `posts`, `channels`, `messages`
- `hub_event_skills`, `gymnast_skills`
- `marketplace_items`, `mentorship_pairs`
- `staff_profiles`, `staff_schedules`, `staff_tasks`

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
