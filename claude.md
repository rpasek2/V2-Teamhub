# TeamHub V2 Agent Guide

## Commands
- **Dev Server:** `npm run dev` - Start local development server
- **Build:** `npm run build` - TypeScript check + Vite build (run after major edits)
- **Lint:** `npm run lint` - Check for code quality issues
- **Preview:** `npm run preview` - Preview production build locally

## Tech Stack
- **Framework:** React 19 + Vite 7
- **Routing:** React Router DOM v7 (`useNavigate`, `useParams`, `Outlet`)
- **Styling:** Tailwind CSS 4 only (Digital Gym design system). No CSS modules or inline styles.
- **UI Components:** Headless UI for modals/dialogs, Lucide React for icons
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Date Handling:** date-fns (`format`, `parseISO`, `isSameDay`, etc.)
- **Utilities:** clsx + tailwind-merge for conditional classes

## Project Structure
```
src/
├── App.tsx                    # Router + lazy loading (all pages)
├── index.css                  # Digital Gym design system
├── context/
│   ├── AuthContext.tsx        # Auth state (user, session, signOut)
│   └── HubContext.tsx         # Hub data, permissions, linked gymnasts
├── pages/                     # 16+ page components
│   ├── Dashboard.tsx
│   ├── Roster.tsx
│   ├── Calendar.tsx
│   ├── Messages.tsx
│   ├── Scores.tsx
│   ├── Skills.tsx
│   ├── Marketplace.tsx
│   ├── Mentorship.tsx
│   ├── Staff.tsx
│   ├── Assignments.tsx        # Skeleton - needs implementation
│   ├── Resources.tsx          # Skeleton - needs implementation
│   ├── Settings.tsx
│   ├── UserSettings.tsx
│   ├── auth/                  # Login, Register
│   ├── competitions/          # Competitions, CompetitionDetails
│   ├── groups/                # Groups, GroupDetails
│   └── hubs/                  # HubSelection
├── components/                # 62+ components
│   ├── layout/
│   │   ├── HubLayout.tsx      # Main app shell (Sidebar + Outlet)
│   │   ├── RootLayout.tsx     # Root layout for hub selection
│   │   ├── Sidebar.tsx        # Sport-specific sidebar router
│   │   └── sports/GymnasticsSidebar.tsx  # Main navigation
│   ├── auth/                  # ProtectedRoute
│   ├── calendar/              # Event modals
│   ├── competitions/          # Session, roster, coach management
│   ├── groups/                # Posts, attachments (polls, RSVPs, signups)
│   ├── gymnast/               # Profile modal, injury reports
│   ├── hubs/                  # Hub creation, member management
│   ├── marketplace/           # Item listings, hub linking
│   ├── mentorship/            # Pairing management
│   ├── scores/                # Score tables
│   ├── skills/                # Skills matrix
│   ├── staff/                 # Staff profiles
│   └── ui/                    # Modal, PageLoader, CollapsibleSection
├── types/index.ts             # All TypeScript interfaces
├── hooks/                     # useFormSubmit, useToggleSelection
└── lib/supabase.ts            # Supabase client singleton
```

## Architecture Rules

### Component Patterns
- Use functional components with hooks
- Export named functions, not default exports (except lazy-loaded pages)
- Use TypeScript interfaces for props
- Modals use `createPortal` to render at document.body

### State Management
- **AuthContext** - Global auth (user, session, loading, signOut)
- **HubContext** - Hub data, member role, permissions, linked gymnasts
- Local state via useState/useEffect
- No Redux or Zustand

### Styling (Digital Gym Design System - Light Theme)
- **Background:** `slate-50` (main content), `white` (cards, sidebars, modals)
- **Text:** `slate-900` (headings), `slate-700` (body), `slate-500` (muted/labels)
- **Primary Accent:** `brand-500` to `brand-700` (buttons, links, active states)
- **Secondary:** `indigo-500` to `indigo-700` (info, selected items)
- **Semantic:** `success-*`, `error-*`, `warning-*`, `amber-*`

### Color Patterns
```
Page background:    bg-slate-50
Cards/modals:       bg-white border border-slate-200
Card headers:       bg-slate-50 border-b border-slate-200
Headings:           text-slate-900
Body text:          text-slate-700
Muted text:         text-slate-500
Links:              text-brand-600 hover:text-brand-700
Active tabs:        border-brand-500 text-brand-600
Inactive tabs:      text-slate-500 hover:text-slate-900
Icon backgrounds:   bg-brand-50, bg-purple-50, bg-blue-50, bg-emerald-50
Icon colors:        text-brand-600, text-purple-600, text-blue-600
Badges:             bg-brand-100 text-brand-700 (primary)
                    bg-slate-100 text-slate-600 (neutral)
Inputs:             border-slate-300 focus:border-brand-500 focus:ring-brand-500
```

### Component Classes
```css
.btn-primary    /* Brand background, white text */
.btn-secondary  /* Outlined, slate border, white bg */
.btn-ghost      /* Text only, hover background */
.btn-danger     /* Red/error color */
.card           /* white bg, rounded-xl, slate-200 border */
.input          /* Light input with brand focus ring */
.badge-mint     /* Green/success badge */
.badge-indigo   /* Blue/info badge */
.badge-slate    /* Neutral badge */
```

## Database Schema (Key Tables)

### Core
- `profiles` - User data (id, email, full_name, avatar_url)
- `organizations` - Top-level entities
- `hubs` - Programs/teams (settings JSONB for permissions, levels, enabledTabs, showBirthdays)
- `hub_members` - Membership with role enum (owner, director, admin, coach, parent, gymnast)
- `gymnast_profiles` - Extended athlete info (DOB, level, sizes, guardians JSONB, emergency_contact_1/2 JSONB, medical_info JSONB)

### Features
- `events`, `event_rsvps` - Calendar with RSVP
- `competitions`, `competition_sessions`, `competition_gymnasts`, `competition_scores`, `competition_team_placements`
- `groups`, `group_members`, `posts`, `comments` - Social features
- `poll_responses`, `signup_responses`, `rsvp_responses` - Post interactions
- `channels`, `messages` - Direct messaging
- `hub_event_skills`, `gymnast_skills` - Skills tracking
- `marketplace_items`, `marketplace_hub_links` - Marketplace
- `mentorship_pairs`, `mentorship_events` - Big/Little program
- `staff_profiles`, `staff_schedules`, `staff_responsibilities`, `staff_tasks`, `staff_time_off`, `staff_notes`

## Permission System
- **Roles (hierarchical):** owner > director > admin > coach > parent > gymnast
- **Scopes:** `all` (full access), `own` (linked data only), `none`
- Check via `useHub()`: `currentRole`, `hasPermission(feature)`, `getPermissionScope(feature)`

```typescript
// Common permission check
const canManage = ['owner', 'director', 'admin'].includes(currentRole || '');
const isStaff = ['owner', 'director', 'admin', 'coach'].includes(currentRole || '');
```

## Supabase Patterns
- Use singleton client from `src/lib/supabase.ts`
- Use `.select()` with specific columns when possible
- Handle errors: `const { data, error } = await supabase...`
- Use RLS - don't bypass in client code
- Storage buckets: `competition-documents`, `group-files`, `avatars`

## Gymnastics Events
```typescript
const WAG_EVENTS = ['vault', 'bars', 'beam', 'floor'];
const MAG_EVENTS = ['floor', 'pommel', 'rings', 'vault', 'pbars', 'highbar'];

const EVENT_LABELS = {
    vault: 'VT', bars: 'UB', beam: 'BB', floor: 'FX',
    pommel: 'PH', rings: 'SR', pbars: 'PB', highbar: 'HB'
};
```

## Common Patterns

### Modal Pattern
```typescript
import { createPortal } from 'react-dom';

if (!isOpen) return null;

return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="card p-6 max-w-md w-full mx-4">
            {/* Modal content */}
        </div>
    </div>,
    document.body
);
```

### Data Fetching
```typescript
useEffect(() => {
    if (hub) {
        fetchData();
    }
}, [hub]);

const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('table')
        .select('col1, col2')
        .eq('hub_id', hub.id);

    if (error) console.error('Error:', error);
    else setData(data || []);
    setLoading(false);
};
```

### Parallel Queries
```typescript
const [result1, result2] = await Promise.all([
    supabase.from('table1').select('*').eq('hub_id', hub.id),
    supabase.from('table2').select('*').eq('hub_id', hub.id)
]);
```

## Common Mistakes to Avoid
- Do NOT use `any` type - fix the actual TypeScript error
- Do NOT use CSS modules or inline styles - use Tailwind only
- Do NOT import from wrong paths - check relative vs absolute imports
- Do NOT forget loading and error states in data fetching
- Do NOT use `console.log` in production (use `console.error` for errors only)
- Do NOT create new files unless necessary - prefer editing existing files
- Do NOT add features beyond what was requested - keep changes minimal
- Do NOT use dark theme colors (slate-800/900, chalk-50) - the app uses a light theme
- Do NOT use `mint-*` colors directly - use `brand-*` instead for consistency

## MCP Servers

### Supabase MCP
- `mcp__supabase__list_tables` - List all tables
- `mcp__supabase__execute_sql` - Run queries (SELECT, INSERT, UPDATE, DELETE)
- `mcp__supabase__apply_migration` - DDL changes (CREATE TABLE, ALTER, RLS)
- `mcp__supabase__list_migrations` - View migration history
- `mcp__supabase__get_logs` - Get logs by service
- `mcp__supabase__get_advisors` - Security/performance checks
- `mcp__supabase__generate_typescript_types` - Generate types from schema

### Context7 MCP
- `mcp__context7__resolve-library-id` - Find library ID for docs
- `mcp__context7__get-library-docs` - Fetch documentation

### Chrome DevTools MCP
- `mcp__chrome-devtools__take_snapshot` - Get page accessibility tree
- `mcp__chrome-devtools__take_screenshot` - Capture screenshot
- `mcp__chrome-devtools__click` / `fill` / `hover` - Interact with elements
- `mcp__chrome-devtools__navigate_page` - Navigate to URLs
- `mcp__chrome-devtools__list_console_messages` - View console logs
